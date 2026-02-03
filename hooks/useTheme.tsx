import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';
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
  const systemScheme = useSystemColorScheme();
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [colorSchemePref, setColorSchemePrefState] = useState<ColorSchemePreference>(DEFAULT_COLOR_SCHEME);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme and color scheme on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [savedThemeId, savedColorScheme] = await Promise.all([
          AsyncStorage.getItem(THEME_ID_KEY),
          AsyncStorage.getItem(COLOR_SCHEME_KEY),
        ]);
        if (savedThemeId && (savedThemeId === 'default' || savedThemeId === 'blue' || savedThemeId === 'green')) {
          setThemeIdState(savedThemeId as ThemeId);
        }
        if (savedColorScheme && (savedColorScheme === 'light' || savedColorScheme === 'dark' || savedColorScheme === 'system')) {
          setColorSchemePrefState(savedColorScheme as ColorSchemePreference);
        }
      } catch (e) {
        // keep defaults
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  // Resolve effective color scheme: 'system' -> systemScheme, else use preference
  const effectiveScheme = colorSchemePref === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : colorSchemePref;

  // Resolved palette from current theme + effective scheme
  const palette = useMemo((): ResolvedPalette => {
    const theme = getThemeById(themeId);
    
    // If theme has forcedMode, always use that regardless of user preference
    if (theme.forcedMode) {
      const variant = theme.forcedMode === 'dark' ? theme.dark : theme.light;
      if (!variant) {
        // Fallback to available variant
        const fallbackVariant = theme.dark || theme.light;
        return fallbackVariant as ResolvedPalette;
      }
      return variant as ResolvedPalette;
    }
    
    // Otherwise use effective scheme
    const variant = effectiveScheme === 'dark' 
      ? (theme.dark || theme.light) 
      : (theme.light || theme.dark);
    return variant as ResolvedPalette;
  }, [themeId, effectiveScheme]);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_ID_KEY, id);
    } catch (e) {
      // ignore
    }
  }, []);

  const setColorScheme = useCallback(async (scheme: ColorSchemePreference) => {
    setColorSchemePrefState(scheme);
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
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
