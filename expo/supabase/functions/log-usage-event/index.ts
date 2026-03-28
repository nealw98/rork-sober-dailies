// Supabase Edge Function: log-usage-event
// 
// This function receives usage events from the app, enriches them with
// IP-based geolocation, and stores them in the database.
//
// Features:
// - Batch event processing (multiple events per request)
// - IP geolocation via ip-api.com (free tier: 45 req/min)
// - Updates both usage_events and user_profiles with location
// - Safe two-step upsert for user_profiles (PATCH then POST)
// - Caches geolocation per request to minimize API calls
// - Health check endpoint for debugging
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

interface GeoResult extends GeoLocation {
  ip_source: string;
  geo_status: 'success' | 'skipped_private' | 'skipped_missing' | 'error' | 'timeout';
  geo_error?: string;
}

// Profile patch type - fields that can be updated (never includes created_at)
interface ProfilePatch {
  last_seen_at?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  updated_at?: string;
}

// Cache for geolocation lookups (per request)
let geoCache: GeoResult | null = null;

// Geo lookup timeout in milliseconds
const GEO_TIMEOUT_MS = 3500;

// Supabase REST helper
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(init.headers || {}),
    },
  });

/**
 * Safe two-step upsert for user_profiles.
 * 1. PATCH existing row (partial update, never sends created_at)
 * 2. If no row exists, POST new row with created_at
 * 
 * This avoids violating NOT NULL(created_at) on upsert.
 */
async function upsertUserProfile(anonymousId: string, patch: ProfilePatch): Promise<{ action: string; error?: string }> {
  // 1) PATCH existing row (only fields we want to change)
  const patchRes = await rest(
    `/user_profiles?anonymous_id=eq.${encodeURIComponent(anonymousId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );

  if (patchRes.ok) {
    const updated = await patchRes.json();
    if (Array.isArray(updated) && updated.length > 0) {
      return { action: 'patched' };
    }
    // PATCH returned 200 but no rows affected - user doesn't exist, try insert
  } else {
    // Log non-2xx responses
    const body = await patchRes.text();
    console.warn(`[log-usage-event] user_profiles PATCH failed for ${anonymousId}:`, patchRes.status, body);
    
    // If error is not 404 (no rows), don't try POST
    if (patchRes.status >= 400 && patchRes.status !== 404) {
      return { action: 'patch_error', error: `PATCH failed: ${patchRes.status} ${body}` };
    }
  }

  // 2) POST create new row (include created_at and anonymous_id)
  const nowIso = new Date().toISOString();
  const insertBody = {
    anonymous_id: anonymousId,
    created_at: nowIso,
    ...patch,
  };

  const postRes = await rest('/user_profiles', {
    method: 'POST',
    body: JSON.stringify(insertBody),
  });

  if (!postRes.ok) {
    const body = await postRes.text();
    console.error(`[log-usage-event] user_profiles POST failed for ${anonymousId}:`, postRes.status, body);
    
    // Check if it's a conflict (user was created between PATCH and POST)
    if (postRes.status === 409) {
      // Row was created by another request, try PATCH again
      const retryRes = await rest(
        `/user_profiles?anonymous_id=eq.${encodeURIComponent(anonymousId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      if (retryRes.ok) {
        return { action: 'patched_after_conflict' };
      }
    }
    
    return { action: 'insert_error', error: `POST failed: ${postRes.status} ${body}` };
  }

  return { action: 'inserted' };
}

/**
 * Look up geolocation from IP address using ip-api.com
 * Free tier: 45 requests per minute, no API key required
 */
async function getGeoLocation(ip: string, ipSource: string): Promise<GeoResult> {
  // Return cached result if available
  if (geoCache) {
    return geoCache;
  }

  // No IP available
  if (!ip) {
    geoCache = { 
      city: null, 
      region: null, 
      country: null, 
      ip_source: ipSource,
      geo_status: 'skipped_missing' 
    };
    console.log(`[log-usage-event] No IP available (source: ${ipSource})`);
    return geoCache;
  }

  // Skip lookup for localhost/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.3')) {
    geoCache = { 
      city: null, 
      region: null, 
      country: null, 
      ip_source: ipSource,
      geo_status: 'skipped_private' 
    };
    console.log(`[log-usage-event] Skipping geolocation for private/local IP: ${ip} (source: ${ipSource})`);
    return geoCache;
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    // ip-api.com returns JSON by default
    // Fields: city, regionName (state), countryCode
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,city,regionName,countryCode`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[log-usage-event] ip-api.com returned status ${response.status}`);
      geoCache = { 
        city: null, 
        region: null, 
        country: null, 
        ip_source: ipSource,
        geo_status: 'error',
        geo_error: `HTTP ${response.status}`
      };
      return geoCache;
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn(`[log-usage-event] ip-api.com lookup failed:`, data.message);
      geoCache = { 
        city: null, 
        region: null, 
        country: null, 
        ip_source: ipSource,
        geo_status: 'error',
        geo_error: data.message || 'lookup failed'
      };
      return geoCache;
    }

    geoCache = {
      city: data.city || null,
      region: data.regionName || null,
      country: data.countryCode || null,
      ip_source: ipSource,
      geo_status: 'success'
    };

    console.log(`[log-usage-event] Geolocation for ${ip} (${ipSource}):`, geoCache);
    return geoCache;

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    console.error(`[log-usage-event] Geolocation ${isTimeout ? 'timeout' : 'error'}:`, error.message);
    geoCache = { 
      city: null, 
      region: null, 
      country: null, 
      ip_source: ipSource,
      geo_status: isTimeout ? 'timeout' : 'error',
      geo_error: error.message
    };
    return geoCache;
  }
}

