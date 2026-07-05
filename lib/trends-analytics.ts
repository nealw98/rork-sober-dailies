import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';
import type { DailyItem } from '@/hooks/use-dailies-store';

/**
 * Trends analytics — pure computations over the locally-stored dailies completion
 * history (Record<'YYYY-MM-DD', {done, reflection}>, retained forever) plus a
 * notebook entry count. Powers the Trends screen's streaks, monthly heatmap, and
 * insights. No new tracking needed; nothing is faked.
 */

export interface DayCompletion { done: string[]; reflection: boolean; total?: number }
export type Completion = Record<string, DayCompletion>;

const REFLECTION_ID = '__reflection';
const REFLECTION_LABEL = 'Daily Reflection';

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// "Say my Morning Prayer" → "Morning Prayer", "Write my Gratitude List" → "Gratitude"
export function shortLabel(label: string): string {
  const s = label
    .replace(/^(Say|Write|Read|Attend|Do|Make|Take)\s+(my|the|a|an)\s+/i, '')
    .replace(/\s+List$/i, '')
    .trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : label;
}

// Consecutive days ending today, with a grace day so it doesn't read 0 before
// you've done today's practice.
function currentStreak(did: (key: string) => boolean, today: Date): number {
  let cursor = new Date(today);
  if (!did(formatLocalDate(cursor))) cursor = addDays(cursor, -1);
  let count = 0;
  while (did(formatLocalDate(cursor))) { count++; cursor = addDays(cursor, -1); }
  return count;
}

export interface StreakRow { id: string; label: string; color?: string; icon?: string; streak: number }

export function computeStreaks(program: DailyItem[], completion: Completion, today = new Date()): StreakRow[] {
  const rows: StreakRow[] = [
    { id: REFLECTION_ID, label: REFLECTION_LABEL, icon: 'book', color: 'teal', streak: currentStreak((k) => !!completion[k]?.reflection, today) },
  ];
  for (const it of program) {
    rows.push({
      id: it.id,
      label: shortLabel(it.label),
      color: it.color,
      icon: it.icon,
      streak: currentStreak((k) => (completion[k]?.done ?? []).includes(it.id), today),
    });
  }
  return rows.sort((a, b) => b.streak - a.streak);
}

// Longest gap-free run within a set of date keys.
function longestRun(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const sorted = [...new Set(dateKeys)].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((parseLocalDate(sorted[i]).getTime() - parseLocalDate(sorted[i - 1]).getTime()) / 86400000);
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else if (diff > 1) cur = 1;
  }
  return best;
}

export function longestStreakEver(program: DailyItem[], completion: Completion): { label: string; days: number } {
  const byActivity: Record<string, string[]> = { [REFLECTION_ID]: [] };
  const labels: Record<string, string> = { [REFLECTION_ID]: REFLECTION_LABEL };
  for (const it of program) { byActivity[it.id] = []; labels[it.id] = shortLabel(it.label); }
  for (const [key, day] of Object.entries(completion)) {
    if (day.reflection) byActivity[REFLECTION_ID].push(key);
    for (const id of day.done) { if (byActivity[id]) byActivity[id].push(key); }
  }
  let best = { label: REFLECTION_LABEL, days: 0 };
  for (const [id, dates] of Object.entries(byActivity)) {
    const run = longestRun(dates);
    if (run > best.days) best = { label: labels[id] ?? id, days: run };
  }
  return best;
}

export interface HeatCell { key: string; day: number; done: number; total: number; intensity: number }
export interface HeatMonth { cells: (HeatCell | null)[]; daysWithProgress: number; daysInMonth: number }

// month is 0-based. Cells are Sunday-first (US) with leading nulls for the offset.
export function monthHeatmap(year: number, month: number, program: DailyItem[], completion: Completion): HeatMonth {
  const total = program.length + 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat, Sunday-first
  const cells: (HeatCell | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  let daysWithProgress = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const c = completion[key];
    const done = (c?.done.length ?? 0) + (c?.reflection ? 1 : 0);
    if (done > 0) daysWithProgress++;
    cells.push({ key, day: d, done, total, intensity: total ? done / total : 0 });
  }
  return { cells, daysWithProgress, daysInMonth };
}

