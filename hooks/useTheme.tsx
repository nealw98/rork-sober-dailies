import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import type { ThemeId, ColorSchemePreference, ResolvedPalette } from '@/types/theme';
import {
  getThemeById,
  DEFAULT_THEME_ID,
  DEFAULT_COLOR_SCHEME,
  THEMES,
} from '@/constants/themes';

const THEME_ID_KEY = 'theme_id';
const COLOR_SCHEME_KEY = 'color_scheme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [colorSchemePref, setColorSchemePrefState] = useState<ColorSchemePreference>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme and color scheme on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [savedThemeId, savedColorScheme] = await Promise.all([
          AsyncStorage.getItem(THEME_ID_KEY),
          AsyncStorage.getItem(COLOR_SCHEME_KEY),
        ]);
        // The 3.0 redesign currently has an approved light palette only.
        // Ignore legacy theme and dark-mode preferences until those visuals
        // are intentionally designed.
        if (savedThemeId === 'default') setThemeIdState('default');
        if (savedColorScheme === 'light') setColorSchemePrefState('light');
      } catch (e) {
        // keep defaults
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const effectiveScheme = 'light' as const;

  // Resolved palette from current theme + effective scheme
  const palette = useMemo((): ResolvedPalette => {
    const theme = getThemeById(themeId);
    
    return (theme.light || theme.dark) as ResolvedPalette;
  }, [themeId]);

  const setThemeId = useCallback(async (id: ThemeId) => {
    // Only the approved 3.0 light theme is selectable.
    setThemeIdState('default');
    try {
      await AsyncStorage.setItem(THEME_ID_KEY, 'default');
    } catch (e) {
      // ignore
    }
  }, []);

  const setColorScheme = useCallback(async (scheme: ColorSchemePreference) => {
    setColorSchemePrefState('light');
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, 'light');
    } catch (e) {
      // ignore
    }
  }, []);

  return {
    themeId,
    colorScheme: colorSchemePref,
    effectiveScheme,
    palette,
    setThemeId,
    setColorScheme,
    isThemeLoaded: isLoaded,
    themes: THEMES,
  };
});
