import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

/**
 * User-created prayers (local-first, AsyncStorage). Built-in AA prayers live in
 * constants/prayers.ts and are read-only; these are the user's own, shown in a
 * "My Prayers" section on the Prayers screen and openable in the same reader.
 */

export interface UserPrayer {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

const KEY = 'user_prayers';

export const [UserPrayersProvider, useUserPrayers] = createContextHook(() => {
  const [prayers, setPrayers] = useState<UserPrayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) setPrayers(JSON.parse(stored));
      } catch (error) {
        console.error('[prayers] Error loading:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const mutate = useCallback((fn: (prev: UserPrayer[]) => UserPrayer[]) => {
    setPrayers((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.error('[prayers] Error saving:', e));
      return next;
    });
  }, []);

  const addPrayer = useCallback(
    (title: string, content: string) => {
      const p: UserPrayer = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim(),
        content: content.trim(),
        createdAt: Date.now(),
      };
      mutate((prev) => [...prev, p]);
    },
    [mutate],
  );

  const updatePrayer = useCallback(
    (id: string, title: string, content: string) =>
      mutate((prev) => prev.map((p) => (p.id === id ? { ...p, title: title.trim(), content: content.trim() } : p))),
    [mutate],
  );

  const removePrayer = useCallback((id: string) => mutate((prev) => prev.filter((p) => p.id !== id)), [mutate]);

  return useMemo(
    () => ({ prayers, isLoading, addPrayer, updatePrayer, removePrayer }),
    [prayers, isLoading, addPrayer, updatePrayer, removePrayer],
  );
});
