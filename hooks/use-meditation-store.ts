import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

/**
 * Meditation settings (NET-NEW, local-first). The built-in timer is the hero /
 * no-config default; YouTube + external-app sources are reserved for later.
 * Soundtrack names are placeholders — no audio ships until licensing is settled
 * (DATA-SOURCES.md), so the picker persists a choice but plays nothing yet.
 */

export type SoundId = 'silence' | 'rain' | 'ocean' | 'forest';

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: 'silence', label: 'Silence' },
  { id: 'rain', label: 'Rainfall' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
];

export const SOUND_LABEL: Record<SoundId, string> = {
  silence: 'Silence',
  rain: 'Rainfall',
  ocean: 'Ocean',
  forest: 'Forest',
};

interface MeditationSettings {
  source: 'timer' | 'youtube' | 'app' | null; // null = unconfigured → timer
  hintSeen: boolean;
  timer: { minutes: number; sound: string; volume: number }; // sound = scene key; volume 0..1
}

const KEY = 'meditation_settings';
// Soundtracks are mastered loud — start gentle (0.35) so a background scene never
// overwhelms; the in-sit volume slider persists any change from here.
const DEFAULT: MeditationSettings = { source: null, hintSeen: false, timer: { minutes: 10, sound: 'silence', volume: 0.35 } };

export const [MeditationProvider, useMeditation] = createContextHook(() => {
  const [settings, setSettings] = useState<MeditationSettings>(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) setSettings({ ...DEFAULT, ...JSON.parse(stored) });
      } catch (error) {
        console.error('[meditation] Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Functional update + persist in one place (no stale-closure risk).
  const update = useCallback((mutate: (prev: MeditationSettings) => MeditationSettings) => {
    setSettings((prev) => {
      const next = mutate(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.error('[meditation] Error saving:', e));
      return next;
    });
  }, []);

  const setTimer = useCallback(
    (patch: Partial<MeditationSettings['timer']>) =>
      update((p) => ({ ...p, source: p.source ?? 'timer', timer: { ...p.timer, ...patch } })),
    [update],
  );

  const markHintSeen = useCallback(() => update((p) => ({ ...p, hintSeen: true })), [update]);

  return useMemo(
    () => ({ settings, isLoading, setTimer, markHintSeen }),
    [settings, isLoading, setTimer, markHintSeen],
  );
});
