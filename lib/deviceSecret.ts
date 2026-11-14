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
//
// It also travels with the identity in the user's backup (lib/userDataSync.ts):
// a second device that adopts the id from iCloud must present the SAME secret,
// or the server turns away every AI call from it. Only a secret the server has
// accepted for the current id is backed up, so a device holding a rejected one
// can never push it over the good one.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_SECRET_KEY = 'sober_dailies_device_secret';
// The anonymous id the server last accepted this secret for.
const VERIFIED_FOR_KEY = 'sober_dailies_device_secret_verified_for';

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

// Call after any response from a function that checks the device (2xx means
// the secret was accepted for this id).
export async function markDeviceSecretVerified(anonymousId: string | null): Promise<void> {
  if (!anonymousId) return;
  await AsyncStorage.setItem(VERIFIED_FOR_KEY, anonymousId).catch(() => {});
}

// The secret to put in a backup alongside `anonymousId`, or null when the
// server hasn't accepted this secret for that id.
export async function getVerifiedDeviceSecret(anonymousId: string): Promise<string | null> {
  const verifiedFor = await AsyncStorage.getItem(VERIFIED_FOR_KEY).catch(() => null);
  if (verifiedFor !== anonymousId) return null;
  return getDeviceSecret();
}

// Take over the secret that came with an adopted identity. It was accepted for
// that id on the device that backed it up, so it counts as verified here.
export async function adoptDeviceSecret(secret: string, anonymousId: string): Promise<void> {
  if (Platform.OS === 'web' || secret.length < 32) return;
  try {
    await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret);
    cached = secret;
    await AsyncStorage.setItem(VERIFIED_FOR_KEY, anonymousId);
  } catch (e) {
    console.warn('[deviceSecret] adopt failed', e);
  }
}
