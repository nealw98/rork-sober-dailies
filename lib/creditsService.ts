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
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

const BALANCE_KEY = 'gift_credits_cache_v1';
const PENDING_KEY = 'gift_pending_share_v1';
const BALANCE_TTL_MS = 15 * 60 * 1000; // header refresh throttle

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

// The message a gift rides in. Personal, first-person, and the link is the
// gift artifact — the recipient picks their plan on /get.
export function giftMessage(link: string): string {
  return (
    'I want to give you your first 3 months of Sober Dailies — it’s an app ' +
    'that’s been part of my recovery. It’s on me:\n\n' + link
  );
}
