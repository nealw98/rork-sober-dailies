import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Meditation scenes (ambiences) from Supabase `meditation_scenes`. Each scene
 * bundles a still image + optional animated version + optional audio loop, keyed
 * by `scene_key` (= the app's persisted soundtrack id). Read-only content; the
 * app resolves public URLs and falls back to the bundled image when a path is
 * null. See `sql/create_meditation_scenes.sql`.
 */

export interface MeditationScene {
  key: string;
  name: string;
  stillUri: string | null;
  animatedUri: string | null;
  audioUri: string | null;
}

function publicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function fetchScenes(): Promise<Record<string, MeditationScene>> {
  const { data, error } = await supabase
    .from('meditation_scenes')
    .select('scene_key, name, image_bucket, still_path, animated_path, audio_bucket, audio_path')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const byKey: Record<string, MeditationScene> = {};
  for (const row of data ?? []) {
    byKey[row.scene_key] = {
      key: row.scene_key,
      name: row.name,
      stillUri: publicUrl(row.image_bucket, row.still_path),
      animatedUri: publicUrl(row.image_bucket, row.animated_path),
      audioUri: publicUrl(row.audio_bucket, row.audio_path),
    };
  }
  return byKey;
}

/** Scenes keyed by `scene_key` (empty while loading / offline). */
export function useMeditationScenes(): Record<string, MeditationScene> {
  const { data } = useQuery({
    queryKey: ['meditationScenes'],
    queryFn: fetchScenes,
    staleTime: 1000 * 60 * 60 * 12,
    gcTime: 1000 * 60 * 60 * 24,
  });
  return data ?? {};
}
