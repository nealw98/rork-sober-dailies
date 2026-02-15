import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Speaker {
  id: string;
  speaker: string;
  hometown: string;
  meeting: string;
  date: string | null;
  title: string;
  subtitle: string | null;
  sobriety_years: string | null;
  core_themes: string;
  audience: string | null;
  explicit: boolean;
  substances: string | null;
  youtube_id: string;
  youtube_url: string;
  audio_url: string | null;
  quote: string | null;
  created_at: string | null;
}

interface CachedSpeakers {
  speakers: Speaker[];
  cached_at: string;
}

const CACHE_KEY = 'speakers_cache';

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpeakers = useCallback(async () => {
    try {
      // Load cache first for instant display
      const cached = await getCachedSpeakers();
      if (cached) {
        setSpeakers(cached.speakers);
        setIsLoading(false);
      }

      // Always fetch fresh data from Supabase
      const { data, error: fetchError } = await supabase
        .from('speakers')
        .select('*')
        .order('date', { ascending: false, nullsFirst: false });

      if (fetchError) {
        console.error('[Speakers] Error fetching:', fetchError);
        setError(fetchError.message);
        // Keep cached data if available
        if (!cached) {
          setIsLoading(false);
        }
        return;
      }

      if (data) {
        setSpeakers(data as Speaker[]);
        await cacheSpeakers(data as Speaker[]);
      }
    } catch (err) {
      console.error('[Speakers] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  return { speakers, isLoading, error, refetch: fetchSpeakers };
}

async function getCachedSpeakers(): Promise<CachedSpeakers | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

async function cacheSpeakers(speakers: Speaker[]): Promise<void> {
  try {
    const data: CachedSpeakers = {
      speakers,
      cached_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[Speakers] Error caching:', err);
  }
}
