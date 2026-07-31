// Gift credits — client for the credits-status / credits-share edge functions.
// (docs/invite-rewards-design.md §0: annual 5/yr · monthly 1 per 3 months ·
// founding members 5/yr. The gift itself is an Apple offer code the RECIPIENT
// picks up on soberdailies.com/get — the app only ever handles tokens.)
//
// Two local caches, both AsyncStorage:
//  • balance cache — lets the tab-header gift badge render instantly and
//    throttles refreshes (four headers mount per app session).
//  • pending share — a token has to be minted BEFORE the composer opens (the
//    link must exist to go in the text), but minting is free: the server only
//    counts shares with sent_at set. A cancelled composer leaves the token
//    pending and the next gift reuses it, so a device holds at most one
//    unsent link and the balance always equals what you can actually give.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';
import { getDeviceSecret } from '@/lib/deviceSecret';

// Kill switch (Neal, 2026-07-22): passes are SUSPENDED for the TestFlight
// period — sandbox subscriptions would otherwise earn passes that dispense
// real production offer codes. When false the balance always reads 0 (header
// badge hides, give row hides), no token is ever minted, and the post-
// subscribe thank-you never announces. Flip to true for launch; the server
// keeps its own gates (_shared/credits.ts skips sandbox and non-paying subs).
export const PASSES_ENABLED = false;

const BALANCE_KEY = 'gift_credits_cache_v1';
const PENDING_KEY = 'gift_pending_share_v1';
const UNSTAMPED_KEY = 'gift_unstamped_sends_v1'; // sends whose confirm failed
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
async function identity(): Promise<{
  anonymous_id: string;
  rc_app_user_id: string;
  device_secret: string | null;
}> {
  const anonymous_id = await getAnonymousId();
  // Proves we own that id — without it the server can't tell us from anyone who
  // learned the id (lib/deviceSecret.ts).
  const device_secret = await getDeviceSecret();
  let rc_app_user_id = anonymous_id; // web / RC-unavailable fallback
  if (Platform.OS !== 'web') {
    try {
      rc_app_user_id = await Purchases.getAppUserID();
    } catch {
      // keep the anonymous_id fallback
    }
  }
  return { anonymous_id, rc_app_user_id, device_secret };
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
  await flushUnstamped(); // catch up any send whose confirm failed offline
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
  await noteGrantTotal(status.totalGranted); // queues the arrival sheet when new passes land
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
// Stamping sent_at server-side is what spends the pass; clearing the pending
// slot lets the next gift mint a fresh token.
//
// The local slot is cleared even when the stamp fails. The recipient already
// holds this link, and reusing it would hand a second person the same token —
// get-dispense is idempotent per token, so they would both land on the SAME
// offer code. A failed stamp is queued and retried instead; the failure
// direction is an uncounted send (one extra pass given), which is the cheap
// way to be wrong.
export async function confirmShareSent(): Promise<void> {
  let token: string | null = null;
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) token = (JSON.parse(raw) as PendingShare).token;
  } catch {}
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
  if (!token) return;
  if (!(await stampSent(token))) await queueUnstamped(token);
}

async function stampSent(token: string): Promise<boolean> {
  const { anonymous_id, device_secret } = await identity();
  const data = await callFn<{ success: boolean }>('credits-share', {
    anonymous_id,
    device_secret,
    action: 'confirm_sent',
    token,
  });
  return !!data?.success;
}

async function queueUnstamped(token: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(UNSTAMPED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(token)) list.push(token);
    await AsyncStorage.setItem(UNSTAMPED_KEY, JSON.stringify(list.slice(-20)));
  } catch {}
}

// Retry sends whose stamp never landed (offline when the text went out), so
// the ledger catches up on its own. No-ops in the normal case — the queue is
// empty unless a confirm actually failed.
async function flushUnstamped(): Promise<void> {
  let list: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(UNSTAMPED_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch {}
  if (list.length === 0) return;
  const failed: string[] = [];
  for (const token of list) if (!(await stampSent(token))) failed.push(token);
  try {
    if (failed.length > 0) await AsyncStorage.setItem(UNSTAMPED_KEY, JSON.stringify(failed));
    else await AsyncStorage.removeItem(UNSTAMPED_KEY);
  } catch {}
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

// ── Pass-arrival announcement ───────────────────────────────────────────────
// Passes are earned on the first real charge, not at purchase — nothing is
// granted during a trial or intro period (_shared/credits.ts). The grants land
// silently on the next credits-status call after conversion, so without this
// the member is never told. We keep a high-water mark of total_granted and
// queue an announcement whenever it rises.
const ARRIVAL_KEY = 'gift_arrival_pending_v1';
const GRANTED_SEEN_KEY = 'gift_granted_seen_v1';

async function noteGrantTotal(totalGranted: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GRANTED_SEEN_KEY);
    const seen = raw === null ? null : Number(raw);
    await AsyncStorage.setItem(GRANTED_SEEN_KEY, String(totalGranted));
    // No baseline yet = first status call on this device. Record it silently;
    // announcing here would greet a returning member with passes they've had
    // all along.
    if (seen === null || !Number.isFinite(seen)) return;
    if (totalGranted <= seen) return;
    // A purchase announcement already queued means the welcome sheet is about
    // to fire (someone who converted with no trial earns immediately). One
    // sheet, not two — the baseline is still advanced above.
    if (await AsyncStorage.getItem(ANNOUNCE_KEY)) return;
    await AsyncStorage.setItem(ARRIVAL_KEY, String(totalGranted - seen));
  } catch {}
}

// Read-and-clear. Returns how many passes just arrived, or null.
export async function consumePendingArrival(): Promise<number | null> {
  try {
    if (!(await passesOn())) {
      await AsyncStorage.removeItem(ARRIVAL_KEY);
      return null;
    }
    const v = await AsyncStorage.getItem(ARRIVAL_KEY);
    if (!v) return null;
    await AsyncStorage.removeItem(ARRIVAL_KEY);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
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
