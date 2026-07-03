import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Stable per-device anonymous ID (a random UUID, not IDFA/IDFV — no App Tracking
 * Transparency prompt needed). Persisted in SecureStore (survives reinstalls on
 * iOS) with an AsyncStorage fallback/migration path for older installs.
 *
 * Used as the Mixpanel distinct_id (lib/analytics.ts) AND as the device identity
 * for grandfather-status checks, sobriety-date sync, feedback submissions, and
 * the sponsor API — kept independent of analytics so those keep working even if
 * Mixpanel is misconfigured or removed.
 */

const ANONYMOUS_ID_KEY = 'sober_dailies_anonymous_id';
const LEGACY_ASYNC_KEY = 'anonymous_id';

let cachedId: string | null = null;

function generateUuid(): string {
  try {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
  }
}

export async function getAnonymousId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const secureId = await SecureStore.getItemAsync(ANONYMOUS_ID_KEY).catch(() => null);
    if (secureId) {
      cachedId = secureId;
      return secureId;
    }

    const legacyId = await AsyncStorage.getItem(LEGACY_ASYNC_KEY).catch(() => null);
    if (legacyId) {
      await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, legacyId).catch(() => {});
      cachedId = legacyId;
      return legacyId;
    }

    const newId = generateUuid();
    await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, newId).catch(() => {});
    await AsyncStorage.setItem(LEGACY_ASYNC_KEY, newId).catch(() => {});
    cachedId = newId;
    return newId;
  } catch (error) {
    console.error('[anonymousId] Failed to get/generate:', error);
    const fallback = generateUuid();
    cachedId = fallback;
    return fallback;
  }
}

/** Synchronous read of whatever's already cached in memory (null before first getAnonymousId() call). */
export function getAnonymousIdSync(): string | null {
  return cachedId;
}
