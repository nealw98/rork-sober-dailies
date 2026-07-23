// Disclaimer acceptance — local record + server sync.
//
// The onboarding disclaimer step (safety bullets + 988 + Terms/Privacy
// checkbox) calls recordDisclaimerAcceptance() on Continue. The acceptance is
// written locally first (source of truth for "did this device accept"), then
// synced to the disclaimer_acceptances table keyed by the same anonymous_id
// used everywhere else. Sync is best-effort with retry: if the accept-time
// call fails (offline onboarding), ensureDisclaimerSynced() — run on app
// start — keeps retrying until the server confirms. The server keeps the
// FIRST accepted_at per (device, version), so retries can't rewrite history.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

// Bump when the disclaimer content changes materially — a new version means
// users accept again (enforcement of re-acceptance is a future decision; the
// version recorded is what matters today).
export const DISCLAIMER_VERSION = '1-2026-07-22';

const ACCEPTED_KEY = 'disclaimer_accepted_v1'; // ISO timestamp of acceptance
const SYNCED_KEY = 'disclaimer_synced_v1';     // set once the server confirmed

async function syncToServer(acceptedAt: string): Promise<boolean> {
  try {
    const anonymous_id = await getAnonymousId();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/disclaimer-accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anonymous_id,
        version: DISCLAIMER_VERSION,
        accepted_at: acceptedAt,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? null,
      }),
    });
    const data = await res.json().catch(() => null);
    if (data?.success) {
      await AsyncStorage.setItem(SYNCED_KEY, '1').catch(() => {});
      return true;
    }
  } catch (e) {
    console.warn('[disclaimer] sync failed (will retry on next launch)', e);
  }
  return false;
}

// Gate check for the root layout: has this device ever accepted? (Version
// bumps don't reset this today — see DISCLAIMER_VERSION note above.)
export async function hasAcceptedDisclaimer(): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(ACCEPTED_KEY));
  } catch {
    // Storage read failed — don't lock the user out of an app they may have
    // already accepted on; the next launch re-checks.
    return true;
  }
}

// Called from the onboarding disclaimer step's Continue. Local write is
// awaited (the legal record on-device); the server sync fires without
// blocking the user's entry into the app.
export async function recordDisclaimerAcceptance(): Promise<void> {
  const acceptedAt = new Date().toISOString();
  await AsyncStorage.setItem(ACCEPTED_KEY, acceptedAt).catch(() => {});
  void syncToServer(acceptedAt);
}

// App-start retry: if this device accepted but the server never confirmed
// (offline at onboarding, function briefly down), push it up now. No-op in
// the common case of one AsyncStorage read.
export async function ensureDisclaimerSynced(): Promise<void> {
  try {
    const [acceptedAt, synced] = await Promise.all([
      AsyncStorage.getItem(ACCEPTED_KEY),
      AsyncStorage.getItem(SYNCED_KEY),
    ]);
    if (!acceptedAt || synced) return;
    await syncToServer(acceptedAt);
  } catch {
    // next launch tries again
  }
}
