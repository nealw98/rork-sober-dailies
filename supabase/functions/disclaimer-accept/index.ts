// Supabase Edge Function: disclaimer-accept
//
// Records that a device accepted the onboarding disclaimer (safety bullets +
// Terms/Privacy checkbox). One row per (anonymous_id, version); repeat calls
// are idempotent — the FIRST acceptance timestamp wins, so client retries
// after a failed sync can't rewrite history.
//
// POST { anonymous_id, version, accepted_at, platform?, app_version? }
//  → { success: true }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const anonymousId = typeof body.anonymous_id === 'string' ? body.anonymous_id.trim() : '';
    const version = typeof body.version === 'string' ? body.version.trim() : '';
    const acceptedAt = typeof body.accepted_at === 'string' ? body.accepted_at : '';
    if (!anonymousId || !version || Number.isNaN(Date.parse(acceptedAt))) {
      return json({ success: false, message: 'Missing anonymous_id, version, or accepted_at' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.from('disclaimer_acceptances').upsert(
      {
        anonymous_id: anonymousId,
        version,
        accepted_at: acceptedAt,
        platform: typeof body.platform === 'string' ? body.platform : null,
        app_version: typeof body.app_version === 'string' ? body.app_version : null,
      },
      { onConflict: 'anonymous_id,version', ignoreDuplicates: true },
    );

    if (error) {
      console.error('[disclaimer-accept] insert failed:', error);
      return json({ success: false, message: `Database error: ${error.message}` }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error('[disclaimer-accept] error:', e);
    return json({ success: false, message: 'Invalid request' }, 400);
  }
});
