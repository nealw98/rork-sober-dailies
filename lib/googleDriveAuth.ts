// Google Drive auth (Android cloud backup). Thin wrapper around
// @react-native-google-signin/google-signin that yields an OAuth access token
// with the drive.appdata scope — react-native-cloud-storage's Google Drive
// provider (pure JS/REST) consumes it via setProviderOptions. Play Services
// handles token caching/refresh; signInSilently() is cheap to call per sync.
// Counterpart of the iOS iCloud container (no token needed there).
import { Platform } from 'react-native';

// Defensive require, same pattern as lib/cloudSync.ts: on a binary without the
// native module (e.g. an OTA onto an older build) this would crash — degrade
// to "unsupported" instead. Activates once the app is rebuilt with the module.
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  GoogleSignin = null;
}

// Drive's hidden per-app data folder — not visible in the user's Drive files.
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

let configured = false;
function ensureConfigured(): boolean {
  if (!GoogleSignin) return false;
  if (!configured) {
    try {
      // No webClientId: we only need access tokens (not idToken/server auth),
      // which Play Services grants against the Android OAuth client registered
      // for this package name + signing SHA-1 in Google Cloud Console.
      GoogleSignin.configure({ scopes: SCOPES });
      configured = true;
    } catch (e) {
      console.warn('[driveAuth] configure failed', e);
      return false;
    }
  }
  return true;
}

export function driveAuthSupported(): boolean {
  return Platform.OS === 'android' && !!GoogleSignin;
}

// Has the user connected a Google account before? (No network.)
export async function isDriveSignedIn(): Promise<boolean> {
  if (!driveAuthSupported() || !ensureConfigured()) return false;
  try { return !!(await GoogleSignin.hasPreviousSignIn()); } catch { return false; }
}

export async function getDriveAccountEmail(): Promise<string | null> {
  if (!driveAuthSupported() || !ensureConfigured()) return null;
  try { return (await GoogleSignin.getCurrentUser())?.user?.email ?? null; } catch { return null; }
}

// Serialize token requests. The native module services ONE getTokens() at a
// time and rejects any overlapping call outright ("previous promise did not
// settle and was overwritten"), which surfaced to the user as a bogus "sign-in
// did not complete" on the very first connect. The overlap is structural, not a
// rare race: the account picker is its own activity, so opening it backgrounds
// the app and closing it foregrounds it — firing use-cloud-sync's background
// push and foreground pull on either side of the interactive request that's
// still in flight. Chaining makes them queue instead of clobbering each other.
let tokenQueue: Promise<unknown> = Promise.resolve();

// Get a fresh access token. Auto sync passes interactive=false (silent only —
// no-ops until the user has connected once); the Backup screen's "Connect"
// passes interactive=true to show the account picker.
export function getDriveAccessToken(interactive: boolean): Promise<string | null> {
  const run = tokenQueue.then(
    () => requestDriveAccessToken(interactive),
    () => requestDriveAccessToken(interactive), // a failed predecessor must not skip us
  );
  tokenQueue = run.catch(() => null); // never let a rejection poison the queue
  return run;
}

async function requestDriveAccessToken(interactive: boolean): Promise<string | null> {
  if (!driveAuthSupported() || !ensureConfigured()) return null;
  try {
    let signedIn = false;
    try {
      const r = await GoogleSignin.signInSilently();
      signedIn = r?.type !== 'noSavedCredentialFound';
    } catch { signedIn = false; }
    if (!signedIn) {
      if (!interactive) return null;
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const r = await GoogleSignin.signIn();
      if (r?.type === 'cancelled') return null;
    }
    const t = await GoogleSignin.getTokens();
    return t?.accessToken ?? null;
  } catch (e) {
    console.warn('[driveAuth] token failed', e);
    return null;
  }
}

// Disconnect: stop auto sync to Drive on this device (the backup file itself
// stays in the account's hidden app data until the user removes app access).
export async function signOutDrive(): Promise<void> {
  if (!driveAuthSupported() || !ensureConfigured()) return;
  try { await GoogleSignin.signOut(); } catch { /* ignore */ }
}
