// Pass It On — client for the gifts-* edge functions.
//
// The wallet is server-authoritative now: codes are minted server-side after a
// verified purchase, and redeemed-state changes happen on other people's
// devices, so the client can only ever mirror what the backend says. Every call
// carries the device identity (anonymous_id) + the RevenueCat app_user_id — the
// same pair check-grandfather uses — so the redeem grant lands on the right
// RC subscriber.
//
// We use raw fetch (not supabase.functions.invoke) so redeem's structured 4xx
// bodies — reason: 'already_redeemed' | 'self_redemption' | ... — come back
// intact instead of being flattened into a generic error.
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

const FN_BASE = `${SUPABASE_URL}/functions/v1`;

export interface WalletCode {
  code: string;
  status: 'available' | 'redeemed';
  purchasedAt: string;
  redeemedAt?: string;
}

export type RedeemReason =
  | 'invalid'
  | 'already_redeemed'
  | 'self_redemption'
  | 'already_premium'
  | 'grant_failed'
  | 'bad_request'
  | 'server_error';

export interface RedeemResult {
  success: boolean;
  reason?: RedeemReason;
  message: string;
}

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

async function callFn<T>(name: string, body: Record<string, unknown>): Promise<{ status: number; data: T }> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

// Verify the just-completed purchase and mint codes server-side. Returns the
// giver's full wallet so the caller can replace its cache.
export async function purchaseGiftCodes(productId: string): Promise<WalletCode[]> {
  const id = await identity();
  const { data } = await callFn<{ success: boolean; wallet?: WalletCode[]; message?: string }>(
    'gifts-purchase',
    { ...id, product_id: productId },
  );
  if (!data.success) throw new Error(data.message || 'Could not add your gifts. Please try again.');
  return data.wallet ?? [];
}

// Sync the giver's wallet (redeemed states may have changed elsewhere). Returns
// null when the server didn't answer with a wallet (network error, function not
// deployed yet) so callers can leave their cache untouched instead of blanking
// it; an empty array means the server authoritatively has no codes.
export async function fetchGiftWallet(): Promise<WalletCode[] | null> {
  const { anonymous_id } = await identity();
  try {
    const { status, data } = await callFn<{ success: boolean; wallet?: WalletCode[] }>(
      'gifts-wallet',
      { anonymous_id },
    );
    if (status !== 200 || !data.success) return null;
    return data.wallet ?? [];
  } catch {
    return null;
  }
}

// Redeem a code for THIS device's recipient identity.
export async function redeemGiftCode(code: string): Promise<RedeemResult> {
  const id = await identity();
  try {
    const { data } = await callFn<RedeemResult>('gifts-redeem', { code, ...id });
    return {
      success: !!data.success,
      reason: data.reason,
      message: data.message || (data.success ? 'Redeemed.' : 'Something went wrong. Please try again.'),
    };
  } catch {
    return { success: false, reason: 'server_error', message: 'Couldn’t reach the server. Check your connection and try again.' };
  }
}
