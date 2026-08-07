// Gift acquisition program — shared credit-grant logic.
// (docs/invite-rewards-design.md §0: annual → 5/yr upfront; monthly → 1 per
// 3 paid months; grandfathered v1 → 5/yr behind FOUNDING_CREDITS_ENABLED.)
//
// Grants are GRANT-ON-READ and idempotent: every status/share call recomputes
// what the sender has earned from RevenueCat subscription state and inserts
// any missing grant rows (PK ignores duplicates). No cron, self-healing.
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const ANNUAL_CREDITS_PER_YEAR = 5;
export const TENURE_MONTHS_PER_CREDIT = 3;

export interface EarnedGrant {
  grant_key: string;
  credits: number;
}

// Product-duration classifier. Product IDs here: monthly_support /
// yearly_support, plus legacy SKUs — match by name, not a hardcoded list, so
// old products classify correctly too.
export function classifyProduct(productId: string): 'yearly' | 'monthly' | null {
  if (/year|annual|12[_. -]?month/i.test(productId)) return 'yearly';
  if (/month/i.test(productId)) return 'monthly';
  return null;
}

// RevenueCat product ids are merchant-defined. Prefer the paid term recorded
// on the subscription so an annual SKU such as `premium_12_month` cannot be
// mistaken for monthly merely because its id contains the word "month".
// deno-lint-ignore no-explicit-any
export function classifySubscription(productId: string, sub: any): 'yearly' | 'monthly' | null {
  const purchasedAt = new Date(String(sub?.purchase_date ?? '')).getTime();
  const expiresAt = new Date(String(sub?.expires_date ?? '')).getTime();
  if (Number.isFinite(purchasedAt) && Number.isFinite(expiresAt) && expiresAt > purchasedAt) {
    const termDays = (expiresAt - purchasedAt) / (24 * 3600 * 1000);
    if (termDays >= 300) return 'yearly';
    if (termDays >= 20 && termDays <= 62) return 'monthly';
  }
  return classifyProduct(productId);
}

const MS_PER_MONTH = 30.44 * 24 * 3600 * 1000;

function monthsBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.floor((to.getTime() - from) / MS_PER_MONTH));
}

// Compute every grant this subscriber has earned to date.
// deno-lint-ignore no-explicit-any
export function computeEarnedGrants(subscriber: any, opts: { founding: boolean }): EarnedGrant[] {
  const now = new Date();
  const grants = new Map<string, number>();
  const subs = subscriber?.subscriber?.subscriptions ?? {};

  for (const [productId, sub] of Object.entries<Record<string, unknown>>(subs)) {
    const kind = classifySubscription(productId, sub);
    if (!kind) continue;
    const expires = sub?.expires_date ? new Date(String(sub.expires_date)) : null;
    const active = !!expires && expires.getTime() > now.getTime();
    if (!active) continue;
    // TestFlight/sandbox subscriptions are not real members — without this a
    // tester's free sandbox sub would earn passes that dispense REAL
    // production offer codes. (Confirmed live 2026-07-27: a stale deploy
    // without this gate turned a TestFlight yearly into an annual_y1 grant.)
    if (sub?.is_sandbox === true) continue;
    // RC promotional grants aren't paying members either. Their pseudo-product
    // ids embed the duration (rc_promo_premium_three_month / _yearly), which
    // classifyProduct would happily match — so a gift recipient's free 3-month
    // grant would earn them a monthly_signup credit the first time their
    // wallet loads. Skip the store outright.
    if (String(sub?.store ?? '') === 'promotional') continue;
    // Decided 2026-07-22: no passes while riding free months. RC reports the
    // current billing period's type — Apple offer-code / trial / intro periods
    // are non-'normal' until the first real charge. A pass recipient therefore
    // earns nothing until they convert to paying; grant-on-read picks the
    // grants up automatically on the first status call after conversion.
    // (Absent field defaults to 'normal' so legacy payloads keep granting.)
    const periodType = String(sub?.period_type ?? 'normal');
    if (periodType !== 'normal') continue;
    const since = String(sub?.original_purchase_date ?? '');
    if (!since) continue;

    if (kind === 'yearly') {
      // 5 credits per subscription year, granted upfront at each anniversary.
      const years = Math.floor(monthsBetween(since, now) / 12) + 1;
      for (let y = 1; y <= years; y++) {
        grants.set(`annual_y${y}`, ANNUAL_CREDITS_PER_YEAR);
      }
    } else {
      // Monthly: 1 gift at signup (decided 2026-07-20 — the welcome thank-you
      // needs something real to announce), then 1 more per 3 paid months.
      // v1 approximation: calendar months since original purchase while
      // currently active — a lapse-and-return gap overcounts slightly.
      // Accepted; the credit is a ~$0 acquisition asset.
      grants.set('monthly_signup', 1);
      const earned = Math.floor(monthsBetween(since, now) / TENURE_MONTHS_PER_CREDIT);
      for (let n = 1; n <= earned; n++) {
        grants.set(`tenure_${n * TENURE_MONTHS_PER_CREDIT}`, 1);
      }
    }
  }

  if (opts.founding) {
    // Founding members (grandfathered v1): annual-tier credits. Year 1 only
    // for now; later anniversaries add keys here when the time comes.
    grants.set('founding_y1', ANNUAL_CREDITS_PER_YEAR);
  }

  return [...grants].map(([grant_key, credits]) => ({ grant_key, credits }));
}

