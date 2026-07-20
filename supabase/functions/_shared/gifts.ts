// Pass It On — shared helpers for the gifts-* edge functions.
//
// Kept deliberately small: the product→code-count map, code generation, the
// RevenueCat REST calls, and a normalizer that turns a gift_codes row into the
// wire shape the app's wallet expects.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const ENTITLEMENT_ID = 'premium';
// RC promotional duration a redeemed code grants. LAUNCH VALUE: 'three_month'
// (the QA 'daily' default was reverted 2026-07-20 during the post-launch
// cleanup audit — the Android pass fallback redeems through gifts-redeem, so
// this is a production path). A GIFT_ENTITLEMENT_DURATION secret still
// overrides for QA. Valid values: daily | three_day | weekly | monthly |
// two_month | three_month | six_month | yearly | lifetime.
export const GIFT_ENTITLEMENT_DURATION = Deno.env.get('GIFT_ENTITLEMENT_DURATION') ?? 'three_month';
export const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

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
