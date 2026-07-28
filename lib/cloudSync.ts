// Cloud sync — automatic backup + restore of ALL user data (chat included) as
// one JSON file in the user's own private cloud, via react-native-cloud-storage
// (file-based, no KVS size cap). iOS = the app's iCloud container (no sign-in);
// Android = Google Drive's hidden appDataFolder (Google sign-in once, from the
// Backup screen — see lib/googleDriveAuth.ts). Whole-snapshot last-write-wins
// by the snapshot's embedded `exportedAt`. See [[icloud-sync-plan]].
// (Formerly lib/icloudSync.ts; the AsyncStorage keys keep their icloud_ names
// so existing iOS installs don't lose their sync state.)
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeUserData, restoreUserData } from './userDataSync';
import { getDriveAccessToken, driveAuthSupported } from './googleDriveAuth';

// Defensive require: on a binary without the native module (e.g. an OTA onto an
// older build) this would throw and crash — degrade to no-ops instead. The
// feature activates once the app is rebuilt with the module.
let CloudStorage: any = null;
try {
  CloudStorage = require('react-native-cloud-storage').CloudStorage;
} catch {
  CloudStorage = null;
}

const FILE = '/sober-dailies-backup.json';
const LOCAL_AT = 'icloud_last_sync'; // this device's last-synced snapshot timestamp
const PAUSED = 'icloud_sync_paused'; // set during a local "clear all data" reset

// User-facing name of this platform's cloud ("iCloud" / "Google Drive").
export const CLOUD_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

export function cloudBackupSupported(): boolean {
  if (!CloudStorage) return false;
  if (Platform.OS === 'ios') return true;
  // Android Google Drive backup: OAuth is live (2026-07-27) in the
  // "sober-dailies" Google Cloud project under soberdailies@gmail.com —
  // Android clients registered for both the Play app-signing and EAS upload
  // SHA-1s, drive.appdata scope (non-sensitive), consent screen in
  // production. Supported whenever the binary has the native module.
  return driveAuthSupported();
}

// Ready the provider for a call. iOS needs nothing; Android must set a fresh
// Drive access token first. Auto sync passes interactive=false so it silently
// no-ops until the user has connected a Google account once.
async function prepareProvider(interactive: boolean): Promise<boolean> {
  if (!cloudBackupSupported()) return false;
  if (Platform.OS === 'ios') return true;
  const token = await getDriveAccessToken(interactive);
  if (!token) return false;
  CloudStorage.setProviderOptions({ accessToken: token });
  return true;
}

// While paused, auto push/pull no-op. Used by "Clear all data" so the reset
// can't (a) clobber the cloud backup with an empty snapshot on the next
// background, or (b) get instantly re-restored by the launch/foreground pull.
// A manual restore or backup clears it. Plain AsyncStorage so it works even on
// a build without the native module.
export async function isSyncPaused(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(PAUSED)) === '1'; } catch { return false; }
}
export async function setSyncPaused(paused: boolean): Promise<void> {
  try {
    if (paused) await AsyncStorage.setItem(PAUSED, '1');
    else await AsyncStorage.removeItem(PAUSED);
  } catch { /* ignore */ }
}

// Whether the cloud is reachable (iCloud signed in / Google account connected).
// Best-effort, for the UI.
export async function cloudAvailable(): Promise<boolean> {
  if (!cloudBackupSupported()) return false;
  try {
    if (Platform.OS === 'ios') return !!(await CloudStorage.isCloudAvailable());
    return !!(await getDriveAccessToken(false));
  } catch {
    return false;
  }
}

// Upload this device's current data to the cloud (best-effort). A manual
// "Back up now" passes interactive=true so Android can show the account picker.
export async function pushToCloud(interactive = false): Promise<boolean> {
  if (await isSyncPaused()) return false; // don't overwrite the backup mid-reset
  if (!(await prepareProvider(interactive))) return false;
  try {
    const json = await serializeUserData(); // whole snapshot, incl. chat
    await CloudStorage.writeFile(FILE, json);
    const at = Number(JSON.parse(json)?.exportedAt ?? Date.now());
    await AsyncStorage.setItem(LOCAL_AT, String(at));
    return true;
  } catch (e) {
    console.warn('[cloudSync] push failed', e);
    return false;
  }
}

// Restore from the cloud. Auto callers (launch/foreground) pass force=false: it
// restores only if the cloud copy is newer and sync isn't paused. A manual
// "Restore" passes force=true: it bypasses the newer-than gate and the pause so
// the user can always pull the backup on demand (and, on Android, may sign in
// interactively). Returns true if data was restored (caller should reload).
export async function pullFromCloud(force = false): Promise<boolean> {
  if (!force && (await isSyncPaused())) return false;
  if (!(await prepareProvider(force))) return false;
  try {
    if (!(await CloudStorage.exists(FILE))) return false;
    const json = await CloudStorage.readFile(FILE);
    if (!json) return false;
    const cloudAt = Number(JSON.parse(json)?.exportedAt ?? 0);
    const localAt = Number((await AsyncStorage.getItem(LOCAL_AT)) ?? 0);
    if (!force && cloudAt <= localAt) return false;
    await restoreUserData(json); // all allowlisted keys
    await AsyncStorage.setItem(LOCAL_AT, String(cloudAt));
    await setSyncPaused(false); // a successful restore resumes normal sync
    return true;
  } catch (e) {
    console.warn('[cloudSync] pull failed', e);
    return false;
  }
}
