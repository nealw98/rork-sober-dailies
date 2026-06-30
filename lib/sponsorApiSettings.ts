import AsyncStorage from '@react-native-async-storage/async-storage';

export const SPONSOR_API_TEMPERATURE_KEY = 'sponsor_api_temperature';
export const DEFAULT_SPONSOR_API_TEMPERATURE = 0.8;
export const MIN_SPONSOR_API_TEMPERATURE = 0;
export const MAX_SPONSOR_API_TEMPERATURE = 1.2;
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
