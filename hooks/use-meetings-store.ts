// My meetings — net-new, manual-add only (local-first). The user's saved
// regular meetings, powering the Meetings page's "Next up" card. Day/time are
// stored as structured fields (weekday|'daily' + minutes-since-midnight) so
// Next-up computes reliably against the device clock. See the Meetings handoff.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type MeetingDay = number | 'daily'; // 0 = Sunday … 6 = Saturday

export type Meeting = {
  id: string;
  name: string;
  day: MeetingDay;
  time: number | null; // minutes since midnight; null if unset
  where: string;
  notes: string;
  online: boolean;
};

const STORAGE_KEY = 'my_meetings_v1';

export const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTime(min: number | null): string {
  if (min == null) return '';
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Display string for a meeting's schedule, e.g. "Daily · 7:00 AM" / "Wed · 6:30 PM".
export function whenLabel(m: Meeting): string {
  const day = m.day === 'daily' ? 'Daily' : WEEKDAY_ABBR[m.day];
  const t = formatTime(m.time);
  return t ? `${day} · ${t}` : day;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// The next datetime this meeting occurs, on or after `now`.
function nextOccurrence(m: Meeting, now: Date): Date {
  const at = new Date(now);
  const time = m.time ?? 0;
  at.setHours(Math.floor(time / 60), time % 60, 0, 0);
  if (m.day === 'daily') {
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    return at;
  }
  let daysUntil = (m.day - now.getDay() + 7) % 7;
  if (daysUntil === 0 && at.getTime() <= now.getTime()) daysUntil = 7;
  at.setDate(at.getDate() + daysUntil);
  return at;
}

// The soonest upcoming saved meeting + a relative label ("Today · 7:00 AM").
export function nextUpMeeting(
  meetings: Meeting[],
  now: Date = new Date(),
): { meeting: Meeting; index: number; label: string } | null {
  let bestIndex = -1;
  let bestTime = Infinity;
  meetings.forEach((m, i) => {
    const t = nextOccurrence(m, now).getTime();
    if (t < bestTime) { bestTime = t; bestIndex = i; }
  });
  if (bestIndex < 0) return null;
  const meeting = meetings[bestIndex];
  const at = new Date(bestTime);
  const daysDiff = Math.round((startOfDay(at).getTime() - startOfDay(now).getTime()) / 86400000);
  const rel = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : WEEKDAY_FULL[at.getDay()];
  const t = formatTime(meeting.time);
  return { meeting, index: bestIndex, label: t ? `${rel} · ${t}` : rel };
}

export const [MeetingsProvider, useMeetings] = createContextHook(() => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setMeetings(JSON.parse(stored));
      } catch (e) {
        console.warn('[meetings] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meetings)).catch((e) => console.warn('[meetings] save failed', e));
  }, [meetings, loaded]);

  const addMeeting = useCallback((m: Omit<Meeting, 'id'>) => {
    const id = `m${Date.now()}${Math.floor(Math.random() * 999)}`;
    setMeetings((prev) => [...prev, { ...m, id }]);
    return id;
  }, []);

  const removeMeeting = useCallback((id: string) => {
    setMeetings((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return useMemo(() => ({ meetings, addMeeting, removeMeeting, loaded }), [meetings, addMeeting, removeMeeting, loaded]);
});
