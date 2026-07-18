import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import type * as ExpoStoreReviewModule from 'expo-store-review';
import { firstUseAt } from '@/lib/growthPrompts';

/**
 * Review Prompt System
 *
 * Two layers, so the native store-review card only ever appears to an engaged
 * user right after a positive moment (biasing toward happy reviews):
 *
 *  1. GATE (eligibility): >= 15 days since first use (no review ask in a new
 *     user's first two weeks), AND >= 50 dailies completed in total (the core
 *     loop became a habit — chosen over notebook/speaker/literature signals
 *     because it's persona-neutral), AND the 30-day cooldown has passed.
 *     Deliberately NOT part of the growth-nudge schedule (lib/growthPrompts.ts)
 *     — a review ask isn't direct promotion.
 *  2. TRIGGERS (positive moments): each calls maybeAskForReview(), which
 *     re-checks the gate. The first trigger AFTER the gate is met presents the
 *     card. Triggers fire on wins only — all dailies done, meditation/speaker/
 *     Big Book session finished, Daily Reflection viewed — never on struggle,
 *     crisis, or errors.
 *
 * The OS throttles further on top (iOS ~3x/yr, Android quota), so even eligible
 * users see it rarely. "Fires" here means "we asked the OS"; the OS decides
 * whether to actually show the card.
 */

export type ReviewTrigger =
  | 'allDailies'
  | 'dailyReflection'
  | 'literature'
  | 'meditation'
  | 'speaker'
  | 'manualRate';

const STORAGE_KEYS = {
  COMPLETIONS_TOTAL: 'reviewPrompt:dailyCompletionsTotal',
  LITERATURE_SECONDS: 'reviewPrompt:literatureSeconds',
  LAST_PROMPT: 'reviewPrompt:lastPromptDate',
} as const;

// Gate thresholds — EITHER engagement signal qualifies:
//  • 50 lifetime daily check-offs (the core loop became a habit), OR
//  • an hour of cumulative literature reading (the reader is the app's most
//    comparative surface — a user an hour into our Big Book has seen the
//    competition and stayed).
const MIN_TOTAL_COMPLETIONS = 50;
const MIN_LITERATURE_SECONDS = 60 * 60;
const MIN_DAYS_SINCE_FIRST_USE = 15;          // no review ask in the first two weeks
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30-day cooldown between prompts

let storeReviewModule: typeof ExpoStoreReviewModule | null | undefined;
let storeReviewPromise: Promise<typeof ExpoStoreReviewModule | null> | null = null;

async function getStoreReviewModule(): Promise<typeof ExpoStoreReviewModule | null> {
  if (storeReviewModule !== undefined) {
    return storeReviewModule;
  }

  if (!storeReviewPromise) {
    storeReviewPromise = (async () => {
      try {
        const nativeModule =
          (NativeModulesProxy as Record<string, unknown>).ExpoStoreReview ??
          (NativeModules as Record<string, unknown>).ExpoStoreReview;

        if (!nativeModule) {
          console.warn('[reviewPrompt] expo-store-review native module missing');
          storeReviewModule = null;
          return null;
        }

        const mod = await import('expo-store-review');
        storeReviewModule = mod;
        console.log('[reviewPrompt] StoreReview module loaded');
        return mod;
      } catch (error) {
        console.warn('[reviewPrompt] expo-store-review module not available', error);
        storeReviewModule = null;
        return null;
      }
    })();
  }

  return storeReviewPromise;
}

// Storage helpers
async function getCompletionsTotal(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETIONS_TOTAL);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function getLastPromptTimestamp(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPT);
    if (!raw) return null;
    const timestamp = Number(raw);
    if (Number.isFinite(timestamp)) return timestamp;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  } catch {
    return null;
  }
}

async function setLastPromptTimestamp(date: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT, String(date.getTime()));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to persist last prompt timestamp', error);
  }
}

async function recordPromptShown(): Promise<void> {
  await setLastPromptTimestamp(new Date());
}

async function getLiteratureSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LITERATURE_SECONDS);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

