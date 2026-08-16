// Fulfill the store-native annual subscription offer behind a Pass It On share
// token. Apple uses a one-time App Store offer code. Android opens the app and
// binds the token to one RevenueCat app user, who then purchases the private
// Play subscription option. No Google promo code is minted or banked.
//
// New request:    POST { token, platform: 'ios' | 'android' }
// Rollout compat: POST { token, product: 'monthly' | 'yearly' | 'android' }
//                 (both Apple product values intentionally map to yearly)
// Website Android success: { success, kind: 'play_offer', app_url, ... }
// App Android claim: POST additionally includes
//   { action: 'claim_play_offer', rc_app_user_id }
// Apple success: { success, kind: 'offer_code', code, redeem_url, ... }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';
import { trackServerEvent } from '../_shared/mixpanel.ts';

type StorePlatform = 'ios' | 'android';

const PLAY_PACKAGE = 'com.nealwagner.soberdailies';

function androidAppUrl(token: string): string {
  // Installed: Chrome opens myapp://pass?g=… directly. Not installed: the
  // browser fallback opens the Play listing with the token in Install Referrer;
  // expo-application retrieves it on first launch after installation.
  const referrer = `g=${token}`;
  const fallback = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
  return `intent://pass?g=${encodeURIComponent(token)}#Intent;scheme=myapp;package=${PLAY_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

function requestedPlatform(platform: unknown, product: unknown): StorePlatform | null {
  if (platform === 'ios' || platform === 'android') return platform;
  if (product === 'android') return 'android';
  if (product === 'monthly' || product === 'yearly') return 'ios';
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, platform, product, action, rc_app_user_id } = await req.json();
    const storePlatform = requestedPlatform(platform, product);
    if (typeof token !== 'string' || token.length < 10 || !storePlatform) {
      return json({ success: false, reason: 'bad_request' }, 400);
    }

    const supabase = serviceClient();
    const { data: share, error: shareErr } = await supabase
      .from('gift_shares')
      .select('token, android_gift_code')
      .eq('token', token)
      .maybeSingle();
    if (shareErr) throw shareErr;
    if (!share) return json({ success: false, reason: 'invalid_token' }, 404);

    // Existing code assignments remain readable so links opened during the
    // brief Google promo-code rollout do not change underneath their recipient.
    const { data: bound, error: boundErr } = await supabase
      .from('offer_code_inventory')
      .select('code, redeem_url, product, platform')
      .eq('share_token', token)
      .maybeSingle();
    if (boundErr) throw boundErr;

    if (storePlatform === 'android') {
      if (bound) {
        if (action === 'claim_play_offer') {
          return json({ success: false, reason: 'legacy_pass' }, 409);
        }
        return json({ success: true, kind: 'offer_code', ...bound });
      }

      const appUrl = androidAppUrl(token);
      const existingMarker = typeof share.android_gift_code === 'string' ? share.android_gift_code : null;
      if (existingMarker && !existingMarker.startsWith('play:')) {
        return json({ success: true, kind: 'legacy_code', code: existingMarker });
      }

      // The website only needs the handoff URL; it must not consume the pass.
      // Binding happens inside the app once an eligible Play option is present.
      if (action !== 'claim_play_offer') {
        return json({
          success: true,
          kind: 'play_offer',
          app_url: appUrl,
          product: 'yearly',
          platform: 'android',
        });
      }

      if (typeof rc_app_user_id !== 'string' || rc_app_user_id.length < 5 || rc_app_user_id.length > 500) {
        return json({ success: false, reason: 'bad_request' }, 400);
      }
      const marker = `play:${rc_app_user_id}`;
      if (existingMarker === marker) {
        return json({ success: true, kind: 'play_offer', app_url: appUrl, product: 'yearly', platform: 'android' });
      }
      if (existingMarker) return json({ success: false, reason: 'already_claimed' }, 409);

      // Compare-and-set makes the first app user win without a new database
      // function. Service-role RLS bypass plus `.is(null)` keeps the update
      // atomic; a loser re-reads the marker below.
      const { data: claimed, error: claimErr } = await supabase
        .from('gift_shares')
        .update({ android_gift_code: marker })
        .eq('token', token)
        .is('android_gift_code', null)
        .select('token')
        .maybeSingle();
      if (claimErr) throw claimErr;
      if (claimed) {
        await trackServerEvent('pass_dispensed', token, token, {
          kind: 'play_subscription_offer',
          platform: 'android',
          product: 'yearly',
        });
        return json({ success: true, kind: 'play_offer', app_url: appUrl, product: 'yearly', platform: 'android' });
      }

      const { data: raced, error: raceErr } = await supabase
        .from('gift_shares')
        .select('android_gift_code')
        .eq('token', token)
        .maybeSingle();
      if (raceErr) throw raceErr;
      if (raced?.android_gift_code === marker) {
        return json({ success: true, kind: 'play_offer', app_url: appUrl, product: 'yearly', platform: 'android' });
      }
      return json({ success: false, reason: 'already_claimed' }, 409);
    }

    // iOS: first fulfillment wins and remains idempotently bound to the token.
    if (bound) return json({ success: true, kind: 'offer_code', ...bound });
    if (typeof share.android_gift_code === 'string' && share.android_gift_code.startsWith('play:')) {
      return json({ success: false, reason: 'already_claimed' }, 409);
    }
    if (share.android_gift_code && !String(share.android_gift_code).startsWith('play:')) {
      return json({ success: true, kind: 'legacy_code', code: share.android_gift_code });
    }

    const { data, error } = await supabase.rpc('dispense_store_offer_code', {
      p_token: token,
      p_platform: storePlatform,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (row?.code) {
      await trackServerEvent('pass_dispensed', token, token, {
        kind: 'store_offer_code',
        platform: row.platform,
        product: row.product,
      });
      return json({ success: true, kind: 'offer_code', ...row });
    }

    // The atomic pop may return nothing when another request won the race.
    // Re-read the binding before reporting that the store's pool is empty.
    const { data: reBound } = await supabase
      .from('offer_code_inventory')
      .select('code, redeem_url, product, platform')
      .eq('share_token', token)
      .maybeSingle();
    if (reBound) return json({ success: true, kind: 'offer_code', ...reBound });

    console.error('[get-dispense] out of stock for platform:', storePlatform);
    return json({ success: false, reason: 'out_of_stock' }, 409);
  } catch (e) {
    console.error('[get-dispense] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
