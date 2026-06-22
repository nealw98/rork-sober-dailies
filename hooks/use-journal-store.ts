// Journal — net-new, local-first freeform writing (redesign 3.0). Unlike the
// other writing tools (one entry per day), the journal keeps a running list of
// entries; saved entries surface in the Journey "Notebook". On-device only.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type JournalEntry = { id: string; ts: number; text: string };

const STORAGE_KEY = 'journal_entries_v1';

export const [JournalProvider, useJournal] = createContextHook(() => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setEntries(JSON.parse(stored));
      } catch (e) {
        console.warn('[journal] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((e) => console.warn('[journal] save failed', e));
  }, [entries, loaded]);

  const addEntry = useCallback((text: string) => {
    const id = `j${Date.now()}${Math.floor(Math.random() * 999)}`;
    setEntries((prev) => [{ id, ts: Date.now(), text }, ...prev]);
    return id;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return useMemo(() => ({ entries, addEntry, removeEntry, loaded }), [entries, addEntry, removeEntry, loaded]);
});
