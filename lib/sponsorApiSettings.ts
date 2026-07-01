import AsyncStorage from '@react-native-async-storage/async-storage';

export const SPONSOR_API_TEMPERATURE_KEY = 'sponsor_api_temperature';
export const DEFAULT_SPONSOR_API_TEMPERATURE = 0.8;
export const MIN_SPONSOR_API_TEMPERATURE = 0;
export const MAX_SPONSOR_API_TEMPERATURE = 1.2;

export type SponsorApiProvider = 'openai' | 'anthropic';
export const SPONSOR_API_PROVIDER_KEY = 'sponsor_api_provider'; // legacy key (openai | anthropic)

// The engine picks both the provider and the specific test model.
export type SponsorApiEngine = 'openai-mini' | 'openai-5-4' | 'anthropic-haiku' | 'anthropic-sonnet';
export const SPONSOR_API_ENGINE_KEY = 'sponsor_api_engine';
export const DEFAULT_SPONSOR_API_ENGINE: SponsorApiEngine = 'openai-mini';

export interface SponsorApiEngineOption {
  id: SponsorApiEngine;
  label: string;
  provider: SponsorApiProvider;
  model: string;
}

export const SPONSOR_API_ENGINES: SponsorApiEngineOption[] = [
  { id: 'openai-mini', label: 'GPT-5.4 mini', provider: 'openai', model: 'gpt-5.4-mini' },
  { id: 'openai-5-4', label: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4' },
  { id: 'anthropic-haiku', label: 'Haiku 4.5', provider: 'anthropic', model: 'claude-haiku-4-5' },
  { id: 'anthropic-sonnet', label: 'Sonnet 4.6', provider: 'anthropic', model: 'claude-sonnet-4-6' },
];

const isSponsorApiEngine = (v: unknown): v is SponsorApiEngine =>
  v === 'openai-mini' || v === 'openai-5-4' || v === 'anthropic-haiku' || v === 'anthropic-sonnet';

export const engineToRequest = (
  engine: SponsorApiEngine
): { provider: SponsorApiProvider; model?: string } => {
  const opt = SPONSOR_API_ENGINES.find((e) => e.id === engine) ?? SPONSOR_API_ENGINES[0];
  return { provider: opt.provider, model: opt.model };
};
export const SPONSOR_API_URL =
  process.env.EXPO_PUBLIC_SPONSOR_API_URL ||
  'https://uzfqabcjxjqufpipdcla.supabase.co/functions/v1/sponsor-chat';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZnFhYmNqeGpxdWZwaXBkY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTI4NDgsImV4cCI6MjA2ODc2ODg0OH0.kqPftTCAXLQNd0sdDpIC1TRMXjk315hn92BEW7TKXmU';

export const clampSponsorApiTemperature = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SPONSOR_API_TEMPERATURE;
  return Math.min(MAX_SPONSOR_API_TEMPERATURE, Math.max(MIN_SPONSOR_API_TEMPERATURE, value));
};

export const getSponsorApiTemperature = async (): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(SPONSOR_API_TEMPERATURE_KEY);
    if (stored == null) return DEFAULT_SPONSOR_API_TEMPERATURE;
    return clampSponsorApiTemperature(Number(stored));
  } catch {
    return DEFAULT_SPONSOR_API_TEMPERATURE;
  }
};

export const setSponsorApiTemperature = async (value: number): Promise<number> => {
  const next = clampSponsorApiTemperature(value);
  await AsyncStorage.setItem(SPONSOR_API_TEMPERATURE_KEY, String(next));
  return next;
};

export const getSponsorApiEngine = async (): Promise<SponsorApiEngine> => {
  try {
    const stored = await AsyncStorage.getItem(SPONSOR_API_ENGINE_KEY);
    if (isSponsorApiEngine(stored)) return stored;
    if (stored === 'openai') return 'openai-mini';
    // Migrate the older openai/anthropic provider setting (anthropic → Haiku).
    const legacy = await AsyncStorage.getItem(SPONSOR_API_PROVIDER_KEY);
    if (legacy === 'openai') return 'openai-mini';
    if (legacy === 'anthropic') return 'anthropic-haiku';
    return DEFAULT_SPONSOR_API_ENGINE;
  } catch {
    return DEFAULT_SPONSOR_API_ENGINE;
  }
};

export const setSponsorApiEngine = async (
  value: SponsorApiEngine
): Promise<SponsorApiEngine> => {
  const next = isSponsorApiEngine(value) ? value : DEFAULT_SPONSOR_API_ENGINE;
  await AsyncStorage.setItem(SPONSOR_API_ENGINE_KEY, next);
  return next;
};

export const normalizeSponsorApiUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed || SPONSOR_API_URL;
};

export const getSponsorApiUrl = async (): Promise<string> => {
  return SPONSOR_API_URL;
};

export const getSponsorApiChatUrl = (baseUrl: string): string => {
  const normalized = normalizeSponsorApiUrl(baseUrl);
  if (normalized.includes('/functions/v1/sponsor-chat')) return normalized;
  return `${normalized}/api/chat`;
};
