// iCloud sync (Phase 1) — automatic backup + restore of user data via
// NSUbiquitousKeyValueStore (react-native-icloud-kit). iOS only. Syncs
// ICLOUD_KEYS (everything except chat history, which risks the ~1 MB KVS cap)
// as one JSON blob, whole-snapshot last-write-wins by timestamp.
// See [[icloud-sync-plan]]. Requires a native rebuild to activate.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeUserData, restoreUserData, ICLOUD_KEYS } from './userDataSync';

// Defensive require: on a binary that doesn't yet include the native module
// (e.g. an OTA landing on an older build), this would otherwise throw and crash.
// Degrade to no-ops; the feature activates once the app is rebuilt with the module.
let kit: any = null;
try {
  kit = require('react-native-icloud-kit');
} catch {
  kit = null;
}
const KVS = kit?.iCloudKVS ?? null;
const CK = kit?.iCloud ?? null;

const KV_BLOB = 'sd_backup';      // the JSON snapshot of ICLOUD_KEYS
const KV_AT = 'sd_backup_at';     // its timestamp (string ms)
const LOCAL_AT = 'icloud_last_sync'; // this device's last-synced timestamp

export function iCloudSupported(): boolean {
  return Platform.OS === 'ios' && !!KVS;
}

// Whether the user is signed into iCloud (for the UI). Best-effort.
export async function iCloudAvailable(): Promise<boolean> {
  if (!iCloudSupported()) return false;
  try {
    return !!(await CK?.isAvailable?.());
  } catch {
    return false;
  }
}

// Upload this device's current data to iCloud (best-effort).
export async function pushToICloud(): Promise<boolean> {
  if (!iCloudSupported()) return false;
  try {
    const json = await serializeUserData(ICLOUD_KEYS);
    const at = Date.now();
    await KVS.set(KV_BLOB, json);
    await KVS.set(KV_AT, String(at));
    await AsyncStorage.setItem(LOCAL_AT, String(at));
    return true;
  } catch (e) {
    console.warn('[icloud] push failed', e);
    return false;
  }
}

// Restore from iCloud if the cloud copy is newer than what this device last
// synced. Returns true if data was restored (caller should reload the app).
export async function pullFromICloud(): Promise<boolean> {
  if (!iCloudSupported()) return false;
  try {
    const [cloudAt, cloudJson] = await Promise.all([KVS.get(KV_AT), KVS.get(KV_BLOB)]);
    if (!cloudAt || !cloudJson) return false;
    const localAt = Number((await AsyncStorage.getItem(LOCAL_AT)) ?? 0);
    if (Number(cloudAt) <= localAt) return false;
    await restoreUserData(cloudJson, ICLOUD_KEYS);
    await AsyncStorage.setItem(LOCAL_AT, String(cloudAt));
    return true;
  } catch (e) {
    console.warn('[icloud] pull failed', e);
    return false;
  }
}
