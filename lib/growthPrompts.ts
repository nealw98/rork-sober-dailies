// Growth nudges — gating for the word-of-mouth prompts (components/GrowthNudges.tsx).
//
// ONE alternating schedule, denominated in USE-days (distinct days the app was
// opened — usage, not sobriety time, is the signal the app is helping, and it
// works for users who never set a sober date):
//
//   use-day 30 → INVITE · 60 → GIFT · 90 → INVITE · 120 → GIFT · 150 → INVITE
//   · 180 → GIFT, then every 90 use-days, still alternating.
//
// Each slot fires once, ever. A GIFT slot requires ≥60 days sober (the gift
// sheet sells something; a newcomer shouldn't see it) — an ineligible gift
// slot downgrades to an invite card rather than interrupting the rhythm.
// At most one growth nudge per app session.
//
// The app-review prompt is deliberately NOT part of this schedule — reviews
// aren't direct promotion. It has its own engagement gate (lib/reviewPrompt.ts)
// and only shares `firstUseAt()` from here.
import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_DAYS_KEY = 'growth_use_days';                     // JSON {count, last, first} — distinct days opened + first-use ms
const SLOTS_SHOWN_KEY = 'growth_invite_thresholds_shown';   // JSON number[] — schedule slots already used

const GIFT_MIN_SOBER_DAYS = 60;

// Slot ladder: every 30 use-days for the first six months, then every 90.
const EARLY_EVERY = 30;
const EARLY_UNTIL = 180;
const LATE_EVERY = 90;

export type GrowthSlot = { threshold: number; type: 'invite' | 'gift' };

function ladderUpTo(useDays: number): number[] {
  const out: number[] = [];
  for (let t = EARLY_EVERY; t <= EARLY_UNTIL && t <= useDays; t += EARLY_EVERY) out.push(t);
  for (let t = EARLY_UNTIL + LATE_EVERY; t <= useDays; t += LATE_EVERY) out.push(t);
  return out;
}

// Slots alternate starting with invite: 30 invite, 60 gift, 90 invite, …
function slotType(threshold: number): 'invite' | 'gift' {
  const idx =
    threshold <= EARLY_UNTIL
      ? threshold / EARLY_EVERY - 1
      : EARLY_UNTIL / EARLY_EVERY - 1 + (threshold - EARLY_UNTIL) / LATE_EVERY;
  return idx % 2 === 0 ? 'invite' : 'gift';
}

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type UseRecord = { count: number; last: string; first: number };

// Bump the distinct-use-day counter (idempotent per calendar day) and return it.
export async function recordUseDay(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(USE_DAYS_KEY);
    const cur: UseRecord = raw ? { first: Date.now(), ...JSON.parse(raw) } : { count: 0, last: '', first: Date.now() };
    const today = dayKey();
    if (cur.last !== today) {
      cur.count += 1;
      cur.last = today;
      await AsyncStorage.setItem(USE_DAYS_KEY, JSON.stringify(cur));
    }
    return cur.count;
  } catch {
    return 0;
  }
}

// When this install was first opened (ms epoch; null before the first
// recordUseDay). The review prompt's 15-day wait measures from here.
export async function firstUseAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(USE_DAYS_KEY);
    if (!raw) return null;
    const cur: Partial<UseRecord> = JSON.parse(raw);
    return typeof cur.first === 'number' ? cur.first : null;
  } catch {
    return null;
  }
}

// One growth nudge per app session, whichever claims it first.
let sessionClaimed = false;
export function claimNudgeSession(): boolean {
  if (sessionClaimed) return false;
  sessionClaimed = true;
  return true;
}

// The highest schedule slot this use-count has reached that hasn't been used.
// No expiry — a slot stays pending until shown + resolved. Pass the user's
// sober days (null = no date set) for the gift-eligibility downgrade.
export async function pendingGrowthSlot(useDays: number, soberDays: number | null): Promise<GrowthSlot | null> {
  try {
    const raw = await AsyncStorage.getItem(SLOTS_SHOWN_KEY);
    const shown: number[] = raw ? JSON.parse(raw) : [];
    const due = ladderUpTo(useDays).filter((t) => !shown.includes(t));
    if (due.length === 0) return null;
    const threshold = due[due.length - 1];
    let type = slotType(threshold);
    if (type === 'gift' && (soberDays == null || soberDays < GIFT_MIN_SOBER_DAYS)) type = 'invite';
    return { threshold, type };
  } catch {
    return null;
  }
}

export async function markGrowthSlotDone(threshold: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SLOTS_SHOWN_KEY);
    const shown: number[] = raw ? JSON.parse(raw) : [];
    if (!shown.includes(threshold)) shown.push(threshold);
    await AsyncStorage.setItem(SLOTS_SHOWN_KEY, JSON.stringify(shown));
  } catch {}
}