// Remove only monthly grants created after the start of an active annual
// subscription. This repairs annual SKUs that the old name-only classifier
// treated as monthly without revoking passes genuinely earned beforehand.
// deno-lint-ignore no-explicit-any
export async function reconcileAnnualMisclassification(
  supabase: SupabaseClient,
  anonymousId: string,
  subscriber: any,
): Promise<void> {
  const now = Date.now();
  const subs = subscriber?.subscriber?.subscriptions ?? {};
  const annualStarts = Object.entries<Record<string, any>>(subs)
    .filter(([productId, sub]) => {
      const expiresAt = new Date(String(sub?.expires_date ?? '')).getTime();
      return classifySubscription(productId, sub) === 'yearly'
        && expiresAt > now
        && sub?.is_sandbox !== true
        && String(sub?.store ?? '') !== 'promotional'
        && String(sub?.period_type ?? 'normal') === 'normal';
    })
    .map(([, sub]) => new Date(String(sub?.purchase_date ?? sub?.original_purchase_date ?? '')).getTime())
    .filter(Number.isFinite);
  if (annualStarts.length === 0) return;

  const annualStart = Math.min(...annualStarts) - 5 * 60 * 1000;
  const { data, error } = await supabase
    .from('gift_credit_grants')
    .select('grant_key, granted_at')
    .eq('anonymous_id', anonymousId);
  if (error) throw error;

  const mistakenKeys = (data ?? [])
    .filter((grant: { grant_key: string; granted_at: string }) => (grant.grant_key === 'monthly_signup' || grant.grant_key.startsWith('tenure_'))
      && new Date(grant.granted_at).getTime() >= annualStart)
    .map((grant: { grant_key: string }) => grant.grant_key);
  if (mistakenKeys.length === 0) return;

  const { error: deleteError } = await supabase
    .from('gift_credit_grants')
    .delete()
    .eq('anonymous_id', anonymousId)
    .in('grant_key', mistakenKeys);
  if (deleteError) throw deleteError;
}

// Insert any missing grants (idempotent via the (anonymous_id, grant_key) PK).
// Returns ONLY the rows actually inserted this call (ON CONFLICT DO NOTHING +
// RETURNING skips the duplicates) — the caller uses that for exactly-once
// pass_granted analytics.
export async function ensureGrants(
  supabase: SupabaseClient,
  anonymousId: string,
  earned: EarnedGrant[],
): Promise<EarnedGrant[]> {
  if (earned.length === 0) return [];
  const { data, error } = await supabase.from('gift_credit_grants').upsert(
    earned.map((g) => ({ anonymous_id: anonymousId, ...g })),
    { onConflict: 'anonymous_id,grant_key', ignoreDuplicates: true },
  ).select('grant_key, credits');
  if (error) throw error;
  return (data ?? []) as EarnedGrant[];
}

export interface CreditState {
  balance: number;
  total_granted: number;
  shares_used: number;
}

export async function getCreditState(
  supabase: SupabaseClient,
  anonymousId: string,
): Promise<CreditState> {
  // Only DELIVERED shares spend a credit (migration 20260727110000). A token
  // minted for a composer the sender cancelled has sent_at NULL and is free —
  // it stays reusable client-side and no offer code left inventory for it.
  const [{ data: grants, error: gErr }, { count, error: sErr }] = await Promise.all([
    supabase.from('gift_credit_grants').select('credits').eq('anonymous_id', anonymousId),
    supabase.from('gift_shares').select('token', { count: 'exact', head: true })
      .eq('sender_anonymous_id', anonymousId)
      .not('sent_at', 'is', null),
  ]);
  if (gErr) throw gErr;
  if (sErr) throw sErr;
  const total_granted = (grants ?? []).reduce((s, r) => s + (r.credits ?? 0), 0);
  const shares_used = count ?? 0;
  return { balance: total_granted - shares_used, total_granted, shares_used };
}

// Is founding-member crediting on, and is this device grandfathered?
// Default ON (decided 2026-07-20; also the secrets endpoint rejected the CLI
// token, so the default carries the decision) — set the env to 'false' to
// turn it off.
export async function foundingEligible(
  supabase: SupabaseClient,
  anonymousId: string,
): Promise<boolean> {
  if ((Deno.env.get('FOUNDING_CREDITS_ENABLED') ?? 'true') !== 'true') return false;
  const { data } = await supabase
    .from('user_profiles')
    .select('is_grandfathered')
    .eq('anonymous_id', anonymousId)
    .maybeSingle();
  return !!data?.is_grandfathered;
}

// Unguessable share token for the /get link. 20 chars from the gift-code
// alphabet (no 0/O/1/I/L) — URL-safe and phone-readable if it ever needs to be.
const TOKEN_CHARS = 'abcdefghjkmnpqrstvwxyz23456789';
export function generateShareToken(): string {
  const bytes = new Uint32Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('');
}
