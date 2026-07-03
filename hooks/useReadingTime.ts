import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { logEvent } from '@/lib/analytics';

/**
 * Measures how long a reader stays open and fires one
 * `literature_read` { book, duration_seconds, ...extra } when it closes.
 *
 * Mount the hook in a reader that exists only while reading (both PdfReader and
 * BigBookHtmlReader unmount on close). The clock pauses while the app is
 * backgrounded, so a reader left open overnight doesn't log a 9-hour read.
 * Sessions under 5 seconds are ignored.
 */
export function useReadingTime(book: string, extra?: Record<string, any>) {
  const accumRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const extraRef = useRef(extra);
  extraRef.current = extra;

  useEffect(() => {
    startRef.current = Date.now();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        if (startRef.current == null) startRef.current = Date.now();
      } else if (startRef.current != null) {
        accumRef.current += Date.now() - startRef.current;
        startRef.current = null;
      }
    });
    return () => {
      sub.remove();
      if (startRef.current != null) accumRef.current += Date.now() - startRef.current;
      const seconds = Math.round(accumRef.current / 1000);
      if (seconds >= 5) logEvent('literature_read', { book, duration_seconds: seconds, ...extraRef.current });
      accumRef.current = 0;
      startRef.current = null;
    };
  }, [book]);
}
