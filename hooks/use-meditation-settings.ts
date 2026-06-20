import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type MeditationSource = 'timer' | 'youtube' | 'app';
export type MeditationSoundtrack = 'silence' | 'rain' | 'ocean' | 'forest';
export type MeditationAppId = 'calm' | 'headspace' | 'insight';

export type MeditationTimerConfig = {
  minutes: number;
  sound: MeditationSoundtrack;
};

export type MeditationYouTubeConfig = {
  url: string;
  title: string;
  label: string;
};

export type MeditationAppConfig = {
  id: MeditationAppId;
  minutes: number;
};

export type MeditationSettings = {
  source: MeditationSource | null;
  timer: MeditationTimerConfig;
  youtube: MeditationYouTubeConfig;
  app: MeditationAppConfig;
};

export type MeditationAppOption = {
  id: MeditationAppId;
  name: string;
  glyph: string;
  accent: string;
  subtitle: string;
  appUrl: string;
  appStoreUrl: string;
};

const MEDITATION_SETTINGS_KEY = 'sober_dailies_meditation_settings_v1';
const LEGACY_MEDITATION_SOURCE_KEY = 'sober_dailies_meditation_source_v1';

export const MEDITATION_APPS: MeditationAppOption[] = [
  {
    id: 'calm',
    name: 'Calm',
    glyph: 'C',
    accent: '#3F5BB8',
    subtitle: 'Sleep, meditation, music',
    appUrl: 'calm://',
    appStoreUrl: 'https://apps.apple.com/us/app/calm/id571800810',
  },
  {
    id: 'headspace',
    name: 'Headspace',
    glyph: 'H',
    accent: '#F47C45',
    subtitle: 'Guided meditation',
    appUrl: 'headspace://',
    appStoreUrl: 'https://apps.apple.com/us/app/headspace-meditation-sleep/id493145008',
  },
  {
    id: 'insight',
    name: 'Insight Timer',
    glyph: 'IT',
    accent: '#3D8B8B',
    subtitle: 'Free meditation library',
    appUrl: 'insighttimer://',
    appStoreUrl: 'https://apps.apple.com/us/app/insight-timer-meditate-sleep/id337472899',
  },
];

export const DEFAULT_MEDITATION_SETTINGS: MeditationSettings = {
  source: null,
  timer: { minutes: 10, sound: 'rain' },
  youtube: {
    url: 'youtube.com/watch?v=inpok4MKVLM',
    title: '5-Minute Meditation You Can Do Anywhere',
    label: '5-min breathing',
  },
  app: { id: 'calm', minutes: 10 },
};

function isMeditationSource(value: unknown): value is MeditationSource {
  return value === 'timer' || value === 'youtube' || value === 'app';
}

function isMeditationSoundtrack(value: unknown): value is MeditationSoundtrack {
  return value === 'silence' || value === 'rain' || value === 'ocean' || value === 'forest';
}

function isMeditationAppId(value: unknown): value is MeditationAppId {
  return value === 'calm' || value === 'headspace' || value === 'insight';
}

function normalizeSettings(value: unknown): MeditationSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_MEDITATION_SETTINGS;
  }

  const maybe = value as Partial<MeditationSettings>;
  return {
    source: isMeditationSource(maybe.source) ? maybe.source : null,
    timer: {
      minutes: typeof maybe.timer?.minutes === 'number' ? maybe.timer.minutes : DEFAULT_MEDITATION_SETTINGS.timer.minutes,
      sound: isMeditationSoundtrack(maybe.timer?.sound) ? maybe.timer.sound : DEFAULT_MEDITATION_SETTINGS.timer.sound,
    },
    youtube: {
      url: typeof maybe.youtube?.url === 'string' ? maybe.youtube.url : DEFAULT_MEDITATION_SETTINGS.youtube.url,
      title: typeof maybe.youtube?.title === 'string' ? maybe.youtube.title : DEFAULT_MEDITATION_SETTINGS.youtube.title,
      label: typeof maybe.youtube?.label === 'string' ? maybe.youtube.label : DEFAULT_MEDITATION_SETTINGS.youtube.label,
    },
    app: {
      id: isMeditationAppId(maybe.app?.id) ? maybe.app.id : DEFAULT_MEDITATION_SETTINGS.app.id,
      minutes: typeof maybe.app?.minutes === 'number' ? maybe.app.minutes : DEFAULT_MEDITATION_SETTINGS.app.minutes,
    },
  };
}

export async function getMeditationSettings(): Promise<MeditationSettings> {
  const stored = await AsyncStorage.getItem(MEDITATION_SETTINGS_KEY);
  if (stored) {
    try {
      return normalizeSettings(JSON.parse(stored));
    } catch (error) {
      console.error('[Meditation] Failed to parse settings', error);
    }
  }

  const legacySource = await AsyncStorage.getItem(LEGACY_MEDITATION_SOURCE_KEY);
  if (isMeditationSource(legacySource)) {
    return { ...DEFAULT_MEDITATION_SETTINGS, source: legacySource };
  }

  return DEFAULT_MEDITATION_SETTINGS;
}

export async function getMeditationSource(): Promise<MeditationSource | null> {
  const settings = await getMeditationSettings();
  return settings.source;
}

export async function saveMeditationSettings(settings: MeditationSettings) {
  await AsyncStorage.setItem(MEDITATION_SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}

export function getSelectedMeditationApp(settings: MeditationSettings) {
  return MEDITATION_APPS.find(app => app.id === settings.app.id) ?? MEDITATION_APPS[0];
}

export function getMeditationSummary(settings: MeditationSettings) {
  if (!settings.source) return 'Not set up — opens the built-in timer';
  if (settings.source === 'timer') return `Built-in timer · ${settings.timer.minutes} min`;
  if (settings.source === 'youtube') return `YouTube · ${settings.youtube.label || 'video'}`;
  const selectedApp = getSelectedMeditationApp(settings);
  return `${selectedApp.name} · ${settings.app.minutes} min`;
}

export function useMeditationSettings() {
  const [settings, setSettingsState] = useState<MeditationSettings>(DEFAULT_MEDITATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getMeditationSettings()
      .then(storedSettings => {
        if (mounted) setSettingsState(storedSettings);
      })
      .catch(error => {
        console.error('[Meditation] Failed to load settings', error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setSettings = useCallback(async (nextSettings: MeditationSettings) => {
    const normalized = normalizeSettings(nextSettings);
    setSettingsState(normalized);
    await saveMeditationSettings(normalized);
  }, []);

  const setSource = useCallback(async (nextSource: MeditationSource) => {
    const nextSettings = { ...settings, source: nextSource };
    setSettingsState(nextSettings);
    await saveMeditationSettings(nextSettings);
  }, [settings]);

  return useMemo(() => ({
    isConfigured: !!settings.source,
    isLoading,
    setSettings,
    setSource,
    settings,
    source: settings.source,
  }), [isLoading, setSettings, setSource, settings]);
}
