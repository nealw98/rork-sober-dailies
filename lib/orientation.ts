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
// runtime lock/unlock is what actually governs on phones. The inner display
// is different, and everything in steerToLandscape below exists because of
// three facts confirmed across Apple's Duo tech talk, Apple DTS answers,
// Unity's SDK-27 testing, and the fold-handoff fixes in other projects
// (Usernode-Labs/flutter-mobile-app#636, react-native-orientation-director#116):
//   1. Unfolding emits NO device-rotation event. iOS rotates apps on rotation
//      events, so the cover screen's portrait is carried over and simply
//      stays, even though the inner display would rotate freely.
//   2. The inner display refuses programmatic orientation changes
//      ("the current windowing mode does not allow…") and ignores the app's
//      declared orientation masks. The ONLY nudge that still lands is the
//      synthesized device-rotation that expo-screen-orientation's lockAsync
//      sends natively — and only once the fold transition has settled, which
//      takes an unpredictable amount of time.
//   3. expo's unlockAsync re-asserts the CURRENT orientation natively. Called
//      while the handoff is still stuck in portrait, it actively re-pins
//      portrait. So while a handoff is unresolved we must never unlock; we
//      hold the landscape-only lock and keep nudging until the window has
//      actually turned, then unlock for free rotation.
// The previous version gave the steer one 2.5-second shot and then unlocked
// regardless — when iOS settled slower than that, the unlock re-pinned
// portrait and every later trigger kept re-pinning it (Neal, 2026-11-06:
// "worked a couple times but then not"). Now the steer is a bounded
// retry loop driven by the same triggers, and it only ends in unlock once
// landscape has landed or the window expires into free rotation.
//
// Triggers that re-apply the rule (any single one can be missed, so all run):
//   · Dimensions change — the normal foreground fold/unfold signal, plus a
//     delayed re-assert because events during the transition can be dropped;
//   · AppState active — a fold/unfold that happens while the app is
//     backgrounded delivers no Dimensions event at all;
//   · SideInsetGuard onLayout — the root view re-laying out.
// Guarded require: binaries without the native module (≤126) reject the
// calls — they're natively portrait-locked anyway, so this is a no-op there.
import { AppState, Dimensions, Platform } from 'react-native';

import { getAnonymousIdSync } from '@/lib/anonymousId';

let ScreenOrientation: any = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}

const TABLET_MIN_DIM = 600;

