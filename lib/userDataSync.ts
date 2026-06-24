// User-data backup core (Phase 0 of the iCloud-sync plan). Provider-agnostic:
// it (de)serializes the user's data to/from a single JSON snapshot. The manual
// clipboard Export/Import (app/(main)/backup.tsx) uses it today; a future iCloud
// (and later Supabase/Android) transport reuses the same serialize/restore.
//
// IMPORTANT: this is an explicit ALLOWLIST of user-created data — never "sync
// everything". Device-local things (anonymous_id, caches, premium/entitlement
// flags, dev flags) are deliberately excluded so they never travel.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SYNC_KEYS: string[] = [
  // ── recovery data ──
  'sobriety_data',            // sober date
  'dailies_program',
  'dailies_completion',
  'gratitude_entries',
  'saved_gratitude_entries',
  'evening_review_entries',
  'saved_evening_review_entries',
  'spot_check_inventories',
  'journal_entries_v1',
  'my_meetings_v1',
  'reach_out_contacts_v1',
  // ── AI Sponsor (3 personas) ──
  'aa-chat-messages-supportive',
  'aa-chat-messages-salty',
  'aa-chat-messages-grace',
  'aa-chat-sponsor-type',
  // ── reading + preferences ──
  '@bigbook_v2:bookmarks',
  '@bigbook_v2:highlights',
  'READ_PROGRESS_bigbook_1e',
  'aa-bigbook-recent',
  'daily-reflection-bookmarks-v1',
  'meditation_settings',
  'sd-text-settings-v1',
  'sober_dailies_onboarding_complete',
];

export const BACKUP_SCHEMA_VERSION = 1;

export type BackupSnapshot = {
  app: 'sober-dailies';
  schemaVersion: number;
  exportedAt: number;
  data: Record<string, string>;
};

// Read the given keys (default: all allowlisted) into a JSON backup string.
export async function serializeUserData(keys: string[] = SYNC_KEYS): Promise<string> {
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) if (v != null) data[k] = v;
  const snapshot: BackupSnapshot = {
    app: 'sober-dailies',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    data,
  };
  return JSON.stringify(snapshot);
}

// Restore a backup string into AsyncStorage (overwrites the allowlisted keys
// present in the backup). Returns the count written. The app should reload after
// so each store re-reads from storage.
export async function restoreUserData(json: string, allowed: string[] = SYNC_KEYS): Promise<number> {
  let snapshot: any;
  try {
    snapshot = JSON.parse(json);
  } catch {
    throw new Error('That doesn’t look like a backup (not valid JSON).');
  }
  if (!snapshot || snapshot.app !== 'sober-dailies' || typeof snapshot.data !== 'object') {
    throw new Error('That isn’t a Sober Dailies backup.');
  }
  const entries = Object.entries(snapshot.data)
    .filter(([k, v]) => allowed.includes(k) && typeof v === 'string') as [string, string][];
  if (entries.length === 0) throw new Error('The backup had no recognizable data.');
  await AsyncStorage.multiSet(entries);
  return entries.length;
}

// How many allowlisted keys currently hold data (for the UI summary).
export async function countStoredItems(): Promise<number> {
  const pairs = await AsyncStorage.multiGet(SYNC_KEYS);
  return pairs.filter(([, v]) => v != null).length;
}

// Wipe ALL allowlisted user data on this device (a local "start fresh"). This
// clears the onboarding flag too (it's in SYNC_KEYS), so onboarding runs again.
// The app should reload afterward so every store re-initialises empty. Device-
// local keys (anonymous_id, caches, entitlements) are untouched.
export async function clearUserData(): Promise<void> {
  await AsyncStorage.multiRemove(SYNC_KEYS);
}