// Gate checks
async function hasUsageThreshold(): Promise<boolean> {
  const [total, litSeconds] = await Promise.all([getCompletionsTotal(), getLiteratureSeconds()]);
  const ok = total >= MIN_TOTAL_COMPLETIONS || litSeconds >= MIN_LITERATURE_SECONDS;
  console.log(
    '[reviewPrompt] engagement gate:', total, '/', MIN_TOTAL_COMPLETIONS, 'completions,',
    Math.round(litSeconds / 60), '/', MIN_LITERATURE_SECONDS / 60, 'lit minutes', ok ? '✓' : '✗',
  );
  return ok;
}

async function hasTenure(): Promise<boolean> {
  const first = await firstUseAt();
  // No first-use record (growth store hasn't run yet) counts as brand-new.
  if (first == null) return false;
  return Date.now() - first >= MIN_DAYS_SINCE_FIRST_USE * 24 * 60 * 60 * 1000;
}

async function hasCooldownExpired(): Promise<boolean> {
  const lastPrompt = await getLastPromptTimestamp();
  if (!lastPrompt) return true;
  return Date.now() - lastPrompt >= COOLDOWN_MS;
}

async function presentStoreReview(): Promise<boolean> {
  const StoreReview = await getStoreReviewModule();
  if (!StoreReview) {
    console.log('[reviewPrompt] native module unavailable');
    return false;
  }

  try {
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      console.warn('[reviewPrompt] StoreReview.hasAction returned false');
      return false;
    }

    console.log('[reviewPrompt] showing native review dialog');
    await StoreReview.requestReview();
    await recordPromptShown();
    return true;
  } catch (error) {
    console.warn('[reviewPrompt] Unable to present store review', error);
    return false;
  }
}

// Public API

/**
 * Record one completed daily (called on each OFF→ON check-off). Counts toward
 * the >= 50 lifetime-completions eligibility gate.
 */
export async function recordDailyCompletionDay(): Promise<void> {
  try {
    const total = (await getCompletionsTotal()) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETIONS_TOTAL, String(total));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record completion', error);
  }
}

/**
 * Accumulate reading time from the literature screens (called with each
 * session's duration by useScreenTimeTracking). Counts toward the 1-hour
 * literature path of the eligibility gate.
 */
export async function recordLiteratureSeconds(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  try {
    const total = (await getLiteratureSeconds()) + Math.floor(seconds);
    await AsyncStorage.setItem(STORAGE_KEYS.LITERATURE_SECONDS, String(total));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record literature time', error);
  }
}

/**
 * Called from a positive moment. Presents the native review card only if the
 * gate (>= 5 completion days) and the 30-day cooldown both pass. Safe to call
 * often — it silently no-ops when not eligible.
 */
export async function maybeAskForReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    console.log('[reviewPrompt] maybeAskForReview:', trigger);

    const [usageOk, cooldownOk, tenureOk] = await Promise.all([
      hasUsageThreshold(),
      hasCooldownExpired(),
      hasTenure(),
    ]);

    if (!tenureOk) {
      console.log('[reviewPrompt] First-use wait not met (need', MIN_DAYS_SINCE_FIRST_USE, 'days)');
      return false;
    }

    if (!usageOk) {
      console.log('[reviewPrompt] Completions gate not met (need', MIN_TOTAL_COMPLETIONS, ')');
      return false;
    }

    if (!cooldownOk) {
      console.log('[reviewPrompt] Still in cooldown period');
      return false;
    }

    return await presentStoreReview();
  } catch (error) {
    console.warn('[reviewPrompt] Failed to evaluate review prompt', error);
    return false;
  }
}

/**
 * Request an in-app review immediately, bypassing the gate. For a manual
 * "Rate & Review" action if ever wired to the in-app card (Settings currently
 * uses a store deep-link instead).
 */
export async function requestReviewNow(): Promise<boolean> {
  console.log('[reviewPrompt] requestReviewNow - bypassing all gates');
  const StoreReview = await getStoreReviewModule();
  if (!StoreReview) {
    console.log('[reviewPrompt] native module unavailable');
    return false;
  }

  try {
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      console.warn('[reviewPrompt] StoreReview.hasAction returned false');
      return false;
    }

    console.log('[reviewPrompt] showing native review dialog (manual)');
    await StoreReview.requestReview();
    // Don't record or reset counters for manual requests
    return true;
  } catch (error) {
    console.warn('[reviewPrompt] Unable to present store review', error);
    return false;
  }
}
