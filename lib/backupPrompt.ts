// One-time nudge to turn on cloud backup, shown the first time the user saves
// an entry that lands in Journey (gratitude, nightly review, spot check,
// journal).
//
// Why here and not in onboarding: at onboarding there is nothing to protect
// yet, and on Android the ask is a Google account sheet — a poor thing to put
// in front of someone who hasn't seen the app work, immediately before a
// paywall. The first saved entry is the first moment "why would I want this?"
// answers itself.
//
// It only speaks when backup is genuinely NOT happening:
//   iOS     — auto-sync to iCloud needs no setup and runs from first launch, so
//             this stays silent unless iCloud itself is unavailable on the
//             device (signed out, or iCloud Drive off), which is the one case
//             where an iPhone user really is unprotected.
//   Android — auto-sync silently no-ops until the user connects a Google
//             account once from the Backup screen, so without this prompt the
//             Drive backup feature is never discovered at all. This is the case
//             it exists for.
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { cloudBackupSupported, cloudAvailable, CLOUD_NAME } from '@/lib/cloudSync';
import { logEvent } from '@/lib/analytics';

// Also listed in userDataSync's LOCAL_RESET_KEYS, so "Clear all data & start
// over" restores the fresh-install behavior (and makes this testable twice).
const PROMPTED_KEY = 'backup_prompt_shown_v1';

// The stored flag is the durable guard, but there are two awaits between
// reading and writing it — two saves landing inside that window would both pass
// the check and stack two alerts. This latch closes it for the life of the
// process; the stored flag covers every launch after.
let promptedThisSession = false;

// Saves usually navigate away (router.back()) the moment they commit. Presenting
// an Alert mid-transition can silently fail on iOS, so let the destination
// settle first.
const SETTLE_MS = 700;

/**
 * Show the backup nudge once, if this device isn't backing up. Accepting routes
 * to the Backup screen. Safe to call after every save: it self-checks, and is a
 * no-op once shown. Never awaited by callers — a save must not wait on it.
 */
export async function maybePromptBackup(): Promise<void> {
  try {
    // Nothing to offer on a binary without the native cloud module.
    if (promptedThisSession) return;
    if (!cloudBackupSupported()) return;
    if (await AsyncStorage.getItem(PROMPTED_KEY)) return;
    // Already backing up — say nothing, and DON'T burn the one-time flag, so a
    // user who later turns iCloud off still gets told once.
    if (await cloudAvailable()) return;

    promptedThisSession = true;
    await AsyncStorage.setItem(PROMPTED_KEY, '1'); // once, even if they decline
    logEvent('backup_prompt_shown');

    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    Alert.alert(
      'Keep your journey safe',
      `What you write is saved on this device only. Turn on ${CLOUD_NAME} backup and it will survive a lost, broken, or replaced phone.`,
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => logEvent('backup_prompt_dismissed'),
        },
        {
          text: 'Set up backup',
          onPress: () => {
            logEvent('backup_prompt_accepted');
            router.push('/(main)/backup' as Href);
          },
        },
      ],
    );
  } catch {
    // A nudge is never worth breaking a save over.
  }
}
