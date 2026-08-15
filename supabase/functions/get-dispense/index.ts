// Dispense the store-native annual subscription offer behind a Pass It On
// share token. Apple and Google Play codes are pre-generated in their stores,
// imported into offer_code_inventory, and atomically bound here. The first
// fulfillment wins; reopening or forwarding the link returns that same code.
//
// New request:    POST { token, platform: 'ios' | 'android' }
// Rollout compat: POST { token, product: 'monthly' | 'yearly' | 'android' }
//                 (both Apple product values intentionally map to yearly)
// Success:        { success, kind: 'offer_code', code, redeem_url,
//                   product: 'yearly', platform }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';
import { trackServerEvent } from '../_shared/mixpanel.ts';

type StorePlatform = 'ios' | 'android';

function requestedPlatform(platform: unknown, product: unknown): StorePlatform | null {
  if (platform === 'ios' || platform === 'android') return platform;
  if (product === 'android') return 'android';
  if (product === 'monthly' || product === 'yearly') return 'ios';
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, platform, product } = await req.json();
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

    // First fulfillment wins. New store-code assignments live in the unified
    // inventory; pre-migration Android SD codes remain readable for idempotency
    // but no new external entitlements are ever minted here.
    const { data: bound, error: boundErr } = await supabase
      .from('offer_code_inventory')
      .select('code, redeem_url, product, platform')
      .eq('share_token', token)
      .maybeSingle();
    if (boundErr) throw boundErr;
    if (bound) return json({ success: true, kind: 'offer_code', ...bound });
    if (share.android_gift_code) {
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
