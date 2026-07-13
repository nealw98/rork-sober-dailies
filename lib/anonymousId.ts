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

/**
 * Adopt an anonymous ID carried in a restored backup (iCloud/Drive/manual), so
 * the user's identity — and therefore their gift wallet, grandfather status,
 * and synced data — follows them to a new device or survives a reinstall.
 *
 * getAnonymousId() reads SecureStore FIRST, so a restore that only wrote the
 * AsyncStorage mirror would be ignored. This writes SecureStore (the winner),
 * refreshes the mirror, and updates the in-memory cache. The app reloads after
 * a restore, so the reloaded session reads the adopted ID cleanly.
 *
 * No-ops on an empty/blank value or if it already matches the current ID.
 */
export async function adoptAnonymousId(id: string): Promise<void> {
  const next = (id || '').trim();
  if (!next || next === cachedId) return;
  cachedId = next;
  await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, next).catch(() => {});
  await AsyncStorage.setItem(LEGACY_ASYNC_KEY, next).catch(() => {});
}
