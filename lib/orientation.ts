// Orientation policy, in one place (Neal, 2026-11-06: the unfolded Duo must
// rotate with the device).
//
// The rule: phone-class displays stay portrait — that includes every regular
// iPhone and the Duo's cover screen — while tablet-class displays (the Duo's
// unfolded inner screen, iPad) rotate freely so the app follows how the
// device is held. "Tablet-class" = the display's SHORT side is at least
// 600pt, the same threshold the wide layouts use (hooks/useLayoutMode).
//
// app.json orientation is "default" (the native shell allows landscape); this
// runtime lock/unlock is what actually governs. The rule re-applies on every
// trigger that can accompany a fold/unfold (the app moving between the Duo's
// displays), because any single one can be missed (Neal, 2026-11-06: "works
// sometimes"):
//   · Dimensions change — the normal foreground fold/unfold signal, plus a
//     delayed re-assert because the unlock can race the move itself and run
//     against the OLD display's metrics;
//   · AppState active — a fold/unfold that happens while the app is
//     backgrounded delivers no Dimensions event at all.
// Guarded require: binaries without the native module (≤126) reject the
// calls — they're natively portrait-locked anyway, so this is a no-op there.
import { AppState, Dimensions } from 'react-native';

let ScreenOrientation: any = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}

const TABLET_MIN_DIM = 600;

// While a screen holds its own orientation (the PDF reader's full-screen
// Modal unlocks rotation on phones), the rule stands aside so a background/
// foreground hop can't yank that screen back to portrait mid-read.
let suspended = false;

export function applyDisplayOrientationRule(): void {
  if (!ScreenOrientation || suspended) return;
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) >= TABLET_MIN_DIM) {
    ScreenOrientation.unlockAsync().catch(() => {});
  } else {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }
}

// The PDF reader calls these around its own unlock. Resume re-applies the
// rule, which is also what its close used to do by hand.
export function suspendOrientationRule(): void {
  suspended = true;
}
export function resumeOrientationRule(): void {
  suspended = false;
  applyDisplayOrientationRule();
}

// Apply now, then re-assert after the fold transition has settled. The Duo's
// unfold animates for around a second, and an unlock issued mid-transition
// can be evaluated against the old display (or dropped) — the trailing calls
// are the ones that actually take on a cover→inner handoff.
export function reassertDisplayOrientationRule(): void {
  applyDisplayOrientationRule();
  setTimeout(applyDisplayOrientationRule, 400);
  setTimeout(applyDisplayOrientationRule, 1200);
}

// Apply now and on every trigger above. Called once from the app root; the
// subscriptions live as long as the app, so nothing unsubscribes.
export function watchDisplayOrientationRule(): void {
  applyDisplayOrientationRule();
  Dimensions.addEventListener('change', reassertDisplayOrientationRule);
  AppState.addEventListener('change', (s) => {
    if (s === 'active') reassertDisplayOrientationRule();
  });
}
