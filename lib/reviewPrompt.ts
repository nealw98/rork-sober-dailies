import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import type * as ExpoStoreReviewModule from 'expo-store-review';

export type ReviewTrigger = 'gratitude' | 'eveningReview' | 'aiSponsor';

const STORAGE_KEYS = {
  DAYS_USED: 'reviewPrompt:daysUsed',
  LAST_PROMPT: 'reviewPrompt:lastPromptDate',
  AI_RESPONSE_COUNT: 'reviewPrompt:aiResponseCount',
  DAILY_REFLECTION_DAYS: 'reviewPrompt:dailyReflectionDays',
  LITERATURE_MINUTES: 'reviewPrompt:literatureMinutes',
} as const;

const MIN_USAGE_DAYS = 7;
const MIN_DAILY_REFLECTION_DAYS = 5;
const MIN_LITERATURE_MINUTES = 10;
const MIN_AI_RESPONSES = 5;
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const STORAGE_SEPARATOR = ',';

const toDayKey = (date: Date) => date.toISOString().split('T')[0];

let storeReviewModule: typeof ExpoStoreReviewModule | null | undefined;
let storeReviewPromise: Promise<typeof ExpoStoreReviewModule | null> | null = null;

async function getStoreReviewModule(): Promise<typeof ExpoStoreReviewModule | null> {
  if (storeReviewModule !== undefined) {
    console.log('[reviewPrompt] returning cached StoreReview module', !!storeReviewModule);
    return storeReviewModule;
  }

  if (!storeReviewPromise) {
    storeReviewPromise = (async () => {
      try {
        if (!(NativeModules as Record<string, unknown>).ExpoStoreReview) {
          console.warn('[reviewPrompt] StoreReview native module missing from NativeModules');
          console.warn('[reviewPrompt] expo-store-review native module missing from this build');
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

async function getStringSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set<string>();

    // Prefer JSON array, but fall back to comma-separated string for resilience.
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      // noop – will try fallback below
    }

    return new Set(
      raw
        .split(STORAGE_SEPARATOR)
        .map((item) => item.trim())
        .filter(Boolean),
    );
  } catch (error) {
    console.warn('[reviewPrompt] Failed to read set for key', key, error);
    return new Set<string>();
  }
}

async function saveStringSet(key: string, values: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to persist set for key', key, error);
  }
}

async function getNumber(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.warn('[reviewPrompt] Failed to read number for key', key, error);
    return 0;
  }
}

async function setNumber(key: string, value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to persist number for key', key, error);
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
  } catch (error) {
    console.warn('[reviewPrompt] Failed to read last prompt timestamp', error);
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

async function ensureUsageDayRecorded(dayKey: string): Promise<void> {
  const daysUsed = await getStringSet(STORAGE_KEYS.DAYS_USED);
  if (!daysUsed.has(dayKey)) {
    daysUsed.add(dayKey);
    await saveStringSet(STORAGE_KEYS.DAYS_USED, daysUsed);
  }
}

async function ensureDailyReflectionDayRecorded(dayKey: string): Promise<void> {
  const reflectionDays = await getStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS);
  if (!reflectionDays.has(dayKey)) {
    reflectionDays.add(dayKey);
    await saveStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS, reflectionDays);
  }
}

async function hasUsageThreshold(): Promise<boolean> {
  if (MIN_USAGE_DAYS <= 0) {
    return true;
  }
  const daysUsed = await getStringSet(STORAGE_KEYS.DAYS_USED);
  return daysUsed.size >= MIN_USAGE_DAYS;
}

async function hasReadingThreshold(): Promise<boolean> {
  if (MIN_DAILY_REFLECTION_DAYS <= 0 && MIN_LITERATURE_MINUTES <= 0) {
    return true;
  }
  const reflectionDays = await getStringSet(STORAGE_KEYS.DAILY_REFLECTION_DAYS);
  if (reflectionDays.size >= MIN_DAILY_REFLECTION_DAYS) {
    return true;
  }
  const literatureMinutes = await getNumber(STORAGE_KEYS.LITERATURE_MINUTES);
  return literatureMinutes >= MIN_LITERATURE_MINUTES;
}

async function hasCooldownExpired(): Promise<boolean> {
  if (COOLDOWN_MS <= 0) {
    return true;
  }
  const lastPrompt = await getLastPromptTimestamp();
  if (!lastPrompt) return true;
  return Date.now() - lastPrompt >= COOLDOWN_MS;
}

