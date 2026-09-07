import AsyncStorage from '@react-native-async-storage/async-storage';

export const SPEAKER_PROGRESS_KEY = 'speaker_progress_v1';

export interface SpeakerProgress {
  positionMs: number;
  durationMs: number;
  rate: number;
  didFinish: boolean;
  updatedAt: string;
}

type ProgressMap = Record<string, SpeakerProgress>;

async function readMap(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(SPEAKER_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function getSpeakerProgress(speakerId: string): Promise<SpeakerProgress | null> {
  const map = await readMap();
  return map[speakerId] ?? null;
}

export async function saveSpeakerProgress(
  speakerId: string,
  progress: Omit<SpeakerProgress, 'updatedAt'>,
): Promise<void> {
  const map = await readMap();
  map[speakerId] = { ...progress, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(SPEAKER_PROGRESS_KEY, JSON.stringify(map));
}
