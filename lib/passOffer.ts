import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export type PassClaimResult =
  | { success: true }
  | { success: false; reason: 'invalid_token' | 'already_claimed' | 'legacy_pass' | 'network' | 'unknown' };

// Bind a pass to this RevenueCat app user before opening Google Play. The same
// app user may retry after cancelling the Play sheet; a different app user
// cannot use the same shared link afterward.
export async function claimAndroidPass(token: string): Promise<PassClaimResult> {
  if (Platform.OS !== 'android') return { success: false, reason: 'unknown' };
  try {
    const rcAppUserId = await Purchases.getAppUserID();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-dispense`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: 'android',
        action: 'claim_play_offer',
        rc_app_user_id: rcAppUserId,
      }),
    });
    const body = await response.json().catch(() => null);
    if (body?.success && body?.kind === 'play_offer') return { success: true };
    const reason = body?.reason;
    if (reason === 'invalid_token' || reason === 'already_claimed' || reason === 'legacy_pass') {
      return { success: false, reason };
    }
    return { success: false, reason: 'unknown' };
  } catch {
    return { success: false, reason: 'network' };
  }
}