async function incrementAIResponses(by: number): Promise<number> {
  const current = await getNumber(STORAGE_KEYS.AI_RESPONSE_COUNT);
  const updated = Math.max(0, current + by);
  await setNumber(STORAGE_KEYS.AI_RESPONSE_COUNT, updated);
  return updated;
}

function meetsTriggerSpecificRequirement(trigger: ReviewTrigger, aiResponses: number): boolean {
  if (trigger === 'aiSponsor') {
    const ok = aiResponses >= MIN_AI_RESPONSES;
    console.log('[reviewPrompt] aiSponsor requirement', { aiResponses, ok });
    return ok;
  }
  // Other triggers do not have additional per-trigger requirements.
  return true;
}

async function presentStoreReview(trigger: ReviewTrigger): Promise<boolean> {
  console.log('[reviewPrompt] presentStoreReview start', { trigger });
  const StoreReview = await getStoreReviewModule();
  if (!StoreReview) {
    console.warn('[reviewPrompt] StoreReview module unavailable');
    return false;
  }

  try {
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      console.warn('[reviewPrompt] StoreReview.hasAction returned false, skipping prompt');
      return false;
    }

    console.log('[reviewPrompt] invoking StoreReview.requestReview');
    await StoreReview.requestReview();
    await setLastPromptTimestamp(new Date());
    return true;
  } catch (error) {
    console.warn('[reviewPrompt] Unable to present store review prompt', error);
    return false;
  }
}

export async function recordAppOpen(date: Date = new Date()): Promise<void> {
  try {
    await ensureUsageDayRecorded(toDayKey(date));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record app open', error);
  }
}

export async function recordDailyReflectionDay(date: Date = new Date()): Promise<void> {
  try {
    await ensureDailyReflectionDayRecorded(toDayKey(date));
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record daily reflection day', error);
  }
}

export async function addReadingTime(
  source: 'literature',
  minutes: number,
): Promise<number> {
  if (source !== 'literature' || !Number.isFinite(minutes) || minutes <= 0) {
    return getNumber(STORAGE_KEYS.LITERATURE_MINUTES);
  }

  try {
    const current = await getNumber(STORAGE_KEYS.LITERATURE_MINUTES);
    const updated = current + minutes;
    await setNumber(STORAGE_KEYS.LITERATURE_MINUTES, updated);
    return updated;
  } catch (error) {
    console.warn('[reviewPrompt] Failed to add reading time', error);
    return getNumber(STORAGE_KEYS.LITERATURE_MINUTES);
  }
}

export async function addAIResponses(count: number): Promise<number> {
  if (!Number.isFinite(count) || count <= 0) {
    return getNumber(STORAGE_KEYS.AI_RESPONSE_COUNT);
  }

  try {
    return await incrementAIResponses(count);
  } catch (error) {
    console.warn('[reviewPrompt] Failed to record AI responses', error);
    return getNumber(STORAGE_KEYS.AI_RESPONSE_COUNT);
  }
}

export async function maybeAskForReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    console.log('[reviewPrompt] maybeAskForReview start', trigger);

    const [usageOk, readingOk, cooldownOk, aiResponses] = await Promise.all([
      hasUsageThreshold(),
      hasReadingThreshold(),
      hasCooldownExpired(),
      getNumber(STORAGE_KEYS.AI_RESPONSE_COUNT),
    ]);

    console.log('[reviewPrompt] gate results', { usageOk, readingOk, cooldownOk, aiResponses });

    if (!usageOk || !readingOk || !cooldownOk) {
      console.log('[reviewPrompt] gating failed', { usageOk, readingOk, cooldownOk });
      return false;
    }

    if (!meetsTriggerSpecificRequirement(trigger, aiResponses)) {
      console.log('[reviewPrompt] trigger specific requirement failed', trigger, aiResponses);
      return false;
    }

    const result = await presentStoreReview(trigger);
    console.log('[reviewPrompt] presentStoreReview result', result);
    return result;
  } catch (error) {
    console.warn('[reviewPrompt] Failed to evaluate review prompt', error);
    return false;
  }
}

export async function requestReviewDebug(): Promise<boolean> {
  console.log('[reviewPrompt] requestReviewDebug invoked');
  const StoreReview = await getStoreReviewModule();
  if (!StoreReview) {
    console.warn('[reviewPrompt] requestReviewDebug: StoreReview module unavailable');
    return false;
  }

  try {
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      console.warn('[reviewPrompt] requestReviewDebug: hasAction returned false');
      return false;
    }

    await StoreReview.requestReview();
    return true;
  } catch (error) {
    console.warn('[reviewPrompt] requestReviewDebug failed', error);
    return false;
  }
}

