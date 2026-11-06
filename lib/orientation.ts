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

// Which display class the last apply saw; a steer runs on phone→tablet.
let lastClass: 'phone' | 'tablet' | null = null;
let steering = false;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isTabletNow = () => {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= TABLET_MIN_DIM;
};

// Unfolding carries the cover screen's PORTRAIT over to the inner display,
// and no amount of unlocking fixes it: on the inner display iOS refuses
// programmatic orientation changes ("the current windowing mode does not
// allow…") and only honors a re-read of what the app ALLOWS — and an
// unlocked mask allows portrait, so the re-read keeps it. (The same bug and
// fix shape: Usernode-Labs/flutter-mobile-app#635/#636.) So the handoff
// steers: wait for the unfold's size churn to settle, lock to LANDSCAPE —
// a mask portrait is NOT in, which iOS must honor — and HOLD that lock
// until the window has actually turned before unlocking for free rotation.
// The previous attempt locked and unlocked back-to-back, restoring the
// portrait-friendly mask before iOS ever re-read it; the hold is the fix.
// Someone unfolding while deliberately holding portrait lands in landscape
// and is corrected by the sensor on their first movement.
async function steerToLandscape(): Promise<void> {
  if (steering || !ScreenOrientation) return;
  steering = true;
  try {
    await sleep(500); // let the fold transition settle (metrics stop churning)
    if (!isTabletNow()) return; // folded back meanwhile
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    for (let i = 0; i < 20; i++) {
      const { width, height } = Dimensions.get('window');
      if (width > height) break; // the window turned — landscape took
      if (!isTabletNow()) break; // folded back — let the rule re-lock portrait
      await sleep(100);
    }
  } catch {
  } finally {
    steering = false;
    // Back to the rule: tablet → unlock (keeping the landscape it now has),
    // phone (folded back mid-steer) → portrait.
    applyDisplayOrientationRule();
  }
}

export async function applyDisplayOrientationRule(): Promise<void> {
  if (!ScreenOrientation || suspended || steering) return;
  const cls = isTabletNow() ? 'tablet' : 'phone';
  const prev = lastClass;
  lastClass = cls;
  try {
    if (cls === 'phone') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      return;
    }
    if (prev === 'phone') {
      // The cover→inner handoff: steer instead of unlocking (see above).
      steerToLandscape();
      return;
    }
    await ScreenOrientation.unlockAsync();
  } catch {}
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
