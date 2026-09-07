import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

export interface DeveloperAccess {
  authorized: boolean;
  role?: 'tester' | 'admin';
  capabilities: string[];
  // Why a non-authorized result names its cause. Without this the long press on
  // the version number is indistinguishable from a dead gesture — three
  // different failures all produced "nothing happens".
  unavailable?: 'unreachable' | 'not_authorized' | 'server_error';
}

// Authorization is membership: the Support ID (anonymous_id) either has an
// enabled row in authorized_devices or it doesn't. No device secret, no PIN —
// see the edge function for why that machinery was removed.
//
// Deliberately no persistent authorization cache: every attempt to open the
// console checks current server state, so revoking a device takes effect at
// once without an OTA or app restart. Network and parsing failures fail closed.
export async function checkDeveloperAccess(): Promise<DeveloperAccess> {
  try {
    const anonymous_id = await getAnonymousId();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/developer-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ anonymous_id }),
    });
    const data = await response.json().catch(() => null);
    const authorized = response.ok && data?.authorized === true;
    if (!authorized) {
      // Split on the STATUS: the function returns a bare { authorized: false }
      // both when it refuses a device (403) and when anything inside it throws
      // (503). Reporting those as one thing sent us hunting a database row that
      // was correct all along.
      console.warn('[Developer Access] refused', { status: response.status, anonymous_id });
    }
    return {
      authorized,
      role: data?.role === 'admin' ? 'admin' : data?.role === 'tester' ? 'tester' : undefined,
      capabilities: Array.isArray(data?.capabilities)
        ? data.capabilities.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      unavailable: authorized
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
