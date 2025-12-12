import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

import { addReadingTime } from '@/lib/reviewPrompt';

const MIN_SESSION_MINUTES = 0.1; // ~6 seconds to avoid noise

export function useReadingSession(source: 'literature') {
  const startRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      startRef.current = Date.now();

      return () => {
        if (startRef.current == null) {
          return;
        }

        const elapsedMs = Date.now() - startRef.current;
        startRef.current = null;

        const minutes = elapsedMs / 60000;
        if (minutes < MIN_SESSION_MINUTES) {
          return;
        }

        addReadingTime(source, minutes).catch((error) => {
          console.warn('[reviewPrompt] Failed to record reading session', error);
        });
      };
    }, [source]),
  );
}

