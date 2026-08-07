import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';
import { getDeviceSecret } from '@/lib/deviceSecret';

export interface DeveloperAccess {
  authorized: boolean;
  role?: 'tester' | 'admin';
  capabilities: string[];
  pinRequired?: boolean;
  locked?: boolean;
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
    if (!device_secret) return { authorized: false, capabilities: [] };

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
    return {
      authorized: response.ok && data?.authorized === true,
      role: data?.role === 'admin' ? 'admin' : data?.role === 'tester' ? 'tester' : undefined,
      capabilities: Array.isArray(data?.capabilities)
        ? data.capabilities.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      pinRequired: data?.pin_required === true,
      locked: data?.locked === true,
    };
  } catch (error) {
    console.warn('[Developer Access] authorization unavailable', error);
    return { authorized: false, capabilities: [] };
  }
}
