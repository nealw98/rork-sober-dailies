import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { logEvent, setProfile } from '@/lib/analytics';
import { recordDailyCompletionDay } from '@/lib/reviewPrompt';

/**
 * My Dailies — the customizable daily-action program (NET-NEW, local-first).
 *
 * Two persisted pieces:
 *   - `program` (key `dailies_program`): the user's chosen dailies + their
 *     Morning/Anytime/Evening bucket. Stable across days.
 *   - `completion` (key `dailies_completion`): per-day record of which dailies
 *     (and the permanent Daily Reflection hero) were done. Keyed by local date
 *     'YYYY-MM-DD' so Journey/Trends can later compute history from it — no
 *     server table (see DATA-SOURCES.md "completed today is COMPUTED in-app").
 *
 * Daily Reflection is NOT in `program` — it's the permanent Today hero, tracked
 * via the per-day `reflection` flag.
 */

export type WhenBucket = 'Morning' | 'Anytime' | 'Evening';

export interface DailyItem {
  id: string;
  label: string;
  icon: string;   // glyph name, resolved in the UI
  color: string;  // tone name: teal | amber | blue | lavender | coral | gray
  when: WhenBucket;
  action: string; // open key, resolved to a route in the UI
  custom?: boolean;
  subtitle?: string; // user override for the row's subtitle; falls back to the action default
}

interface DayCompletion {
  done: string[];      // daily ids completed that day
  reflection: boolean; // Daily Reflection hero done that day
  total?: number;      // possible dailies that day (program.length + 1), stamped on write.
                       // Optional: records written before this existed won't have it.
  v2?: boolean;        // legacy day backfilled from the v2 Nightly Review checklist:
                       // done holds V2_DAILIES ids, total is 6, and the day is read-only.
}

const PROGRAM_KEY = 'dailies_program';
const COMPLETION_KEY = 'dailies_completion';
const V2_SAVED_REVIEWS_KEY = 'saved_evening_review_entries';

// The v2 Nightly Review's "Daily Actions" checkboxes — the fixed precursor to
// the user-defined program. Backfilled days keep these exact six items;
// `actions` maps each onto today's dailies so Trends streaks bridge the upgrade.
export const V2_DAILIES: { id: string; label: string; icon: string; color: string; actions: string[] }[] = [
  { id: 'stayedSober', label: 'Stayed sober', icon: 'check', color: 'teal', actions: [] },
  { id: 'prayedOrMeditated', label: 'Prayed or meditated', icon: 'pray', color: 'terracotta', actions: ['prayerMorning', 'prayerEvening', 'meditation'] },
  { id: 'practicedGratitude', label: 'Practiced gratitude', icon: 'heart', color: 'terracotta', actions: ['gratitude'] },
  { id: 'readAALiterature', label: 'Read AA literature', icon: 'library', color: 'steel', actions: ['lit'] },
  { id: 'talkedToAlcoholic', label: 'Talked with another alcoholic', icon: 'phone', color: 'steel', actions: ['callAnother'] },
  { id: 'didSomethingForOthers', label: 'Did something for someone else', icon: 'users', color: 'steel', actions: ['service'] },
];

// Turn v2 Nightly Review checklists into legacy completion records so Journey
// day cards and Trends treat those days as real (read-only) dailies. Runs on
// every load; it never overwrites a date that already has a record, so it's
// idempotent — and v2 entries that arrive AFTER first launch (a Backup &
// Restore import lands post-install) get picked up on the next load. An
// earlier run-once flag missed exactly that restore case: it fired against an
// empty store on install and never looked again.
async function backfillV2Checklists(existing: Record<string, DayCompletion>): Promise<Record<string, DayCompletion> | null> {
  let changed = false;
  const next = { ...existing };
  try {
    const raw = await AsyncStorage.getItem(V2_SAVED_REVIEWS_KEY);
    if (!raw) return null;
    const saved: { date?: string; data?: Record<string, unknown> }[] = JSON.parse(raw);
    // Past days only: today belongs to the live v3 store (an upgrade-day v2
    // review still shows on Journey as its own notebook entry).
    const todayKey = getTodayDateString();
    for (const e of saved) {
      if (!e?.date || e.date >= todayKey || next[e.date]) continue;
      const checked = V2_DAILIES.filter((it) => !!e.data?.[it.id]).map((it) => it.id);
      if (checked.length === 0) continue;
      next[e.date] = { done: checked, reflection: false, total: V2_DAILIES.length, v2: true };
      changed = true;
    }
  } catch (error) {
    console.error('[dailies] v2 checklist backfill failed:', error);
    return null;
  }
  return changed ? next : null;
}

