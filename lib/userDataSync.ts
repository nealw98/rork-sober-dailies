// User-data backup core (Phase 0 of the iCloud-sync plan). Provider-agnostic:
// it (de)serializes the user's data to/from a single JSON snapshot. The manual
// clipboard Export/Import (app/(main)/backup.tsx) uses it today; a future iCloud
// (and later Supabase/Android) transport reuses the same serialize/restore.
//
// IMPORTANT: this is an explicit ALLOWLIST of user-created data — never "sync
// everything". Device-local things (caches, premium/entitlement flags, dev
// flags) are deliberately excluded so they never travel.
//
// The one intentional identity exception is `anonymous_id` (carried in the
// snapshot's top-level `identity` field, NOT in `data`): it's what maps a device
// to its server-side gift wallet, grandfather status, and synced data, so it
// must follow the user across a reinstall / new device. It's SecureStore-backed,
// so restore adopts it via adoptAnonymousId() rather than a plain AsyncStorage
// write. See the Pass It On wallet-portability decision.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnonymousId, adoptAnonymousId } from './anonymousId';

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
  'sponsor_contact_v1',
  'speaker_favorites_v1',
  'speaker_progress_v1',
  // ── AI Sponsor (3 personas) ──
  'aa-chat-messages-supportive',
  'aa-chat-messages-salty',
  'aa-chat-messages-grace',
  'aa-chat-sponsor-type',
  // ── reading + preferences ──
  '@bigbook_v2:bookmarks',
  '@bigbook_v2:highlights',
  'pdf_bookmarks_v1',
  'READ_PROGRESS_bigbook_1e',
  'aa-bigbook-recent',
  'daily-reflection-bookmarks-v1',
  'meditation_settings',
  'sd-text-settings-v1',
  'sober_dailies_onboarding_complete',      // legacy (v2) flag — written, never read
  'sober_dailies_onboarding_v3_complete',   // the flag the v3 gate actually reads
  // ── Pass It On ──
  // Private, local-only gift fields. The gift CODES live in Supabase and
  // re-sync from the adopted identity, so they aren't backed up here; the
  // notes ("who's this for") and shared-timestamps exist only on-device and
  // would otherwise be lost.
  'gift_notes_v1',
  'gift_shared_v1',
];

const LOCAL_RESET_KEYS: string[] = [
  'today_edit_tip_pending',
  'today_edit_tip_seen',
  'aa-last-opened-sponsor',
  'backup_prompt_shown_v1', // one-time nudge — "start fresh" should mean fresh
  // Pass-arrival high-water mark. Clearing it re-baselines silently on the next
  // status call, so a reset can't manufacture a phantom "passes arrived" sheet.
  'gift_granted_seen_v1',
  'gift_arrival_pending_v1',
];

export const BACKUP_SCHEMA_VERSION = 1;

export type BackupSnapshot = {
  app: 'sober-dailies';
  schemaVersion: number;
  exportedAt: number;
  data: Record<string, string>;
  identity?: string; // anonymous_id — see the allowlist note above
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
    identity: await getAnonymousId(),
  };
  return JSON.stringify(snapshot);
}

// Restore a backup string into AsyncStorage (overwrites the allowlisted keys
// present in the backup). Returns the count written. The app should reload after
// so each store re-reads from storage — that reload is also what makes the
// adopted identity take hold cleanly.
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
  const hasIdentity = typeof snapshot.identity === 'string' && snapshot.identity.trim().length > 0;
  const entries = Object.entries(snapshot.data)
    .filter(([k, v]) => allowed.includes(k) && typeof v === 'string') as [string, string][];
  // A valid snapshot carries data in practice; guard only truly empty input.
  if (entries.length === 0 && !hasIdentity) throw new Error('The backup had no recognizable data.');

  // Adopt the identity FIRST so it's in place before the app reloads and starts
  // re-fetching identity-scoped data (the gift wallet, grandfather status).
  if (hasIdentity) await adoptAnonymousId(snapshot.identity);
  if (entries.length) await AsyncStorage.multiSet(entries);
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
  await AsyncStorage.multiRemove([...SYNC_KEYS, ...LOCAL_RESET_KEYS]);
}
