// Gift credits — client for the credits-status / credits-share edge functions.
// (docs/invite-rewards-design.md §0: annual 5/yr · monthly 1 per 3 months ·
// founding members 5/yr. The gift itself is an Apple offer code the RECIPIENT
// picks up on soberdailies.com/get — the app only ever handles tokens.)
//
// Two local caches, both AsyncStorage:
//  • balance cache — lets the tab-header gift badge render instantly and
//    throttles refreshes (four headers mount per app session).
//  • pending share — the server decrements balance when a token is MINTED,
//    so a cancelled SMS composer would strand a credit. Instead the unsent
//    token is kept and reused for the next gift attempt: nothing is lost,
//    the credit just stays "in the envelope" until a text actually sends.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

// Kill switch (Neal, 2026-07-22): passes are SUSPENDED for the TestFlight
// period — sandbox subscriptions would otherwise earn passes that dispense
// real production offer codes. When false the balance always reads 0 (header
// badge hides, give row hides), no token is ever minted, and the post-
// subscribe thank-you never announces. Flip to true for launch; the server
// keeps its own gates (_shared/credits.ts skips sandbox and non-paying subs).
export const PASSES_ENABLED = false;

const BALANCE_KEY = 'gift_credits_cache_v1';
const PENDING_KEY = 'gift_pending_share_v1';
const BALANCE_TTL_MS = 15 * 60 * 1000; // header refresh throttle

// ── Developer Console: passes on THIS device ────────────────────────────────
// The kill switch above is global and ships in the bundle, so turning it on to
// exercise the flow would turn it on for everyone. This override unsuspends
// passes for one device only — it is written by the Developer Console, read
// nowhere else, and has no effect on any other install.
const QA_OVERRIDE_KEY = 'qa_passes_enabled_v1';
let overrideCache: boolean | null = null;

// The real gate. PASSES_ENABLED wins outright once launch flips it; until then
// the device override is the only way in.
async function passesOn(): Promise<boolean> {
  if (PASSES_ENABLED) return true;
  if (overrideCache === null) {
    try {
      overrideCache = (await AsyncStorage.getItem(QA_OVERRIDE_KEY)) === 'true';
    } catch {
      overrideCache = false;
    }
  }
  return overrideCache;
}

export async function getPassesOverride(): Promise<boolean> {
  if (overrideCache !== null) return overrideCache;
  try {
    overrideCache = (await AsyncStorage.getItem(QA_OVERRIDE_KEY)) === 'true';
  } catch {
    overrideCache = false;
  }
  return overrideCache;
}

export async function setPassesOverride(on: boolean): Promise<void> {
  overrideCache = on;
  try {
    if (on) await AsyncStorage.setItem(QA_OVERRIDE_KEY, 'true');
    else await AsyncStorage.removeItem(QA_OVERRIDE_KEY);
  } catch {}
  // The cached balance was written under the old gate (0 while suspended) —
  // drop it so the next read comes from the server.
  await AsyncStorage.removeItem(BALANCE_KEY).catch(() => {});
}

export interface CreditStatus {
  balance: number;
  totalGranted: number;
  sharesUsed: number;
}

interface PendingShare {
  token: string;
  link: string;
}

// Same identity pair the gift flow sends (lib/giftService.ts) — the RC id is
// what the server reads subscription state from to compute earned credits.
async function identity(): Promise<{ anonymous_id: string; rc_app_user_id: string }> {
  const anonymous_id = await getAnonymousId();
  let rc_app_user_id = anonymous_id; // web / RC-unavailable fallback
  if (Platform.OS !== 'web') {
    try {
      rc_app_user_id = await Purchases.getAppUserID();
    } catch {
      // keep the anonymous_id fallback
    }
  }
  return { anonymous_id, rc_app_user_id };
}

