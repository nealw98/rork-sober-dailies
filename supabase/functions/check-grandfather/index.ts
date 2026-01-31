// Supabase Edge Function: check-grandfather
// 
// This function checks if a user should be grandfathered into premium
// based on their first activity date in Supabase. If eligible, it grants
// a promotional entitlement via RevenueCat's REST API.
//
// Required Supabase Secrets:
// - REVENUECAT_SECRET_API_KEY: Your RevenueCat secret API key (starts with sk_)
// - SUPABASE_URL: Auto-provided by Supabase
// - SUPABASE_SERVICE_ROLE_KEY: Auto-provided by Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const ENTITLEMENT_ID = 'premium';
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

// CORS headers for the response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  anonymous_id: string;
  rc_app_user_id: string;
  platform: 'ios' | 'android';
}

interface GrandfatherResponse {
  success: boolean;
  grandfathered: boolean;
  message: string;
  already_granted?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { anonymous_id, rc_app_user_id, platform } = body;

    // Validate required fields
    if (!anonymous_id || !rc_app_user_id || !platform) {
      return new Response(
        JSON.stringify({
          success: false,
          grandfathered: false,
          message: 'Missing required fields: anonymous_id, rc_app_user_id, platform',
        } as GrandfatherResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-grandfather] Checking user: ${anonymous_id}, RC ID: ${rc_app_user_id}, Platform: ${platform}`);

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query user_profiles for this user
    const { data: userProfile, error: queryError } = await supabase
      .from('user_profiles')
      .select('anonymous_id, created_at, is_grandfathered, rc_app_user_id, entitlement_granted_at')
      .eq('anonymous_id', anonymous_id)
      .single();

    if (queryError) {
      console.error(`[check-grandfather] Supabase query error:`, queryError);
      
      // If no record found, user is NOT grandfathered
      if (queryError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({
            success: true,
            grandfathered: false,
            message: 'No user profile found - user is not grandfathered',
          } as GrandfatherResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Other errors - fail closed (don't grant)
      return new Response(
        JSON.stringify({
          success: false,
          grandfathered: false,
          message: `Database error: ${queryError.message}`,
        } as GrandfatherResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-grandfather] User profile found:`, {
      created_at: userProfile.created_at,
      is_grandfathered: userProfile.is_grandfathered,
      entitlement_granted_at: userProfile.entitlement_granted_at,
    });

    // Check if user is grandfathered (computed column in database)
    if (!userProfile.is_grandfathered) {
      return new Response(
        JSON.stringify({
          success: true,
          grandfathered: false,
          message: 'User created after cutoff date - not grandfathered',
        } as GrandfatherResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User IS grandfathered - check if entitlement already granted
    if (userProfile.entitlement_granted_at) {
      console.log(`[check-grandfather] Entitlement already granted at: ${userProfile.entitlement_granted_at}`);
      return new Response(
        JSON.stringify({
          success: true,
          grandfathered: true,
          already_granted: true,
          message: 'User is grandfathered and entitlement was already granted',
        } as GrandfatherResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User is grandfathered but entitlement not yet granted - grant via RevenueCat API
    console.log(`[check-grandfather] Granting promotional entitlement via RevenueCat...`);

    const revenueCatSecretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!revenueCatSecretKey) {
      console.error(`[check-grandfather] REVENUECAT_SECRET_API_KEY not configured`);
      return new Response(
        JSON.stringify({
          success: false,
          grandfathered: true,
          message: 'Server configuration error - RevenueCat API key not set',
        } as GrandfatherResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grant promotional entitlement via RevenueCat REST API
    // Endpoint: POST /v1/subscribers/{app_user_id}/entitlements/{entitlement_id}/promotional
    const rcEndpoint = `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(rc_app_user_id)}/entitlements/${ENTITLEMENT_ID}/promotional`;
    
    const rcResponse = await fetch(rcEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revenueCatSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        duration: 'lifetime', // Grandfathered users get lifetime access
      }),
    });

    const rcResult = await rcResponse.json();

    console.log(`[check-grandfather] RevenueCat response status: ${rcResponse.status}`);
    console.log(`[check-grandfather] RevenueCat response body:`, rcResult);

    if (!rcResponse.ok) {
      console.error(`[check-grandfather] RevenueCat API error:`, rcResult);
      return new Response(
        JSON.stringify({
          success: false,
          grandfathered: true,
          message: `RevenueCat API error: ${rcResult.message || rcResponse.statusText}`,
        } as GrandfatherResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-grandfather] RevenueCat entitlement granted successfully`);

    // Update user_profiles with the granted info
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        rc_app_user_id: rc_app_user_id,
        entitlement_granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('anonymous_id', anonymous_id);

    if (updateError) {
      console.warn(`[check-grandfather] Failed to update user_profiles:`, updateError);
      // Don't fail the request - entitlement was already granted
    }

    return new Response(
      JSON.stringify({
        success: true,
        grandfathered: true,
        already_granted: false,
        message: 'User is grandfathered and entitlement has been granted',
      } as GrandfatherResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[check-grandfather] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        grandfathered: false,
        message: `Unexpected error: ${error.message}`,
      } as GrandfatherResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
