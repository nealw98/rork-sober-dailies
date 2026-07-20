// SD-code redemption — client for the gifts-redeem edge function.
//
// The only surviving piece of the old purchased-codes system (purchase and
// wallet retired in the 2026-07-20 acquisition pivot): "Have a code?" on the
// paywall and the redeem screen still accept SD-XXXX-XXXX codes — legacy
// purchased codes and the codes the /get page mints for Android pass
// recipients both redeem here for a 3-month RC promotional grant. Every call
// carries the device identity (anonymous_id) + the RevenueCat app_user_id so
// the grant lands on the right RC subscriber.
//
// We use raw fetch (not supabase.functions.invoke) so redeem's structured 4xx
// bodies — reason: 'already_redeemed' | 'self_redemption' | ... — come back
// intact instead of being flattened into a generic error.
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

const FN_BASE = `${SUPABASE_URL}/functions/v1`;

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
