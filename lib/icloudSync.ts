// iCloud sync (Phase 1) — automatic backup + restore of ALL user data (chat
// included) as one JSON file in the app's iCloud container, via
// react-native-cloud-storage (file-based, no KVS size cap; also Android-ready
// via Google Drive later). Whole-snapshot last-write-wins by the snapshot's
// embedded `exportedAt`. iOS for now. See [[icloud-sync-plan]]. Needs a rebuild.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeUserData, restoreUserData } from './userDataSync';

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

export function iCloudSupported(): boolean {
  return Platform.OS === 'ios' && !!CloudStorage;
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

// Whether iCloud is reachable / the user is signed in (for the UI). Best-effort.
export async function iCloudAvailable(): Promise<boolean> {
  if (!iCloudSupported()) return false;
  try {
    return !!(await CloudStorage.isCloudAvailable());
  } catch {
    return false;
  }
}

// Upload this device's current data to iCloud (best-effort).
export async function pushToICloud(): Promise<boolean> {
  if (!iCloudSupported()) return false;
  if (await isSyncPaused()) return false; // don't overwrite the backup mid-reset
  try {
    const json = await serializeUserData(); // whole snapshot, incl. chat
    await CloudStorage.writeFile(FILE, json);
    const at = Number(JSON.parse(json)?.exportedAt ?? Date.now());
    await AsyncStorage.setItem(LOCAL_AT, String(at));
    return true;
  } catch (e) {
    console.warn('[icloud] push failed', e);
    return false;
  }
}

// Restore from iCloud. Auto callers (launch/foreground) pass force=false: it
// restores only if the cloud copy is newer and sync isn't paused. A manual
// "Restore from iCloud" passes force=true: it bypasses the newer-than gate and
// the pause so the user can always pull the backup on demand. Returns true if
// data was restored (caller should reload the app).
export async function pullFromICloud(force = false): Promise<boolean> {
  if (!iCloudSupported()) return false;
  if (!force && (await isSyncPaused())) return false;
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
    console.warn('[icloud] pull failed', e);
    return false;
  }
}
