// Tools wallpaper — the one net-new persisted setting in the Today/Tools refresh.
// Device-only (like Theme / Text-Size), so it is NOT part of the iCloud backup.
// Changed only via the gear picker on the Tools header.
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WallpaperKey = 'dawn' | 'coast' | 'dusk' | 'paper';

const KEY = 'tools_wallpaper';
// Default to the plain app background (the "paper" swatch), matching every other
// screen; the gradients are opt-in via the gear picker.
const DEFAULT: WallpaperKey = 'paper';
const VALID: WallpaperKey[] = ['dawn', 'coast', 'dusk', 'paper'];

export function useToolsWallpaper() {
  const [wallpaper, setWallpaperState] = useState<WallpaperKey>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v && VALID.includes(v as WallpaperKey)) setWallpaperState(v as WallpaperKey); })
      .catch(() => {});
  }, []);

  const setWallpaper = useCallback((w: WallpaperKey) => {
    setWallpaperState(w);
    AsyncStorage.setItem(KEY, w).catch(() => {});
  }, []);

  return { wallpaper, setWallpaper };
}