// Default program = the same pre-checked set onboarding's "Define your dailies"
// ships, so skipping onboarding lands on identical defaults (CLAUDE.md). Daily
// Reflection is the permanent hero, not listed here.
export const DEFAULT_PROGRAM: DailyItem[] = [
  { id: 'prayerM', label: 'Say my morning prayers', icon: 'pray', color: 'terracotta', when: 'Morning', action: 'prayerMorning' },
  { id: 'grat', label: 'Write a gratitude list', icon: 'heart', color: 'terracotta', when: 'Morning', action: 'gratitude' },
  { id: 'meeting', label: 'Attend a meeting', icon: 'users', color: 'steel', when: 'Anytime', action: 'meeting' },
  { id: 'lit', label: 'Read the literature', icon: 'library', color: 'steel', when: 'Anytime', action: 'lit' },
  { id: 'nightly', label: 'Do my nightly review', icon: 'moon', color: 'lavender', when: 'Evening', action: 'nightly' },
  { id: 'prayerE', label: 'Say my evening prayers', icon: 'pray', color: 'periwinkle', when: 'Evening', action: 'prayerEvening' },
];

// A daily's tone is derived from its ACTION (the canonical family assignment),
// so saved programs re-tint to the current palette after a re-theme — older
// installs never keep stale colors. Custom dailies keep their own tone.
const ACTION_TONE: Record<string, string> = {
  prayerMorning: 'terracotta',
  gratitude: 'terracotta',
  spotcheck: 'terracotta',
  prayerEvening: 'periwinkle',
  nightly: 'periwinkle',
  meditation: 'periwinkle',
  meeting: 'steel',
  speaker: 'steel',
  callAnother: 'steel',
  lit: 'steel',
  journal: 'teal',
  prayers: 'teal',
};

function normalizeColors(items: DailyItem[]): DailyItem[] {
  return items.map((it) => {
    const tone = ACTION_TONE[it.action];
    return tone && tone !== it.color ? { ...it, color: tone } : it;
  });
}

const EMPTY_DAY: DayCompletion = { done: [], reflection: false };

