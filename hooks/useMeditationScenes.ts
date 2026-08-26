import { supabase } from '@/lib/supabase';
import type { AVPlaybackSource } from 'expo-av';

/**
 * Meditation scenes (ambiences). With only a handful of scenes there's no need
 * for a DB table — the list is hardcoded here and just points at the files in the
 * public Supabase image bucket. Audio is deliberately bundled with the app so
 * every built-in meditation remains available offline. To add a scene, add its
 * image definition and place its soundtrack under assets/.
 *
 *   image bucket: meditation-images   ·   audio: local Expo assets
 *
 * `still`/`animated` are image-bucket paths; `audioSource` is a local module.
 */

export interface MeditationScene {
  key: string;
  name: string;
  stillUri: string | null;
  animatedUri: string | null;
  audioSource: AVPlaybackSource | null;
}

const IMAGE_BUCKET = 'meditation-images';

const publicUrl = (bucket: string, path: string | null): string | null =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

// Scene images remain remotely managed; soundtrack modules ship with the app/update.
const SCENE_DEFS: { key: string; name: string; still: string | null; animated: string | null; audioSource: AVPlaybackSource | null }[] = [
  { key: 'silence', name: 'Silence', still: 'meditation-hero1.webp', animated: null, audioSource: null },
  { key: 'autumn-sky', name: 'Autumn Sky', still: 'autumn-sky.webp', animated: null, audioSource: require('@/assets/autumn-sky-meditation.m4a') },
  { key: 'sunrise', name: 'Sunrise', still: 'sunrise.webp', animated: null, audioSource: require('@/assets/sunrise.m4a') },
  { key: 'summer-rain', name: 'Summer Rain', still: 'summer-rain.webp', animated: null, audioSource: require('@/assets/summer_rain.m4a') },
  { key: 'snowfall', name: 'Snowfall', still: 'snowing.webp', animated: null, audioSource: require('@/assets/snowfall.m4a') },
];

const SCENES: Record<string, MeditationScene> = Object.fromEntries(
  SCENE_DEFS.map((s) => [
    s.key,
    {
      key: s.key,
      name: s.name,
      stillUri: publicUrl(IMAGE_BUCKET, s.still),
      animatedUri: publicUrl(IMAGE_BUCKET, s.animated),
      audioSource: s.audioSource,
    },
  ]),
);

/** Scenes keyed by `key`. Static — no fetch, no loading state. */
export function useMeditationScenes(): Record<string, MeditationScene> {
  return SCENES;
}