async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[credits] ${name} failed`, e);
    return null;
  }
}

async function cacheBalance(status: CreditStatus): Promise<void> {
  await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify({ ...status, ts: Date.now() })).catch(() => {});
}

// Cached balance for instant header rendering. null = never fetched.
export async function getCachedCreditStatus(): Promise<(CreditStatus & { stale: boolean }) | null> {
  if (!(await passesOn())) return { balance: 0, totalGranted: 0, sharesUsed: 0, stale: false };
  try {
    const raw = await AsyncStorage.getItem(BALANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      balance: parsed.balance ?? 0,
      totalGranted: parsed.totalGranted ?? 0,
      sharesUsed: parsed.sharesUsed ?? 0,
      stale: Date.now() - (parsed.ts ?? 0) > BALANCE_TTL_MS,
    };
  } catch {
    return null;
  }
}

// Fresh status from the server (also heals grants — the server recomputes
// earned credits from live RC state on every call). Updates the cache.
export async function fetchCreditStatus(): Promise<CreditStatus | null> {
  if (!(await passesOn())) return { balance: 0, totalGranted: 0, sharesUsed: 0 };
  const id = await identity();
  const data = await callFn<{ success: boolean; balance: number; total_granted: number; shares_used: number }>(
    'credits-status',
    id,
  );
  if (!data?.success) return null;
  const status: CreditStatus = {
    balance: data.balance ?? 0,
    totalGranted: data.total_granted ?? 0,
    sharesUsed: data.shares_used ?? 0,
  };
  await cacheBalance(status);
  return status;
}

// A share link to put in a text. Reuses a pending (minted-but-never-sent)
// token when one exists; otherwise spends a credit to mint a fresh one.
// Returns null when the sender has no credits (or the network failed).
export async function getShareLink(): Promise<PendingShare | null> {
  if (!(await passesOn())) return null;
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) return JSON.parse(raw) as PendingShare;
  } catch {}

  const id = await identity();
  const data = await callFn<{ success: boolean; token: string; link: string; balance: number }>(
    'credits-share',
    id,
  );
  if (!data?.success || !data.token) return null;
  const pending: PendingShare = { token: data.token, link: data.link };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending)).catch(() => {});
  return pending;
}

// The text with this token actually SENT — the gift is out in the world.
// Clear the pending slot so the next gift mints a fresh token.
export async function confirmShareSent(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
}

// ── Post-subscribe thank-you handoff ────────────────────────────────────────
// The designed thank-you sheet can't live in the dissolving paywall tree, so
// buy() writes a pending flag BEFORE the gate drops and the Today screen
// presents the sheet on first mount (design_handoff_gift_surfaces §1).
const ANNOUNCE_KEY = 'gift_announcement_pending_v1';

export type AnnouncePlan = 'annual' | 'monthly';

export async function setPendingAnnouncement(plan: AnnouncePlan): Promise<void> {
  await AsyncStorage.setItem(ANNOUNCE_KEY, plan).catch(() => {});
}

// Read-and-clear. Returns the plan to announce, or null.
export async function consumePendingAnnouncement(): Promise<AnnouncePlan | null> {
  try {
    // Suspended: swallow (and clear) any pending announcement so it doesn't
    // fire months later when passes go live.
    if (!(await passesOn())) {
      await AsyncStorage.removeItem(ANNOUNCE_KEY);
      return null;
    }
    const v = await AsyncStorage.getItem(ANNOUNCE_KEY);
    if (v !== 'annual' && v !== 'monthly') return null;
    await AsyncStorage.removeItem(ANNOUNCE_KEY);
    return v;
  } catch {
    return null;
  }
}

// ── Developer Console: manual grants ────────────────────────────────────────
// The automatic grants are derived from RevenueCat state (annual → 5/yr,
// monthly → 1 at signup + 1 per 3 paid months, grandfathered → founding_y1).
// This writes the same ledger without a subscription event, the way founding_y1
// does, so promo passes can be handed out by hand.
//
// It's a straight Postgres RPC (dev_grant_passes, SECURITY DEFINER) — nothing
// to deploy. The safeguard is server-side: the RPC refuses any device whose
// anonymous_id isn't in the dev_pass_granters table, which the anon key can't
// read or grow. A successful grant also flips the device override ON, so the
// passes are immediately visible and sendable — no second step to remember.

export interface GrantResult {
  ok: boolean;
  balance?: number;
  message?: string;
}

// Add `credits` passes to this device's balance. Server caps a single call at 25.
export async function qaGrantPasses(credits: number = 5): Promise<GrantResult> {
  try {
    const anonymous_id = await getAnonymousId();
    const { data, error } = await supabase.rpc('dev_grant_passes', {
      p_anonymous_id: anonymous_id,
      p_credits: credits,
    });
    if (error) {
      // PGRST202 = the RPC doesn't exist yet — the §7 SQL was never pasted.
      const message = error.code === 'PGRST202'
        ? 'Server setup missing — run the §7.1 SQL from the gift runbook in Supabase.'
        : error.message;
      return { ok: false, message };
    }
    await setPassesOverride(true);
    const balance = typeof data === 'number' ? data : 0;
    await cacheBalance({ balance, totalGranted: 0, sharesUsed: 0 });
    return { ok: true, balance };
  } catch {
    return { ok: false, message: 'Network error — could not reach the server.' };
  }
}

// True ledger state regardless of the gate, so the console can show what was
// granted even while passes are suspended for everyone else.
export async function qaFetchCreditStatus(): Promise<CreditStatus | null> {
  const id = await identity();
  const data = await callFn<{ success: boolean; balance: number; total_granted: number; shares_used: number }>(
    'credits-status',
    id,
  );
  if (!data?.success) return null;
  return {
    balance: data.balance ?? 0,
    totalGranted: data.total_granted ?? 0,
    sharesUsed: data.shares_used ?? 0,
  };
}

// The message a gift rides in. Personal, first-person, and the link is the
// gift artifact — the recipient picks their plan on /get.
export function giftMessage(link: string): string {
  return (
    'I want to give you your first 3 months of Sober Dailies — it’s an app ' +
    'that’s been part of my recovery. It’s on me:\n\n' + link
  );
}
