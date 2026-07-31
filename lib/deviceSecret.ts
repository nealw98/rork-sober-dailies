// The device's proof that it owns its anonymous_id.
//
// The credit ledger is keyed by anonymous_id and the client sends that id to the
// edge functions. The id alone is not a secret (it's the Support ID users paste
// into feedback emails), so anything that spends passes also sends this random
// 32-byte value; the server registers its hash on first use and requires it
// thereafter. See supabase/functions/_shared/deviceAuth.ts.
//
// Kept in SecureStore next to the anonymous id, so it survives reinstall the
// same way the identity does. Losing it is not fatal for the user's data — only
// their pass balance would need a manual re-claim.
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_SECRET_KEY = 'sober_dailies_device_secret';

let cached: string | null = null;

export async function getDeviceSecret(): Promise<string | null> {
  if (cached) return cached;
  if (Platform.OS === 'web') return null; // no SecureStore; passes are native-only
  try {
    let secret = await SecureStore.getItemAsync(DEVICE_SECRET_KEY);
    if (!secret) {
      const bytes = await Crypto.getRandomBytesAsync(32);
      secret = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret);
    }
    cached = secret;
    return secret;
  } catch (e) {
    // Non-fatal: the caller sends no secret and the server falls back to its
    // unclaimed-id behavior rather than the app losing the feature outright.
    console.warn('[deviceSecret] unavailable', e);
    return null;
  }
}
