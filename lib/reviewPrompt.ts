import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import type * as ExpoStoreReviewModule from 'expo-store-review';

/**
 * Simplified Review Prompt System
 * 
 * Only triggers from the two highest-value features:
 * - Daily Reflection: Most used feature
 * - Literature Hub: Biggest differentiator, drives positive feelings
 */

export type ReviewTrigger =
  | 'dailyReflection'
  | 'literature'
  | 'manualRate';

const STORAGE_KEYS = {
  DAYS_USED: 'reviewPrompt:daysUsed',
  LAST_PROMPT: 'reviewPrompt:lastPromptDate',
  DAILY_REFLECTION_DAYS: 'reviewPrompt:dailyReflectionDays',
  LITERATURE_READER_OPENS: 'reviewPrompt:literatureReaderOpens',
} as const;

// Gating thresholds
const MIN_USAGE_DAYS = 7;             // Must use app for 7 days
const MIN_DAILY_REFLECTION_DAYS = 5;  // Must read 5 daily reflections
const MIN_LITERATURE_READER_OPENS = 5; // Must open the Big Book reader 5 times
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90-day cooldown between prompts

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

async function getNumber(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

async function setNumber(key: string, value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to persist number', error);
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
  // Reset counters after showing prompt
  await Promise.all([
    saveStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS, new Set<string>()),
    setNumber(STORAGE_KEYS.LITERATURE_READER_OPENS, 0),
  ]);
}

// Gating checks
async function hasUsageThreshold(): Promise<boolean> {
  const daysUsed = await getStringSet(STORAGE_KEYS.DAYS_USED);
  return daysUsed.size >= MIN_USAGE_DAYS;
}

async function hasCooldownExpired(): Promise<boolean> {
  const lastPrompt = await getLastPromptTimestamp();
  if (!lastPrompt) return true;
  return Date.now() - lastPrompt >= COOLDOWN_MS;
}

async function meetsTriggerRequirement(trigger: ReviewTrigger): Promise<boolean> {
  if (trigger === 'dailyReflection') {
    const reflectionDays = await getStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS);
    const ok = reflectionDays.size >= MIN_DAILY_REFLECTION_DAYS;
    console.log('[reviewPrompt] dailyReflection check:', reflectionDays.size, '/', MIN_DAILY_REFLECTION_DAYS, ok ? '✓' : '✗');
    return ok;
  }

  if (trigger === 'literature') {
    const readerOpens = await getNumber(STORAGE_KEYS.LITERATURE_READER_OPENS);
    const ok = readerOpens >= MIN_LITERATURE_READER_OPENS;
    console.log('[reviewPrompt] literature check:', readerOpens, '/', MIN_LITERATURE_READER_OPENS, 'opens', ok ? '✓' : '✗');
    return ok;
  }

  // manualRate always passes trigger requirement
  return true;
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
 * Record that the app was opened today (for usage day counting)
 */
export async function recordAppOpen(date: Date = new Date()): Promise<void> {
  try {
    const daysUsed = await getStringSet(STORAGE_KEYS.DAYS_USED);
    const dayKey = toDayKey(date);
    if (!daysUsed.has(dayKey)) {
      daysUsed.add(dayKey);
      await saveStringSet(STORAGE_KEYS.DAYS_USED, daysUsed);
    }
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record app open', error);
  }
}

/**
 * Record that user viewed the Daily Reflection today
 */
export async function recordDailyReflectionDay(date: Date = new Date()): Promise<void> {
  try {
    const reflectionDays = await getStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS);
    const dayKey = toDayKey(date);
    if (!reflectionDays.has(dayKey)) {
      reflectionDays.add(dayKey);
      await saveStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS, reflectionDays);
      console.log('[reviewPrompt] Recorded daily reflection day:', dayKey, 'total:', reflectionDays.size);
    }
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record daily reflection day', error);
  }
}

/**
 * Record that user opened the Big Book reader view
 */
export async function recordLiteratureReaderOpen(): Promise<number> {
  try {
    const current = await getNumber(STORAGE_KEYS.LITERATURE_READER_OPENS);
    const updated = current + 1;
    await setNumber(STORAGE_KEYS.LITERATURE_READER_OPENS, updated);
    console.log('[reviewPrompt] Recorded literature reader open, total:', updated);
    return updated;
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record literature reader open', error);
    return getNumber(STORAGE_KEYS.LITERATURE_READER_OPENS);
  }
}

/**
 * Check if review prompt should be shown after completing an activity.
 * Only call from Daily Reflection or Literature features.
 */
export async function maybeAskForReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    console.log('[reviewPrompt] maybeAskForReview:', trigger);
    
    const [usageOk, cooldownOk] = await Promise.all([
      hasUsageThreshold(),
      hasCooldownExpired(),
    ]);

    if (!usageOk) {
      console.log('[reviewPrompt] Usage threshold not met (need', MIN_USAGE_DAYS, 'days)');
      return false;
    }

    if (!cooldownOk) {
      console.log('[reviewPrompt] Still in cooldown period');
      return false;
    }

    const triggerOk = await meetsTriggerRequirement(trigger);
    if (!triggerOk) {
      return false;
    }

    return await presentStoreReview();
  } catch (error) {
    console.warn('[reviewPrompt] Failed to evaluate review prompt', error);
    return false;
  }
}

/**
 * Convenience wrapper for Daily Reflection trigger
 */
export async function maybeAskForReviewFromDailyReflection(): Promise<boolean> {
  return maybeAskForReview('dailyReflection');
}

/**
 * Convenience wrapper for Literature trigger
 */
export async function maybeAskForReviewFromLiterature(): Promise<boolean> {
  return maybeAskForReview('literature');
}

/**
 * Request an in-app review immediately, bypassing all gating logic.
 * Use for manual "Rate & Review" button presses.
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
