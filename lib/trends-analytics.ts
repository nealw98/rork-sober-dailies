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

// month is 0-based. Cells are Monday-first with leading nulls for the offset.
export function monthHeatmap(year: number, month: number, program: DailyItem[], completion: Completion): HeatMonth {
  const total = program.length + 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const jsDow = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const offset = (jsDow + 6) % 7; // Monday-first
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

export function computeInsights(program: DailyItem[], completion: Completion): Insights {
  const whenById: Record<string, string> = {};
  for (const it of program) whenById[it.id] = it.when;

  const weekdayScore = [0, 0, 0, 0, 0, 0, 0];
  const sectionScore: Record<string, number> = { Morning: 0, Anytime: 0, Evening: 0 };
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
    sumRate += Math.min(1, done / possible);
    const d = parseLocalDate(key);
    weekdayScore[d.getDay()] += done;
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    monthScore[mk] = (monthScore[mk] ?? 0) + done;
    for (const id of day.done) { const w = whenById[id]; if (w) sectionScore[w] += 1; }
  }

  const strongestWeekday = activeDays ? WEEKDAYS[weekdayScore.indexOf(Math.max(...weekdayScore))] : null;
  const secMax = Math.max(sectionScore.Morning, sectionScore.Anytime, sectionScore.Evening);
  const strongestSection = secMax > 0 ? (['Morning', 'Anytime', 'Evening'] as const).find((s) => sectionScore[s] === secMax) ?? null : null;
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
