// Pass It On — redeem a code and grant the recipient 3 months of premium.
//
// This is the only consuming, irreversible transition in the whole feature, so
// it is the careful one:
//   • first-redeemer-wins via an atomic UPDATE ... WHERE status='available'
//     (if two devices race the same code, exactly one row update succeeds);
//   • self-redemption is blocked (spec §12 — yearly is already the cheapest
//     self-serve path, so this only removes arbitrage optics);
//   • an already-subscribed recipient is declined WITHOUT consuming the code
//     (spec §12 decision), so their gift isn't wasted;
//   • if the RevenueCat grant fails after we claim the row, we release the code
//     back to `available` — a transient RC error must not burn a paid gift.
//
// Required Supabase secrets: REVENUECAT_SECRET_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (last two auto-provided).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, json, serviceClient,
  fetchRcSubscriber, hasActivePremium, grantGiftEntitlement,
} from '../_shared/gifts.ts';
import { trackServerEvent } from '../_shared/mixpanel.ts';

interface Body {
  code: string;
  anonymous_id: string;
  rc_app_user_id: string;
}

const normalize = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, '');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const code = normalize(body.code || '');
    const { anonymous_id, rc_app_user_id } = body;

    if (!code || !anonymous_id || !rc_app_user_id) {
      return json({ success: false, reason: 'bad_request', message: 'Missing code, anonymous_id, or rc_app_user_id' }, 400);
    }

    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!secretKey) return json({ success: false, reason: 'server_error', message: 'Server not configured (RC key)' }, 500);

    const supabase = serviceClient();

    // 1) Look the code up.
    const { data: row, error: readErr } = await supabase
      .from('gift_codes')
      .select('code, status, buyer_anonymous_id, buyer_rc_app_user_id')
      .eq('code', code)
      .maybeSingle();
    if (readErr) throw readErr;

    if (!row) return json({ success: false, reason: 'invalid', message: 'That code isn’t valid. Double-check the letters and try again.' }, 404);
    if (row.status === 'redeemed') {
      return json({ success: false, reason: 'already_redeemed', message: 'This code has already been redeemed.' }, 409);
    }

    // 2) Block self-redemption (device identity OR RC identity match).
    if (row.buyer_anonymous_id === anonymous_id || row.buyer_rc_app_user_id === rc_app_user_id) {
      return json({ success: false, reason: 'self_redemption', message: 'This is one of your own codes — it’s meant for someone else.' }, 403);
    }

    // 3) Decline (without consuming) if the recipient already has premium.
    const subscriber = await fetchRcSubscriber(rc_app_user_id, secretKey);
    if (subscriber && hasActivePremium(subscriber)) {
      return json({ success: false, reason: 'already_premium', message: 'You already have full access — save this code for someone who needs it.' }, 409);
    }

    // 4) Atomic first-redeemer-wins claim.
    const { data: claimed, error: claimErr } = await supabase
      .from('gift_codes')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemer_anonymous_id: anonymous_id,
        redeemer_rc_app_user_id: rc_app_user_id,
      })
      .eq('code', code)
      .eq('status', 'available')
      .select('code')
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      // Lost the race — another device redeemed it microseconds ago.
      return json({ success: false, reason: 'already_redeemed', message: 'This code has already been redeemed.' }, 409);
    }

    // 5) Grant the entitlement. On failure, release the code so it isn't burned.
    const grant = await grantGiftEntitlement(rc_app_user_id, secretKey);
    if (!grant.ok) {
      await supabase
        .from('gift_codes')
        .update({ status: 'available', redeemed_at: null, redeemer_anonymous_id: null, redeemer_rc_app_user_id: null })
        .eq('code', code);
      console.error('[gifts-redeem] RC grant failed, released code:', grant.message);
      return json({ success: false, reason: 'grant_failed', message: 'Something went wrong unlocking access. Please try again.' }, 502);
    }

    // Funnel stage 3b (Android/legacy leg): the claim + grant both landed.
    // iOS offer-code redemptions are invisible here — they arrive in Mixpanel
    // via the RevenueCat integration (offer_code property set, revenue 0).
    await trackServerEvent('pass_redeemed', anonymous_id, code, {
      kind: 'sd_code',
      sender_anonymous_id: row.buyer_anonymous_id,
    });

    return json({ success: true, message: 'You’ve got 3 months of full access. Welcome.' });
  } catch (e) {
    console.error('[gifts-redeem] error:', e);
    return json({ success: false, reason: 'server_error', message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