// --- Field diagnostics (Neal, 2026-11-06: fold handoff still intermittent on
// hardware; the sim can't fold, so the device itself must tell us what it
// sees). Posts straight to Mixpanel — deliberately NOT through lib/analytics,
// whose Developer Mode switch drops every event on Neal's own phone, the one
// device we need to hear from. Remove this block once the handoff is solid.
const DIAG_VERSION = 'v6';
const DIAG_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';
const diagT0 = Date.now();
function diag(step: string, extra?: Record<string, unknown>): void {
  const s = Dimensions.get('screen');
  const w = Dimensions.get('window');
  const props = {
    step,
    v: DIAG_VERSION,
    t_ms: Date.now() - diagT0,
    sw: Math.round(s.width), sh: Math.round(s.height),
    ww: Math.round(w.width), wh: Math.round(w.height),
    cls: isTabletNow() ? 'tablet' : 'phone',
    prev: lastClass,
    steer_left_ms: steerUntil ? Math.max(0, steerUntil - Date.now()) : 0,
    steering,
    suspended,
    os: String(Platform.Version),
    ...extra,
  };
  try { console.log('[orientation]', JSON.stringify(props)); } catch {}
  if (!DIAG_TOKEN) return;
  try {
    fetch('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify([{
        event: 'duo_orientation_debug',
        properties: {
          token: DIAG_TOKEN,
          distinct_id: getAnonymousIdSync() ?? 'unknown',
          time: Date.now(),
          $insert_id: `orient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...props,
        },
      }]),
    }).catch(() => {});
  } catch {}
}

// How long after a cover→inner handoff we keep nudging toward landscape
// before giving up into free rotation (a physical rotation then fixes it).
// Also the window in which someone deliberately unfolding in portrait gets
// steered to landscape; the sensor corrects them on their first movement.
const STEER_WINDOW_MS = 20000;
// Pause between landscape nudges while waiting for one to take.
const STEER_RETRY_MS = 1200;

// While a screen holds its own orientation (the PDF reader's full-screen
// Modal unlocks rotation on phones), the rule stands aside so a background/
// foreground hop can't yank that screen back to portrait mid-read.
let suspended = false;

// Which display class the last apply saw; a steer starts on phone→tablet.
let lastClass: 'phone' | 'tablet' | null = null;
let steering = false;
// Set on the phone→tablet handoff; cleared when landscape lands, the steer
// window expires, or the device folds back. While set and the window is
// still portrait, every trigger re-enters the steer instead of unlocking.
let steerUntil = 0;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isTabletNow = () => {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= TABLET_MIN_DIM;
};
const isWindowLandscape = () => {
  const { width, height } = Dimensions.get('window');
  return width > height;
};
// The Duo's cover screen is uniquely squat (~466×678pt); regular iPhones are
// all narrower and taller. Used to scope cover-only behavior so ordinary
// phones never see it.
const looksLikeDuoCover = () => {
  const { width, height } = Dimensions.get('screen');
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return short >= 440 && short <= 520 && long >= 600 && long <= 740;
};

async function steerToLandscape(): Promise<void> {
  if (steering || !ScreenOrientation) return;
  steering = true;
  diag('steer_start');
  try {
    await sleep(500); // let the fold transition's size churn settle
    // Cycle the lock target between retries. Telemetry (2026-11-08) showed
    // repeated identical LANDSCAPE locks all "succeeding" while iOS ignored
    // them for 5–16s: a repeat of the current mask is a no-op, and only a
    // CHANGE re-triggers the synthesized rotation. Every mask here is
    // landscape-only, so portrait never flashes.
    const targets = [
      ScreenOrientation.OrientationLock.LANDSCAPE,
      ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
      ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
    ];
    const targetNames = ['L', 'LR', 'LL'];
    let attempt = 0;
    while (isTabletNow() && !isWindowLandscape() && Date.now() < steerUntil) {
      // Landscape-only lock: portrait is NOT in the mask, and the native
      // enforce sends a synthesized landscape rotation. Re-sent every pass
      // because nudges fired before iOS settles are silently dropped.
      const pick = attempt % targets.length;
      attempt += 1;
      try {
        await ScreenOrientation.lockAsync(targets[pick]);
        diag('steer_lock_ok', { m: targetNames[pick] });
      } catch (e: any) {
        diag('steer_lock_err', { m: targetNames[pick], err: String(e?.message ?? e).slice(0, 200) });
      }
      for (let i = 0; i < STEER_RETRY_MS / 100; i++) {
        if (isWindowLandscape() || !isTabletNow()) break;
        await sleep(100);
      }
    }
  } catch {
  } finally {
    diag('steer_end', { landed: isWindowLandscape() });
    if (isWindowLandscape() || !isTabletNow() || Date.now() >= steerUntil) {
      steerUntil = 0; // resolved (or expired): back to the plain rule
    }
    steering = false;
    // Tablet + landscape → unlock (free rotation, keeping the landscape it
    // now has); folded back mid-steer → the rule re-locks portrait.
    applyDisplayOrientationRule('steer_end');
  }
}

export async function applyDisplayOrientationRule(trigger?: unknown): Promise<void> {
  if (!ScreenOrientation || suspended || steering) return;
  const trig = typeof trigger === 'string' ? trigger : 'unspecified';
  const cls = isTabletNow() ? 'tablet' : 'phone';
  const prev = lastClass;
  lastClass = cls;
  try {
    if (cls === 'phone') {
      steerUntil = 0;
      diag('apply_lock_portrait', { trig });
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      return;
    }
    if (prev === 'phone') {
      // The cover→inner handoff: open the steer window and start nudging.
      steerUntil = Date.now() + STEER_WINDOW_MS;
      diag('apply_handoff', { trig });
      steerToLandscape();
      return;
    }
    if (steerUntil > 0 && !isWindowLandscape()) {
      if (Date.now() < steerUntil) {
        // Handoff still unresolved: a new trigger re-enters the steer.
        // Never unlock here — unlock would natively re-pin portrait.
        diag('apply_resteer', { trig });
        steerToLandscape();
        return;
      }
      steerUntil = 0; // window expired: fall through to free rotation
    }
    steerUntil = 0;
    diag('apply_unlock', { trig });
    await ScreenOrientation.unlockAsync();
  } catch (e: any) {
    diag('apply_err', { trig, err: String(e?.message ?? e).slice(0, 200) });
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
// unfold animates for around a second, and a call issued mid-transition can
// be evaluated against the old display (or dropped) — the trailing calls
// are the ones that actually take on a cover→inner handoff.
export function reassertDisplayOrientationRule(trigger?: unknown): void {
  const trig = typeof trigger === 'string' ? trigger : 'layout';
  applyDisplayOrientationRule(trig);
  setTimeout(() => applyDisplayOrientationRule(`${trig}+400`), 400);
  setTimeout(() => applyDisplayOrientationRule(`${trig}+1200`), 1200);
}

// Apply now and on every trigger above. Called once from the app root; the
// subscriptions live as long as the app, so nothing unsubscribes.
export function watchDisplayOrientationRule(): void {
  diag('watch_start');
  applyDisplayOrientationRule('startup');
  Dimensions.addEventListener('change', () => reassertDisplayOrientationRule('dimensions'));
  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      reassertDisplayOrientationRule('appstate_active');
      return;
    }
    // Leaving the foreground on the Duo's COVER screen is, as often as not,
    // the start of an unfold — and a portrait lock that is still asserted
    // when the scene moves to the inner display is what gets carried over
    // and stuck there (the inner display refuses to change it afterwards).
    // So release the hold on the way out; the rule re-locks portrait the
    // moment the app is active on a phone-class display again. Scoped to
    // the cover's distinctive size so ordinary iPhones keep their lock.
    if ((s === 'inactive' || s === 'background') && looksLikeDuoCover() && !suspended && ScreenOrientation) {
      diag('cover_release', { appstate: s });
      ScreenOrientation.unlockAsync().catch(() => {});
    }
  });
}
