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
// runtime lock/unlock is what actually governs. Re-applied on every
// Dimensions change, which is also how a fold/unfold (the app moving between
// the Duo's displays) announces itself. Guarded require: binaries without the
// native module (≤126) reject the calls — they're natively portrait-locked
// anyway, so this is a no-op there.
import { Dimensions } from 'react-native';

let ScreenOrientation: any = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}

const TABLET_MIN_DIM = 600;

export function applyDisplayOrientationRule(): void {
  if (!ScreenOrientation) return;
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) >= TABLET_MIN_DIM) {
    ScreenOrientation.unlockAsync().catch(() => {});
  } else {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }
}

// Apply now and on every display change. Called once from the app root; the
// subscription lives as long as the app, so nothing unsubscribes.
export function watchDisplayOrientationRule(): void {
  applyDisplayOrientationRule();
  Dimensions.addEventListener('change', applyDisplayOrientationRule);
}
