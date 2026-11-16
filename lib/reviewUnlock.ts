import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export type ReviewUnlockResult =
  | { success: true; info: CustomerInfo }
  | { success: false; reason: 'invalid' | 'network' | 'server' };

// Store-review unlock (Android only; see supabase/functions/review-unlock).
// The server grants a RevenueCat promotional entitlement; this re-reads
// CustomerInfo so the normal entitlement check picks it up.
export async function redeemReviewCode(code: string): Promise<ReviewUnlockResult> {
  try {
    const rcAppUserId = await Purchases.getAppUserID();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/review-unlock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, rc_app_user_id: rcAppUserId, platform: 'android' }),
    });
    const body = await response.json().catch(() => null);
    if (!body?.success) {
      return { success: false, reason: body?.reason === 'invalid' ? 'invalid' : 'server' };
    }
    // The grant is server-side; drop the SDK's cached CustomerInfo so the
    // next read comes from RevenueCat and carries the new entitlement.
    await Purchases.invalidateCustomerInfoCache();
    const info = await Purchases.getCustomerInfo();
    return { success: true, info };
  } catch {
    return { success: false, reason: 'network' };
  }
}
