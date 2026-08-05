import AsyncStorage from '@react-native-async-storage/async-storage';

// QA LLM override. Read per call, so changing it applies to the next message
// without a restart. Old engine-selector keys are deliberately ignored.
export type QaEngine = 'sonnet' | 'gpt' | 'terra';

// Production default: GPT-5.4 → Anthropic Sonnet. The Dev Console can also
// lead with Terra for quality/cost evaluation; it falls back to Sonnet.
// GPT won the side-by-side ("both good, GPT feels a bit smoother and more
// Sam-like"), so it is the DEFAULT primary — the key is absent on a clean
// install and the toggle exists to fall back to Sonnet, not the reverse.
// This supersedes §24.1's Sonnet-first order.
export const DEFAULT_QA_ENGINE: QaEngine = 'gpt';

export const QA_LLM_ENGINE_KEY = 'sober_dailies_qa_llm_engine';

export const getQaEngine = async (): Promise<QaEngine> => {
  try {
    const stored = await AsyncStorage.getItem(QA_LLM_ENGINE_KEY);
    return stored === 'sonnet' || stored === 'terra' ? stored : DEFAULT_QA_ENGINE;
  } catch {
    return DEFAULT_QA_ENGINE;
  }
};

export const setQaEngine = async (engine: QaEngine): Promise<void> => {
  try {
    // Only the non-default is stored, so a device that never touches the
    // toggle always follows the shipped default if it ever changes again.
    if (engine === DEFAULT_QA_ENGINE) await AsyncStorage.removeItem(QA_LLM_ENGINE_KEY);
    else await AsyncStorage.setItem(QA_LLM_ENGINE_KEY, engine);
  } catch {}
};

// The concrete provider/model each QA setting resolves to. Both go through the
// same Supabase fn and the same server personas, so a swap changes ONLY the
// model — which is what makes the comparison meaningful.
export const QA_ENGINE_SPEC: Record<QaEngine, { provider: 'anthropic' | 'openai'; model: string; label: string }> = {
  sonnet: { provider: 'anthropic', model: 'claude-sonnet-4-6', label: 'sonnet' },
  gpt: { provider: 'openai', model: 'gpt-5.4', label: 'gpt-5.4' },
  terra: { provider: 'openai', model: 'gpt-5.6-terra', label: 'gpt-5.6 terra' },
};

export const SPONSOR_API_URL =
  process.env.EXPO_PUBLIC_SPONSOR_API_URL ||
  'https://uzfqabcjxjqufpipdcla.supabase.co/functions/v1/sponsor-chat';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZnFhYmNqeGpxdWZwaXBkY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTI4NDgsImV4cCI6MjA2ODc2ODg0OH0.kqPftTCAXLQNd0sdDpIC1TRMXjk315hn92BEW7TKXmU';

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
