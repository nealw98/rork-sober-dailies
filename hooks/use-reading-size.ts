// Shared reading-size ("Aa") preference for long-form reading surfaces.
// ONE value drives every reader (Daily Reflection, Big Book, prayers, meeting
// readings, sponsor chat, markdown) — the in-reader "Aa" in any of them writes
// here, so it's a single reading-comfort setting surfaced wherever you read
// (the Apple Books model), not a per-screen size.
//
// The ladder mirrors Apple's Dynamic Type "Body" sizes across the standard
// content-size categories (Small…xxxLarge): 15/17/19/21/23, default 19 (the
// middle step). Values are absolute pt; RN's default allowFontScaling still
// multiplies
// by the OS text-size, so this layers ON TOP of Dynamic Type rather than
// overriding it. The big accessibility sizes stay the OS's job.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { READING_FONT_SIZE } from '@/constants/fonts';

const STORAGE_KEY = 'sd-reading-size-v1';
const LINE_HEIGHT_RATIO = 1.5;

export const READING_SIZE_STEPS = [15, 17, 19, 21, 23] as const;
const MIN = READING_SIZE_STEPS[0];
const MAX = READING_SIZE_STEPS[READING_SIZE_STEPS.length - 1];
const DEFAULT_SIZE = READING_FONT_SIZE; // 19 = the middle step

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export const [ReadingSizeProvider, useReadingSize] = createContextHook(() => {
  const [size, setSizeState] = useState<number>(DEFAULT_SIZE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v != null) {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n)) setSizeState(clamp(n));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setReadingSize = useCallback((n: number) => {
    const c = clamp(n);
    setSizeState(c);
    AsyncStorage.setItem(STORAGE_KEY, String(c)).catch(() => {});
  }, []);

  return {
    loaded,
    readingSize: size,
    readingLineHeight: Math.round(size * LINE_HEIGHT_RATIO),
    setReadingSize,
    steps: READING_SIZE_STEPS,
  };
});
