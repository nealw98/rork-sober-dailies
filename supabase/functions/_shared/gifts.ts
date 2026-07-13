// Pass It On — shared helpers for the gifts-* edge functions.
//
// Kept deliberately small: the product→code-count map, code generation, the
// RevenueCat REST calls, and a normalizer that turns a gift_codes row into the
// wire shape the app's wallet expects.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const ENTITLEMENT_ID = 'premium';
export const GIFT_ENTITLEMENT_DURATION = 'three_month'; // RC promotional duration
export const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

// Server-side source of truth for how many codes each SKU mints. Mirrors
// lib/giftProducts.ts on the client — the client is never trusted for the count.
export const GIFT_PRODUCTS: Record<string, number> = {
  gift_3mo_single: 1,
  gift_3mo_pack5: 5,
  gift_3mo_pack10: 10,
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// No 0/O/1/I/L — codes get read aloud at meetings (spec / handoff Phase 3).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

function randomBlock(): string {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export function generateCode(): string {
  return `SD-${randomBlock()}-${randomBlock()}`;
}

// The wire shape consumed by the app's use-gift-wallet hook.
export interface GiftCodeWire {
  code: string;
  status: 'available' | 'redeemed';
  purchasedAt: string;
  redeemedAt?: string;
}

// deno-lint-ignore no-explicit-any
export function toWire(row: any): GiftCodeWire {
  return {
    code: row.code,
    status: row.status,
    purchasedAt: row.created_at,
    ...(row.redeemed_at ? { redeemedAt: row.redeemed_at } : {}),
  };
}

// A giver's full wallet, newest first (matches the design's ledger order).
export async function fetchWallet(
  supabase: SupabaseClient,
  buyerAnonymousId: string,
): Promise<GiftCodeWire[]> {
  const { data, error } = await supabase
    .from('gift_codes')
    .select('code, status, created_at, redeemed_at')
    .eq('buyer_anonymous_id', buyerAnonymousId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toWire);
}

// GET a RevenueCat subscriber (secret key). Returns the parsed body or null.
export async function fetchRcSubscriber(
  rcAppUserId: string,
  secretKey: string,
): Promise<any | null> {
  const res = await fetch(
    `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(rcAppUserId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!res.ok) return null;
  return await res.json();
}

// Grant the recipient a 3-month `premium` promotional entitlement. Same REST
// call the check-grandfather function uses, with a fixed duration.
export async function grantGiftEntitlement(
  rcAppUserId: string,
  secretKey: string,
): Promise<{ ok: boolean; message?: string }> {
  const endpoint =
    `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(rcAppUserId)}` +
    `/entitlements/${ENTITLEMENT_ID}/promotional`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration: GIFT_ENTITLEMENT_DURATION }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, message: body?.message || res.statusText };
  }
  return { ok: true };
}

// Does this RC subscriber already hold an active `premium` entitlement?
// deno-lint-ignore no-explicit-any
export function hasActivePremium(subscriber: any): boolean {
  const ent = subscriber?.subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!ent) return false;
  const expires = ent.expires_date;
  return expires == null || new Date(expires).getTime() > Date.now();
}
