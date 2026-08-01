// "Where did my entry go?" — the answer, at the moment it's asked.
//
// People write something in a Journey tool, tap Save, get dropped back on
// Today, and have no idea the entry still exists (Neal, 2026-07-31). A snackbar
// was tried first and rejected: a small dark bar at the bottom just flashes and
// isn't read. This is the thing you can't miss, and it doubles as confirmation
// that the save happened. Title only: the entry is saved, and it's in Journey —
// a sentence explaining that at length just makes it something to dismiss.
//
// Two buttons, both post-save — the entry is already written, so neither can
// undo it. OK returns to Today, the way Save always has. View opens Journey so
// the lesson lands once and doesn't need repeating.
//
// The one-time backup nudge is fired AFTER this one rather than instead of it
// (Neal, 2026-07-31): it only ever shows once, so it shouldn't cost a user the
// explanation of where their entry went. It self-guards and waits for the
// destination to settle, so it queues behind this dialog rather than stacking.
//
// It fires on the OK path only — the one that lands back on Today. Tapping View
// means the user is going to read their entry, which is the wrong moment to
// interrupt with a backup pitch; the nudge is one-time and self-guarding, so it
// simply waits for a later save.
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import { maybePromptBackup } from './backupPrompt';

const JOURNEY: Href = '/(main)/(tabs)/journey' as Href;

// Presenting an Alert mid-transition can silently fail on iOS, so the tools
// call this INSTEAD of navigating and let the buttons do the navigating.
export function confirmSaved(): void {
  // Title only — the sentence said nothing the title didn't (Neal, 2026-07-31).
  Alert.alert(
    'Saved to your Journey',
    undefined,
    [
      {
        text: 'View',
        onPress: () => {
          // Leave the tool first, then land on the tab, so Journey doesn't end
          // up stacked underneath the screen the user just finished with.
          router.back();
          setTimeout(() => router.push(JOURNEY), 240);
        },
      },
      {
        text: 'OK',
        style: 'cancel',
        // Back on Today, then the nudge — maybePromptBackup waits for the
        // destination to settle, so it appears there rather than mid-transition.
        onPress: () => { router.back(); maybePromptBackup(); },
      },
    ],
    { cancelable: false },
  );
}
