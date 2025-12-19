import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

const STORAGE_KEY = "sd-text-settings-v1";
const DEFAULT_FONT_SIZE = 18;
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.375;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = Platform.OS === "android" ? 34 : 30;

type StoredSettings = {
  fontSize?: number;
  lineHeightMultiplier?: number;
};

const clampFontSize = (value: number) =>
  Math.max(MIN_FONT_SIZE, Math.min(value, MAX_FONT_SIZE));

export const [TextSettingsProvider, useTextSettings] = createContextHook(() => {
  const [fontSize, setFontSizeState] = useState<number>(DEFAULT_FONT_SIZE);
  const [lineHeightMultiplier, setLineHeightMultiplierState] = useState<number>(
    DEFAULT_LINE_HEIGHT_MULTIPLIER
  );
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: StoredSettings = JSON.parse(stored);
          if (typeof parsed.fontSize === "number") {
            setFontSizeState(clampFontSize(parsed.fontSize));
          }
          if (typeof parsed.lineHeightMultiplier === "number") {
            setLineHeightMultiplierState(parsed.lineHeightMultiplier);
          }
        }
      } catch (error) {
        console.error("Error loading text settings:", error);
      } finally {
        setLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Persist on change after initial load
  useEffect(() => {
    if (!loaded) return;
    const saveSettings = async () => {
      try {
        const payload: StoredSettings = {
          fontSize,
          lineHeightMultiplier,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.error("Error saving text settings:", error);
      }
    };

    saveSettings();
  }, [fontSize, lineHeightMultiplier, loaded]);

  const setFontSize = useCallback((next: number) => {
    setFontSizeState(clampFontSize(next));
  }, []);

  const setLineHeightMultiplier = useCallback((next: number) => {
    setLineHeightMultiplierState(Math.max(1.1, Math.min(next, 2)));
  }, []);

  const resetDefaults = useCallback(() => {
    setFontSizeState(DEFAULT_FONT_SIZE);
    setLineHeightMultiplierState(DEFAULT_LINE_HEIGHT_MULTIPLIER);
  }, []);

  return {
    loaded,
    fontSize,
    lineHeightMultiplier,
    lineHeight: fontSize * lineHeightMultiplier,
    setFontSize,
    setLineHeightMultiplier,
    resetDefaults,
    minFontSize: MIN_FONT_SIZE,
    maxFontSize: MAX_FONT_SIZE,
    defaultFontSize: DEFAULT_FONT_SIZE,
    defaultLineHeightMultiplier: DEFAULT_LINE_HEIGHT_MULTIPLIER,
  };
});


