import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

/**
 * Per-day meditation time log (local-first). The meditation session writes actual
 * sat seconds here on Stop / completion; the Journey page reads the daily totals
 * to show a "Meditated X min" line. Keyed by local date (YYYY-MM-DD), matching how
 * the Journey groups its entries.
 */

const KEY = 'meditation_log';
const MIN_LOGGABLE = 5; // ignore sits under 5 seconds

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const [MeditationLogProvider, useMeditationLog] = createContextHook(() => {
  const [byDate, setByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) setByDate(JSON.parse(stored));
      } catch (error) {
        console.error('[medlog] Error loading:', error);
      }
    })();
  }, []);

  const addSeconds = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < MIN_LOGGABLE) return;
    const k = todayKey();
    setByDate((prev) => {
      const next = { ...prev, [k]: (prev[k] ?? 0) + Math.round(seconds) };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.error('[medlog] Error saving:', e));
      return next;
    });
  }, []);

  return useMemo(() => ({ byDate, addSeconds }), [byDate, addSeconds]);
});