function dateKeyFor(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayDateString(): string {
  return dateKeyFor(new Date());
}

export const [DailiesProvider, useDailies] = createContextHook(() => {
  const [program, setProgram] = useState<DailyItem[]>(DEFAULT_PROGRAM);
  const [completion, setCompletion] = useState<Record<string, DayCompletion>>({});
  const [isLoading, setIsLoading] = useState(true);
  // The current local day. Kept fresh so checkmarks (and the Today reflection)
  // roll over at the user's midnight — on app-foreground and once a minute —
  // without needing a relaunch.
  const [dayKey, setDayKey] = useState(getTodayDateString());

  useEffect(() => {
    const sync = () => setDayKey((prev) => { const now = getTodayDateString(); return now !== prev ? now : prev; });
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') sync(); });
    const id = setInterval(sync, 60_000);
    return () => { sub.remove(); clearInterval(id); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          AsyncStorage.getItem(PROGRAM_KEY),
          AsyncStorage.getItem(COMPLETION_KEY),
        ]);
        if (p) {
          const parsed = normalizeColors(JSON.parse(p) as DailyItem[]);
          setProgram(parsed);
          // One-time migration: re-tint a saved program to the current palette.
          if (JSON.stringify(parsed) !== p) AsyncStorage.setItem(PROGRAM_KEY, JSON.stringify(parsed)).catch(() => {});
        }
        const loaded: Record<string, DayCompletion> = c ? JSON.parse(c) : {};
        setCompletion(loaded);
        // Backfill v2 Nightly Review checklists into legacy day records (once).
        const backfilled = await backfillV2Checklists(loaded);
        if (backfilled) {
          setCompletion(backfilled);
          AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(backfilled)).catch(() => {});
        }
      } catch (error) {
        console.error('[dailies] Error loading store:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistProgram = useCallback(async (raw: DailyItem[]) => {
    const next = normalizeColors(raw);
    setProgram(next);
    try {
      await AsyncStorage.setItem(PROGRAM_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('[dailies] Error saving program:', error);
    }
  }, []);

  const persistCompletion = useCallback(async (next: Record<string, DayCompletion>) => {
    setCompletion(next);
    try {
      await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('[dailies] Error saving completion:', error);
    }
  }, []);

  const updateToday = useCallback(
    (mutate: (day: DayCompletion) => DayCompletion) => {
      const key = getTodayDateString();
      const current = completion[key] ?? EMPTY_DAY;
      // Stamp the day's possible total so Trends can compute a true completion
      // rate even if the program size changes later.
      persistCompletion({ ...completion, [key]: { ...mutate(current), total: program.length + 1 } });
    },
    [completion, persistCompletion, program],
  );

  // ── Program ──────────────────────────────────────────────────────────
  const section = useCallback((when: WhenBucket) => program.filter((d) => d.when === when), [program]);

  // Analytics: mirror the current program onto the Mixpanel People profile so
  // "what's on users' Today pages" is visible without event math.
  const syncProgramProfile = useCallback((items: DailyItem[]) => {
    setProfile({ dailies_program: items.map((d) => d.label), dailies_count: items.length + 1 });
  }, []);

  const addDaily = useCallback(
    (item: Omit<DailyItem, 'id' | 'when'>, when: WhenBucket) => {
      const id = `d${Date.now()}${Math.floor(Math.random() * 999)}`;
      const next = [...program, { ...item, id, when }];
      persistProgram(next);
      logEvent('daily_added', { daily: item.label, when, custom: !!item.custom });
      syncProgramProfile(next);
      return id;
    },
    [program, persistProgram, syncProgramProfile],
  );

  const removeDaily = useCallback(
    (id: string) => {
      const removed = program.find((d) => d.id === id);
      const next = program.filter((d) => d.id !== id);
      persistProgram(next);
      if (removed) logEvent('daily_removed', { daily: removed.label });
      syncProgramProfile(next);
    },
    [program, persistProgram, syncProgramProfile],
  );

  const setWhen = useCallback(
    (id: string, when: WhenBucket) => persistProgram(program.map((d) => (d.id === id ? { ...d, when } : d))),
    [program, persistProgram],
  );

  const renameDaily = useCallback(
    (id: string, label: string) => persistProgram(program.map((d) => (d.id === id ? { ...d, label } : d))),
    [program, persistProgram],
  );

  // Edit a daily's title and/or subtitle (long-press on Today). An empty subtitle
  // string is kept as-is so a user can deliberately clear the default subtitle.
  const editDaily = useCallback(
    (id: string, patch: { label?: string; subtitle?: string }) =>
      persistProgram(program.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    [program, persistProgram],
  );

  const setAll = useCallback((items: DailyItem[]) => persistProgram(items), [persistProgram]);

  // ── Completion (today) ───────────────────────────────────────────────
  const todayDone = completion[dayKey] ?? EMPTY_DAY;

  const isDone = useCallback(
    (id: string) => (completion[dayKey]?.done ?? []).includes(id),
    [completion, dayKey],
  );

  // Analytics: which dailies users actually complete (fires only on the OFF→ON
  // transition, never on uncheck, so counts aren't inflated by toggling). Also
  // records the day toward the review-prompt eligibility gate (any daily done).
  const logCompleted = useCallback(
    (id: string) => {
      const item = program.find((d) => d.id === id);
      if (item) logEvent('daily_completed', { daily: item.label, when: item.when, custom: !!item.custom });
      recordDailyCompletionDay().catch(() => {});
    },
    [program],
  );

  const toggleDone = useCallback(
    (id: string) => {
      const turningOn = !(completion[dayKey]?.done ?? []).includes(id);
      updateToday((day) => ({
        ...day,
        done: day.done.includes(id) ? day.done.filter((x) => x !== id) : [...day.done, id],
      }));
      if (turningOn) logCompleted(id);
    },
    [updateToday, completion, dayKey, logCompleted],
  );

  const markDone = useCallback(
    (id: string) => {
      const turningOn = !(completion[dayKey]?.done ?? []).includes(id);
      updateToday((day) => (day.done.includes(id) ? day : { ...day, done: [...day.done, id] }));
      if (turningOn) logCompleted(id);
    },
    [updateToday, completion, dayKey, logCompleted],
  );

  const setReflectionDone = useCallback(
    (value: boolean = true) => {
      const turningOn = value && !completion[dayKey]?.reflection;
      updateToday((day) => ({ ...day, reflection: value }));
      if (turningOn) {
        logEvent('daily_completed', { daily: 'Daily Reflection', when: 'Morning' });
        recordDailyCompletionDay().catch(() => {});
      }
    },
    [updateToday, completion, dayKey],
  );

  const toggleReflection = useCallback(() => {
    const turningOn = !completion[dayKey]?.reflection;
    updateToday((day) => ({ ...day, reflection: !day.reflection }));
    if (turningOn) {
      logEvent('daily_completed', { daily: 'Daily Reflection', when: 'Morning' });
      recordDailyCompletionDay().catch(() => {});
    }
  }, [updateToday, completion, dayKey]);

  // Overwrite a specific day's completion record. Lets Journey edit past days
  // (check off dailies the user forgot), keyed by that day's local date.
  const setDayCompletion = useCallback(
    (dateKey: string, day: DayCompletion) =>
      persistCompletion({ ...completion, [dateKey]: { ...day, total: program.length + 1 } }),
    [completion, persistCompletion, program],
  );

  // Consecutive days (ending today) the Daily Reflection was marked read.
  // Computed from completion history — never stored as a flag.
  const reflectionStreak = useCallback(() => {
    let streak = 0;
    const d = new Date();
    while (completion[dateKeyFor(d)]?.reflection) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [completion]);

  // total dailies done today (incl. reflection) / total possible — for summaries
  const doneCount = todayDone.done.length + (todayDone.reflection ? 1 : 0);
  const totalCount = program.length + 1; // + permanent Daily Reflection

  return useMemo(
    () => ({
      program,
      isLoading,
      section,
      addDaily,
      removeDaily,
      setWhen,
      renameDaily,
      editDaily,
      setAll,
      isDone,
      toggleDone,
      markDone,
      reflectionDone: todayDone.reflection,
      setReflectionDone,
      toggleReflection,
      setDayCompletion,
      reflectionStreak,
      dayKey,
      completion,
      doneCount,
      totalCount,
    }),
    [program, isLoading, section, addDaily, removeDaily, setWhen, renameDaily, editDaily, setAll, isDone, toggleDone, markDone, todayDone.reflection, setReflectionDone, toggleReflection, setDayCompletion, reflectionStreak, dayKey, completion, doneCount, totalCount],
  );
});
