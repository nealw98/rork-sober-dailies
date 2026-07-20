// Gift codes — dispense a recipient's gift (called by the soberdailies.com/get
// page; the only public-facing function in the program).
//
// POST { token, product: 'monthly' | 'yearly' | 'android' }
//  iOS →     { success, kind: 'offer_code', code, redeem_url, product }
//  android → { success, kind: 'sd_code', code }   (legacy promo-grant path)
//  errors →  { success: false, reason: 'invalid_token' | 'out_of_stock' | 'bad_request' }
//
// Auth is the unguessable share token minted by credits-share. Idempotent:
// the FIRST fulfillment wins and every later call returns it, regardless of
// what's asked for — so a forwarded /get link shows the same still-valid
// gift, and a recipient can't collect both an Apple code and an SD code.
// The dispense_offer_code SQL function does the atomic pop (SKIP LOCKED).
//
// Android recipients get a standard Pass It On SD code minted on the spot,
// filed under the SENDER's identity (so gifts-redeem's self-redemption block
// applies to the sender, and the code redeems 3 months via the existing
// RC promotional-grant path — no auto-conversion; accepted for the ~20%
// Android share, per design doc §0).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient, generateCode } from '../_shared/gifts.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, product } = await req.json();
    if (
      typeof token !== 'string' || token.length < 10 ||
      !['monthly', 'yearly', 'android'].includes(product)
    ) {
      return json({ success: false, reason: 'bad_request' }, 400);
    }

    const supabase = serviceClient();

    // Token must exist; we also need the sender for the Android mint.
    const { data: share, error: shareErr } = await supabase
      .from('gift_shares')
      .select('token, sender_anonymous_id, android_gift_code')
      .eq('token', token)
      .maybeSingle();
    if (shareErr) throw shareErr;
    if (!share) return json({ success: false, reason: 'invalid_token' }, 404);

    // First fulfillment wins — return whatever this token already produced.
    const { data: bound, error: boundErr } = await supabase
      .from('offer_code_inventory')
      .select('code, redeem_url, product')
      .eq('share_token', token)
      .maybeSingle();
    if (boundErr) throw boundErr;
    if (bound) return json({ success: true, kind: 'offer_code', ...bound });
    if (share.android_gift_code) {
      return json({ success: true, kind: 'sd_code', code: share.android_gift_code });
    }

    if (product === 'android') {
      // Mint a standard 3-month Pass It On code under the sender's identity.
      const code = generateCode();
      const { error: mintErr } = await supabase.from('gift_codes').insert({
        code,
        product_id: 'gift_android_fallback',
        buyer_anonymous_id: share.sender_anonymous_id,
      });
      if (mintErr) throw mintErr;
      // Claim-by-update guards the race: only the null→code transition wins.
      const { data: claimed, error: claimErr } = await supabase
        .from('gift_shares')
        .update({ android_gift_code: code })
        .eq('token', token)
        .is('android_gift_code', null)
        .select('android_gift_code')
        .maybeSingle();
      if (claimErr) throw claimErr;
      if (!claimed) {
        // Lost the race — return the winner's code, release ours.
        await supabase.from('gift_codes').delete().eq('code', code);
        const { data: winner } = await supabase
          .from('gift_shares').select('android_gift_code').eq('token', token).single();
        return json({ success: true, kind: 'sd_code', code: winner!.android_gift_code });
      }
      return json({ success: true, kind: 'sd_code', code });
    }

    const { data, error } = await supabase.rpc('dispense_offer_code', {
      p_token: token,
      p_product: product,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (row?.code) {
      return json({ success: true, kind: 'offer_code', code: row.code, redeem_url: row.redeem_url, product: row.product });
    }

    // Token is valid but nothing came back: race (someone else just bound it)
    // or the batch ran dry. Re-check the binding before declaring drought.
    const { data: reBound } = await supabase
      .from('offer_code_inventory')
      .select('code, redeem_url, product')
      .eq('share_token', token)
      .maybeSingle();
    if (reBound) return json({ success: true, kind: 'offer_code', ...reBound });

    console.error('[get-dispense] out of stock for product:', product);
    return json({ success: false, reason: 'out_of_stock' }, 409);
  } catch (e) {
    console.error('[get-dispense] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
