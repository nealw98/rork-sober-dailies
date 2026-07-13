// Pass It On — mint codes after a verified gift purchase.
//
// The client calls this right after Purchases.purchaseStoreProduct() succeeds.
// We do NOT trust the client for anything that matters: the code COUNT comes
// from a server-side product map, and the purchase itself is verified against
// RevenueCat (which already validated the App Store / Play receipt) before a
// single code is minted. Minting is idempotent per store transaction, so a
// retry (app killed mid-purchase, receipt replay) never double-mints.
//
// Required Supabase secrets: REVENUECAT_SECRET_API_KEY (sk_...), plus the
// auto-provided SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, json, serviceClient, generateCode,
  GIFT_PRODUCTS, fetchWallet, fetchRcSubscriber,
} from '../_shared/gifts.ts';

interface Body {
  anonymous_id: string;
  rc_app_user_id: string;
  product_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, rc_app_user_id, product_id }: Body = await req.json();
    if (!anonymous_id || !rc_app_user_id || !product_id) {
      return json({ success: false, message: 'Missing anonymous_id, rc_app_user_id, or product_id' }, 400);
    }

    const perTransaction = GIFT_PRODUCTS[product_id];
    if (!perTransaction) {
      return json({ success: false, message: `Unknown gift product: ${product_id}` }, 400);
    }

    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!secretKey) return json({ success: false, message: 'Server not configured (RC key)' }, 500);

    const supabase = serviceClient();

    // 1) Verify the purchase with RevenueCat. Consumables land in the
    //    subscriber's non_subscriptions[product_id] as one entry per purchase.
    const subscriber = await fetchRcSubscriber(rc_app_user_id, secretKey);
    const purchases: Array<{ id?: string; store_transaction_id?: string }> =
      subscriber?.subscriber?.non_subscriptions?.[product_id] ?? [];

    if (purchases.length === 0) {
      // RC hasn't recorded the transaction (or the id is wrong). Don't mint.
      return json({ success: false, message: 'No matching purchase found for this account.' }, 402);
    }

    // 2) For each transaction not already minted, mint `perTransaction` codes.
    //    Idempotency key = the store transaction id. This loop naturally covers
    //    the common single-purchase case and any un-minted backlog.
    const txnIds = purchases
      .map((p) => p.store_transaction_id || p.id)
      .filter((x): x is string => !!x);

    const { data: existing, error: existingErr } = await supabase
      .from('gift_codes')
      .select('purchase_transaction_id')
      .in('purchase_transaction_id', txnIds);
    if (existingErr) throw existingErr;
    const alreadyMinted = new Set((existing ?? []).map((r) => r.purchase_transaction_id));

    let mintedCount = 0;
    for (const txnId of txnIds) {
      if (alreadyMinted.has(txnId)) continue;

      const rows = Array.from({ length: perTransaction }, () => ({
        code: generateCode(),
        product_id,
        status: 'available' as const,
        buyer_anonymous_id: anonymous_id,
        buyer_rc_app_user_id: rc_app_user_id,
        purchase_transaction_id: txnId,
      }));

      // Unique PK on `code` guards the astronomically-unlikely collision; on the
      // rare conflict, retry that transaction's insert once with fresh codes.
      let { error: insertErr } = await supabase.from('gift_codes').insert(rows);
      if (insertErr) {
        const retry = rows.map((r) => ({ ...r, code: generateCode() }));
        ({ error: insertErr } = await supabase.from('gift_codes').insert(retry));
        if (insertErr) throw insertErr;
      }
      mintedCount += perTransaction;
    }

    // 3) Return the buyer's full wallet so the client can replace its cache.
    const wallet = await fetchWallet(supabase, anonymous_id);
    return json({ success: true, minted: mintedCount, wallet });
  } catch (e) {
    console.error('[gifts-purchase] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
