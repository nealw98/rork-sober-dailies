// Tracks the sponsor the user last opened from the persistent AI Sponsor FAB.
// This intentionally has its own key instead of reusing the chat store's default
// sponsor key, so a new user starts in an unselected state until they choose.
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const KEY = 'aa-last-opened-sponsor';

export const [LastSponsorProvider, useLastSponsor] = createContextHook(() => {
  const [lastSponsorId, setId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) setId(stored);
      } catch { /* ignore */ }
    })();
  }, []);

  const setLastSponsor = useCallback((id: string) => {
    setId(id);
    AsyncStorage.setItem(KEY, id).catch(() => {});
  }, []);

  return useMemo(() => ({ lastSponsorId, setLastSponsor }), [lastSponsorId, setLastSponsor]);
});
