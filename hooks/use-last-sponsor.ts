// Tracks the sponsor the user last chatted with, so the persistent AI Sponsor
// FAB shows that portrait and taps straight back into that conversation. Backed
// by the same AsyncStorage key the chat store uses (`aa-chat-sponsor-type`);
// defaults to Steady Eddie when there's no prior chat.
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const KEY = 'aa-chat-sponsor-type';
export const DEFAULT_SPONSOR = 'supportive'; // Steady Eddie

export const [LastSponsorProvider, useLastSponsor] = createContextHook(() => {
  const [lastSponsorId, setId] = useState<string>(DEFAULT_SPONSOR);

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
