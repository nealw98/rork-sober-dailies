import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';
import { getDeviceSecret } from '@/lib/deviceSecret';

export interface DeveloperAccess {
  authorized: boolean;
  role?: 'tester' | 'admin';
  capabilities: string[];
  pinRequired?: boolean;
  locked?: boolean;
  // Why a non-authorized result carries no PIN path. Without this the long
  // press on the version number is indistinguishable from a dead gesture —
  // three different failures all produced "nothing happens".
  unavailable?: 'no_device_secret' | 'unreachable' | 'not_authorized' | 'server_error';
}

// Deliberately no persistent authorization cache: every attempt to open the
// console checks current server state, so revoking a device takes effect at
// once without an OTA or app restart. Network and parsing failures fail closed.
export async function checkDeveloperAccess(pin?: string): Promise<DeveloperAccess> {
  try {
    const [anonymous_id, device_secret] = await Promise.all([
      getAnonymousId(),
      getDeviceSecret(),
    ]);
    if (!device_secret) return { authorized: false, capabilities: [], unavailable: 'no_device_secret' };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/developer-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ anonymous_id, device_secret, pin }),
    });
    const data = await response.json().catch(() => null);
    const authorized = response.ok && data?.authorized === true;
    return {
      authorized,
      role: data?.role === 'admin' ? 'admin' : data?.role === 'tester' ? 'tester' : undefined,
      capabilities: Array.isArray(data?.capabilities)
        ? data.capabilities.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      pinRequired: data?.pin_required === true,
      locked: data?.locked === true,
      // Split on the STATUS, not just the absence of pin_required: the function
      // returns a bare { authorized: false } both when it refuses a device (403)
      // and when anything inside it throws (503). Reporting those as one thing
      // sent us hunting a database row that was correct all along.
      unavailable:
        authorized || data?.pin_required === true
          ? undefined
          : response.status >= 500
            ? 'server_error'
            : 'not_authorized',
    };
  } catch (error) {
    console.warn('[Developer Access] authorization unavailable', error);
    return { authorized: false, capabilities: [], unavailable: 'unreachable' };
  }
}