/**
 * Extract client IP from request headers
 * Checks common proxy headers in order of preference
 */
function getClientIP(req: Request): { ip: string; source: string } {
  // Check CF-Connecting-IP (Cloudflare - most reliable when using CF)
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return { ip: cfIP, source: 'cf-connecting-ip' };
  }

  // Check True-Client-IP (Akamai, some CDNs)
  const trueClientIP = req.headers.get('true-client-ip');
  if (trueClientIP) {
    return { ip: trueClientIP, source: 'true-client-ip' };
  }

  // Check Fastly-Client-IP
  const fastlyIP = req.headers.get('fastly-client-ip');
  if (fastlyIP) {
    return { ip: fastlyIP, source: 'fastly-client-ip' };
  }

  // Check X-Real-IP header
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return { ip: realIP, source: 'x-real-ip' };
  }

  // Check X-Forwarded-For header (may contain multiple IPs)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (original client)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return { ip: ips[0], source: 'x-forwarded-for' };
    }
  }

  // Fallback - no IP found
  return { ip: '', source: 'none' };
}

serve(async (req: Request) => {
  // Reset geo cache for each request
  geoCache = null;

  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint (GET)
  if (req.method === 'GET' && (url.pathname.endsWith('/health') || url.pathname === '/functions/v1/log-usage-event')) {
    const { ip, source } = getClientIP(req);
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        ip_detected: ip ? `${ip.substring(0, 3)}...` : 'none',
        ip_source: source,
        version: '1.2.0'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Only accept POST for event logging
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
    const { ip: clientIP, source: ipSource } = getClientIP(req);
    console.log(`[log-usage-event] Client IP: ${clientIP || 'unknown'} (source: ${ipSource})`);
    
    const geo = await getGeoLocation(clientIP, ipSource);

    // Initialize Supabase client with service role key for usage_events insert
    const supabase = createClient(supabaseUrl, serviceKey);

    // Prepare events for insertion with location data and diagnostics
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
      properties: {
        ...(event.properties || {}),
        ip_source: geo.ip_source,
        geo_status: geo.geo_status,
        ...(geo.geo_error ? { geo_error: geo.geo_error } : {}),
      },
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
    // Using safe two-step PATCH/POST to avoid NOT NULL violation on created_at
    const uniqueAnonymousIds = [...new Set(events.map(e => e.anonymous_id).filter(Boolean))];
    const profileResults: { id: string; action: string; error?: string }[] = [];
    
    for (const anonymousId of uniqueAnonymousIds) {
      if (!anonymousId) continue;

      // Build patch object (never includes created_at)
      const patch: ProfilePatch = {
        last_seen_at: new Date().toISOString(),
        city: geo.city,
        region: geo.region,
        country: geo.country,
        updated_at: new Date().toISOString(),
      };

      try {
        const result = await upsertUserProfile(anonymousId, patch);
        profileResults.push({ id: anonymousId, ...result });
        console.info(`[log-usage-event] user_profiles ${result.action} for ${anonymousId}`);
      } catch (e) {
        console.error(`[log-usage-event] Failed to upsert user_profiles for ${anonymousId}:`, e);
        profileResults.push({ id: anonymousId, action: 'exception', error: e.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Logged ${events.length} events`,
        location: geo.country ? `${geo.city}, ${geo.region}, ${geo.country}` : null,
        ip_source: geo.ip_source,
        geo_status: geo.geo_status,
        profiles_updated: profileResults.length,
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
