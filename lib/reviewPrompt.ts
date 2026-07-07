import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import type * as ExpoStoreReviewModule from 'expo-store-review';

/**
 * Review Prompt System
 *
 * Two layers, so the native store-review card only ever appears to an engaged
 * user right after a positive moment (biasing toward happy reviews):
 *
 *  1. GATE (eligibility): the user has completed a daily on >= 5 distinct days
 *     (any single daily counts — real use of the core feature), AND the 30-day
 *     cooldown since the last prompt has passed.
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
  COMPLETION_DAYS: 'reviewPrompt:dailyCompletionDays',
  LAST_PROMPT: 'reviewPrompt:lastPromptDate',
} as const;

// Gate thresholds
const MIN_DAILY_COMPLETION_DAYS = 5;          // days with >= 1 daily marked done
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30-day cooldown between prompts

const toDayKey = (date: Date) => date.toISOString().split('T')[0];

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
async function getStringSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set<string>();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      // Fall back to comma-separated
    }
    return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

async function saveStringSet(key: string, values: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to persist set', error);
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
  // Reset the completion-day count so the user has to re-engage for 5 more days
  // before another prompt is even eligible (on top of the 30-day cooldown).
  await saveStringSet(STORAGE_KEYS.COMPLETION_DAYS, new Set<string>());
}

// Gate checks
async function hasUsageThreshold(): Promise<boolean> {
  const completionDays = await getStringSet(STORAGE_KEYS.COMPLETION_DAYS);
  const ok = completionDays.size >= MIN_DAILY_COMPLETION_DAYS;
  console.log('[reviewPrompt] completion-day gate:', completionDays.size, '/', MIN_DAILY_COMPLETION_DAYS, ok ? '✓' : '✗');
  return ok;
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
 * Record that the user completed a daily (any single daily) today. Counts toward
 * the >= 5-distinct-days eligibility gate. Idempotent per day.
 */
export async function recordDailyCompletionDay(date: Date = new Date()): Promise<void> {
  try {
    const completionDays = await getStringSet(STORAGE_KEYS.COMPLETION_DAYS);
    const dayKey = toDayKey(date);
    if (!completionDays.has(dayKey)) {
      completionDays.add(dayKey);
      await saveStringSet(STORAGE_KEYS.COMPLETION_DAYS, completionDays);
      console.log('[reviewPrompt] Recorded completion day:', dayKey, 'total:', completionDays.size);
    }
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record completion day', error);
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

    const [usageOk, cooldownOk] = await Promise.all([
      hasUsageThreshold(),
      hasCooldownExpired(),
    ]);

    if (!usageOk) {
      console.log('[reviewPrompt] Completion-day gate not met (need', MIN_DAILY_COMPLETION_DAYS, 'days)');
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
