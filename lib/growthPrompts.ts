// Use-day clock — distinct days the app was opened, plus the first-use
// timestamp. (Formerly also the growth-nudge slot schedule; the nudges were
// retired 2026-07-20 — the only pass reminders are the post-subscribe
// thank-you and the badged gift icon. The clock survives because the
// app-review prompt's 15-day wait measures from firstUseAt; see
// lib/reviewPrompt.ts. Today calls recordUseDay on mount.)
import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_DAYS_KEY = 'growth_use_days'; // JSON {count, last, first} — distinct days opened + first-use ms

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
