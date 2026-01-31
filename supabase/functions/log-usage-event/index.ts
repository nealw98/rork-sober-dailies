// Supabase Edge Function: log-usage-event
// 
// This function receives usage events from the app, enriches them with
// IP-based geolocation, and stores them in the database.
//
// Features:
// - Batch event processing (multiple events per request)
// - IP geolocation via ip-api.com (free tier: 45 req/min)
// - Updates both usage_events and user_profiles with location
// - Caches geolocation per request to minimize API calls
//
// Required Supabase Secrets:
// - SUPABASE_URL: Auto-provided by Supabase
// - SUPABASE_SERVICE_ROLE_KEY: Auto-provided by Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for the response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Event payload from the app
interface UsageEventPayload {
  ts: string;
  event: string;
  screen?: string;
  feature?: string;
  duration_seconds?: number;
  session_id: string;
  anonymous_id: string | null;
  app_version?: string;
  platform: string;
  properties?: Record<string, any>;
}

interface RequestBody {
  events: UsageEventPayload[];
}

interface GeoLocation {
  city: string | null;
  region: string | null;
  country: string | null;
}

// Cache for geolocation lookups (per request)
let geoCache: GeoLocation | null = null;

/**
 * Look up geolocation from IP address using ip-api.com
 * Free tier: 45 requests per minute, no API key required
 */
async function getGeoLocation(ip: string): Promise<GeoLocation> {
  // Return cached result if available
  if (geoCache) {
    return geoCache;
  }

  // Skip lookup for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    console.log(`[log-usage-event] Skipping geolocation for private/local IP: ${ip}`);
    return { city: null, region: null, country: null };
  }

  try {
    // ip-api.com returns JSON by default
    // Fields: city, regionName (state), countryCode
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode`);
    
    if (!response.ok) {
      console.warn(`[log-usage-event] ip-api.com returned status ${response.status}`);
      return { city: null, region: null, country: null };
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn(`[log-usage-event] ip-api.com lookup failed:`, data);
      return { city: null, region: null, country: null };
    }

    geoCache = {
      city: data.city || null,
      region: data.regionName || null,
      country: data.countryCode || null,
    };

    console.log(`[log-usage-event] Geolocation for ${ip}:`, geoCache);
    return geoCache;

  } catch (error) {
    console.error(`[log-usage-event] Geolocation lookup error:`, error);
    return { city: null, region: null, country: null };
  }
}

/**
 * Extract client IP from request headers
 * Checks common proxy headers first, then falls back to connection info
 */
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (may contain multiple IPs)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Check X-Real-IP header
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // Fallback - this may not work in all environments
  return '';
}

serve(async (req: Request) => {
  // Reset geo cache for each request
  geoCache = null;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { events } = body;

    // Validate events array
    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No events provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[log-usage-event] Received ${events.length} events`);

    // Get client IP and geolocation
    const clientIP = getClientIP(req);
    console.log(`[log-usage-event] Client IP: ${clientIP || 'unknown'}`);
    
    const geo = await getGeoLocation(clientIP);

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare events for insertion with location data
    const eventsToInsert = events.map(event => ({
      ts: event.ts,
      event: event.event,
      screen: event.screen || null,
      feature: event.feature || null,
      duration_seconds: event.duration_seconds ?? null,
      session_id: event.session_id,
      anonymous_id: event.anonymous_id,
      app_version: event.app_version || null,
      platform: event.platform,
      properties: event.properties || null,
      city: geo.city,
      region: geo.region,
      country: geo.country,
    }));

    // Insert events into usage_events
    const { error: insertError } = await supabase
      .from('usage_events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error(`[log-usage-event] Insert error:`, insertError);
      return new Response(
        JSON.stringify({ success: false, message: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[log-usage-event] Inserted ${events.length} events`);

    // Update user_profiles with latest location for each unique anonymous_id
    const uniqueAnonymousIds = [...new Set(events.map(e => e.anonymous_id).filter(Boolean))];
    
    for (const anonymousId of uniqueAnonymousIds) {
      if (!anonymousId) continue;

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          anonymous_id: anonymousId,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'anonymous_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        // Log but don't fail - events were already inserted
        console.warn(`[log-usage-event] Failed to update user_profiles for ${anonymousId}:`, upsertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Logged ${events.length} events`,
        location: geo.country ? `${geo.city}, ${geo.region}, ${geo.country}` : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[log-usage-event] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ success: false, message: `Unexpected error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
