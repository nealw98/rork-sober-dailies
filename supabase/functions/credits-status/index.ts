// Gift credits — status (and the grant-on-read heartbeat).
//
// POST { anonymous_id, rc_app_user_id }
//  → { success, balance, total_granted, shares_used }
//
// Every call recomputes earned grants from RevenueCat subscription state and
// inserts any missing rows, so balances self-heal: a subscriber's quarterly
// tenure credit or annual refresh appears the next time the wallet opens.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient, fetchRcSubscriber } from '../_shared/gifts.ts';
import { computeEarnedGrants, ensureGrants, getCreditState, foundingEligible } from '../_shared/credits.ts';
import { verifyDevice } from '../_shared/deviceAuth.ts';
import { trackPassGranted } from '../_shared/mixpanel.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, rc_app_user_id, device_secret } = await req.json();
    if (!anonymous_id || typeof anonymous_id !== 'string') {
      return json({ success: false, message: 'Missing anonymous_id' }, 400);
    }

    const supabase = serviceClient();

    // Read-only + grant healing, so this is the lenient side: an id nobody has
    // claimed yet still answers (a client that predates device secrets keeps
    // working), but once claimed only the owner can read that balance. Deploy
    // ordering is therefore safe in either direction.
    if ((await verifyDevice(supabase, anonymous_id, device_secret, { requireSecret: false })) !== 'ok') {
      return json({ success: false, reason: 'device_unverified' }, 403);
    }
    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');

    if (secretKey && typeof rc_app_user_id === 'string' && rc_app_user_id.length > 0) {
      const subscriber = await fetchRcSubscriber(rc_app_user_id, secretKey);
      const founding = await foundingEligible(supabase, anonymous_id);
      const fresh = await ensureGrants(supabase, anonymous_id, computeEarnedGrants(subscriber, { founding }));
      // Funnel stage 1: pass_granted, once per grant key ever (ensureGrants
      // returns only rows inserted THIS call; $insert_id backstops retries).
      await trackPassGranted(anonymous_id, fresh);
    }

    const state = await getCreditState(supabase, anonymous_id);
    return json({ success: true, ...state });
  } catch (e) {
    console.error('[credits-status] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
