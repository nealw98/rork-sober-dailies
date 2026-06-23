import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

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
}

interface DayCompletion {
  done: string[];      // daily ids completed that day
  reflection: boolean; // Daily Reflection hero done that day
}

const PROGRAM_KEY = 'dailies_program';
const COMPLETION_KEY = 'dailies_completion';

// Default program = the same pre-checked set onboarding's "Define your dailies"
// ships, so skipping onboarding lands on identical defaults (CLAUDE.md). Daily
// Reflection is the permanent hero, not listed here.
export const DEFAULT_PROGRAM: DailyItem[] = [
  { id: 'prayerM', label: 'Say my Morning Prayer', icon: 'pray', color: 'amber', when: 'Morning', action: 'prayerMorning' },
  { id: 'grat', label: 'Write my Gratitude List', icon: 'heart', color: 'amber', when: 'Morning', action: 'gratitude' },
  { id: 'meeting', label: 'Attend a meeting', icon: 'users', color: 'lavender', when: 'Anytime', action: 'meeting' },
  { id: 'lit', label: 'Read the literature', icon: 'library', color: 'teal', when: 'Anytime', action: 'lit' },
  { id: 'nightly', label: 'Nightly Review', icon: 'moon', color: 'lavender', when: 'Evening', action: 'nightly' },
  { id: 'prayerE', label: 'Say my Evening Prayer', icon: 'pray', color: 'amber', when: 'Evening', action: 'prayerEvening' },
];

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
        if (p) setProgram(JSON.parse(p));
        if (c) setCompletion(JSON.parse(c));
      } catch (error) {
        console.error('[dailies] Error loading store:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistProgram = useCallback(async (next: DailyItem[]) => {
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
      persistCompletion({ ...completion, [key]: mutate(current) });
    },
    [completion, persistCompletion],
  );

  // ── Program ──────────────────────────────────────────────────────────
  const section = useCallback((when: WhenBucket) => program.filter((d) => d.when === when), [program]);

  const addDaily = useCallback(
    (item: Omit<DailyItem, 'id' | 'when'>, when: WhenBucket) => {
      const id = `d${Date.now()}${Math.floor(Math.random() * 999)}`;
      persistProgram([...program, { ...item, id, when }]);
      return id;
    },
    [program, persistProgram],
  );

  const removeDaily = useCallback((id: string) => persistProgram(program.filter((d) => d.id !== id)), [program, persistProgram]);

  const setWhen = useCallback(
    (id: string, when: WhenBucket) => persistProgram(program.map((d) => (d.id === id ? { ...d, when } : d))),
    [program, persistProgram],
  );

  const renameDaily = useCallback(
    (id: string, label: string) => persistProgram(program.map((d) => (d.id === id ? { ...d, label } : d))),
    [program, persistProgram],
  );

  const setAll = useCallback((items: DailyItem[]) => persistProgram(items), [persistProgram]);

  // ── Completion (today) ───────────────────────────────────────────────
  const todayDone = completion[dayKey] ?? EMPTY_DAY;

  const isDone = useCallback(
    (id: string) => (completion[dayKey]?.done ?? []).includes(id),
    [completion, dayKey],
  );

  const toggleDone = useCallback(
    (id: string) =>
      updateToday((day) => ({
        ...day,
        done: day.done.includes(id) ? day.done.filter((x) => x !== id) : [...day.done, id],
      })),
    [updateToday],
  );

  const markDone = useCallback(
    (id: string) => updateToday((day) => (day.done.includes(id) ? day : { ...day, done: [...day.done, id] })),
    [updateToday],
  );

  const setReflectionDone = useCallback(
    (value: boolean = true) => updateToday((day) => ({ ...day, reflection: value })),
    [updateToday],
  );

  const toggleReflection = useCallback(
    () => updateToday((day) => ({ ...day, reflection: !day.reflection })),
    [updateToday],
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
      setAll,
      isDone,
      toggleDone,
      markDone,
      reflectionDone: todayDone.reflection,
      setReflectionDone,
      toggleReflection,
      reflectionStreak,
      dayKey,
      completion,
      doneCount,
      totalCount,
    }),
    [program, isLoading, section, addDaily, removeDaily, setWhen, renameDaily, setAll, isDone, toggleDone, markDone, todayDone.reflection, setReflectionDone, toggleReflection, reflectionStreak, dayKey, completion, doneCount, totalCount],
  );
});
