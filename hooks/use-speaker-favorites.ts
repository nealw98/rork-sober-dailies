// Saved speaker tapes — net-new, local-first. The user's bookmarked tapes (by
// speaker id), powering the Library's "Saved" filter and the Save toggle. Stored
// in AsyncStorage and included in the iCloud backup (SYNC_KEYS).
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const STORAGE_KEY = 'speaker_favorites_v1';

export const [SpeakerFavoritesProvider, useSpeakerFavorites] = createContextHook(() => {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSavedIds(JSON.parse(stored) as string[]);
      } catch (e) {
        console.warn('[speaker-favorites] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds)).catch((e) => console.warn('[speaker-favorites] save failed', e));
  }, [savedIds, loaded]);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

  return useMemo(
    () => ({ savedIds, savedCount: savedIds.length, isSaved, toggleSaved, loaded }),
    [savedIds, isSaved, toggleSaved, loaded],
  );
});
