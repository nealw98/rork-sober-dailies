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
  if (/year|annual/i.test(productId)) return 'yearly';
  if (/month/i.test(productId)) return 'monthly';
  return null;
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
    const kind = classifyProduct(productId);
    if (!kind) continue;
    const expires = sub?.expires_date ? new Date(String(sub.expires_date)) : null;
    const active = !!expires && expires.getTime() > now.getTime();
    if (!active) continue;
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

// Insert any missing grants (idempotent via the (anonymous_id, grant_key) PK).
export async function ensureGrants(
  supabase: SupabaseClient,
  anonymousId: string,
  earned: EarnedGrant[],
): Promise<void> {
  if (earned.length === 0) return;
  const { error } = await supabase.from('gift_credit_grants').upsert(
    earned.map((g) => ({ anonymous_id: anonymousId, ...g })),
    { onConflict: 'anonymous_id,grant_key', ignoreDuplicates: true },
  );
  if (error) throw error;
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
  const [{ data: grants, error: gErr }, { count, error: sErr }] = await Promise.all([
    supabase.from('gift_credit_grants').select('credits').eq('anonymous_id', anonymousId),
    supabase.from('gift_shares').select('token', { count: 'exact', head: true })
      .eq('sender_anonymous_id', anonymousId),
  ]);
  if (gErr) throw gErr;
  if (sErr) throw sErr;
  const total_granted = (grants ?? []).reduce((s, r) => s + (r.credits ?? 0), 0);
  const shares_used = count ?? 0;
  return { balance: total_granted - shares_used, total_granted, shares_used };
}

// Is founding-member crediting on, and is this device grandfathered?
export async function foundingEligible(
  supabase: SupabaseClient,
  anonymousId: string,
): Promise<boolean> {
  if ((Deno.env.get('FOUNDING_CREDITS_ENABLED') ?? 'false') !== 'true') return false;
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