export interface Insights {
  strongestWeekday: string | null;
  strongestSection: string | null;
  mostActiveMonth: string | null;
  longest: { label: string; days: number };
  completionRate: number; // avg % of that day's dailies completed, over active days
}

const SECTIONS = ['Morning', 'Anytime', 'Evening'] as const;

export function computeInsights(program: DailyItem[], completion: Completion): Insights {
  const whenById: Record<string, string> = {};
  for (const it of program) whenById[it.id] = it.when;

  // Current section sizes — the denominator for each section's completion rate,
  // so a bigger bucket doesn't automatically "win". (Reflection isn't sectioned.)
  const sectionSize: Record<string, number> = { Morning: 0, Anytime: 0, Evening: 0 };
  for (const it of program) if (sectionSize[it.when] !== undefined) sectionSize[it.when]++;

  // Both "strongest" insights are now average completion RATE within the bucket
  // (how completely you finish), not raw volume — accumulate rate sums + counts.
  const weekdayRate = [0, 0, 0, 0, 0, 0, 0];
  const weekdayDays = [0, 0, 0, 0, 0, 0, 0];
  const sectionRate: Record<string, number> = { Morning: 0, Anytime: 0, Evening: 0 };
  const sectionDays: Record<string, number> = { Morning: 0, Anytime: 0, Evening: 0 };
  const monthScore: Record<string, number> = {};
  const currentTotal = program.length + 1; // + permanent Daily Reflection
  let sumRate = 0;
  let activeDays = 0;

  for (const [key, day] of Object.entries(completion)) {
    const done = day.done.length + (day.reflection ? 1 : 0);
    if (done === 0) continue;              // omit days with no activity
    activeDays++;
    // Rate against that day's own possible total when we have it (older records
    // fall back to today's program size). Clamp so the fallback can't exceed 100%.
    const possible = day.total ?? currentTotal;
    const dayRate = Math.min(1, done / possible);
    sumRate += dayRate;
    const d = parseLocalDate(key);
    weekdayRate[d.getDay()] += dayRate;
    weekdayDays[d.getDay()] += 1;
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    monthScore[mk] = (monthScore[mk] ?? 0) + done;
    // Per-section rate for the day = completed-in-section ÷ that section's size.
    const secDone: Record<string, number> = { Morning: 0, Anytime: 0, Evening: 0 };
    for (const id of day.done) { const w = whenById[id]; if (w !== undefined) secDone[w] += 1; }
    for (const s of SECTIONS) {
      if (sectionSize[s] > 0) {
        sectionRate[s] += Math.min(1, secDone[s] / sectionSize[s]);
        sectionDays[s] += 1;
      }
    }
  }

  // Pick the bucket with the highest average rate (ties break by first-in-order).
  const bestByAvg = <T extends string | number>(keys: readonly T[], sums: Record<T, number> | number[], counts: Record<T, number> | number[]): T | null => {
    let best: T | null = null;
    let bestAvg = -1;
    for (const k of keys) {
      const cnt = (counts as any)[k as any];
      if (!cnt) continue;
      const avg = (sums as any)[k as any] / cnt;
      if (avg > bestAvg) { bestAvg = avg; best = k; }
    }
    return best;
  };

  const bestWeekdayIdx = bestByAvg([0, 1, 2, 3, 4, 5, 6] as const, weekdayRate, weekdayDays);
  const strongestWeekday = bestWeekdayIdx === null ? null : WEEKDAYS[bestWeekdayIdx];
  const strongestSection = bestByAvg(SECTIONS, sectionRate, sectionDays);
  let mostActiveMonth: string | null = null;
  const monthEntries = Object.entries(monthScore);
  if (monthEntries.length) {
    const [mk] = monthEntries.sort((a, b) => b[1] - a[1])[0];
    const [y, m] = mk.split('-').map(Number);
    mostActiveMonth = `${MONTHS[m]} ${y}`;
  }

  return {
    strongestWeekday,
    strongestSection,
    mostActiveMonth,
    longest: longestStreakEver(program, completion),
    completionRate: activeDays ? Math.round((sumRate / activeDays) * 100) : 0,
  };
}

export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`;
export const monthShort = (month: number) => MONTHS[month].slice(0, 3);
