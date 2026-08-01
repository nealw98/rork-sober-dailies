// "Where did my entry go?" — the answer, at the moment it's asked.
//
// People write something in a Journey tool, tap Save, get dropped back on
// Today, and have no idea the entry still exists (Neal, 2026-07-31). A snackbar
// was tried first and rejected: a small dark bar at the bottom just flashes and
// isn't read. This is the thing you can't miss, and it doubles as confirmation
// that the save happened.
//
// Two buttons, both post-save — the entry is already written, so neither can
// undo it. OK returns to Today, the way Save always has. View opens Journey so
// the lesson lands once and doesn't need repeating.
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';

const JOURNEY: Href = '/(main)/(tabs)/journey' as Href;

// Presenting an Alert mid-transition can silently fail on iOS, so the tools
// call this INSTEAD of navigating and let the buttons do the navigating.
export function confirmSaved(): void {
  Alert.alert(
    'Saved to your Journey',
    'Everything you write is kept in the Journey tab — open it any time to read it back.',
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
      { text: 'OK', style: 'cancel', onPress: () => router.back() },
    ],
    { cancelable: false },
  );
}
