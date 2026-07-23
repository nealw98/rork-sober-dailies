// Local daily cap on AI sponsor messages. Every sponsor message is a
// client→Rork LLM call that costs money, and that path has no backend in
// between — so the cap lives on-device: a {day, count} record in AsyncStorage,
// reset whenever the calendar day changes (same dayKey pattern as
// lib/growthPrompts.ts). A daily cap alone bounds the month too, so there is
// no separate monthly limit. Resettable by reinstalling, which is fine — this
// is a runaway brake, not billing enforcement.
import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_KEY = 'sponsor_chat_daily_usage'; // JSON {day, count}

export const DAILY_SPONSOR_LIMIT = 25;

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type UsageRecord = { day: string; count: number };

async function readToday(): Promise<UsageRecord> {
  const today = dayKey();
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    if (raw) {
      const cur: UsageRecord = JSON.parse(raw);
      if (cur.day === today && typeof cur.count === 'number') return cur;
    }
  } catch {
    // fall through to a fresh record — a corrupt read shouldn't lock the user out
  }
  return { day: today, count: 0 };
}

// Whether another message may be sent today, and how many have been sent.
export async function checkSponsorMessageLimit(): Promise<{ allowed: boolean; count: number }> {
  const cur = await readToday();
  return { allowed: cur.count < DAILY_SPONSOR_LIMIT, count: cur.count };
}

// Count one sent message against today.
export async function recordSponsorMessage(): Promise<void> {
  try {
    const cur = await readToday();
    cur.count += 1;
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(cur));
  } catch {
    // ignore — never block the send over a storage write failure
  }
}
