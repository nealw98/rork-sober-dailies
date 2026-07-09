import { supabase } from '@/lib/supabase';

/**
 * Meditation scenes (ambiences). With only a handful of scenes there's no need
 * for a DB table — the list is hardcoded here and just points at the files in the
 * public Supabase buckets. To add a scene: upload its image (and optional audio)
 * to the buckets and add a row to SCENE_DEFS below.
 *
 *   image bucket: meditation-images   ·   audio bucket: meditation-audio
 *
 * `still`/`animated`/`audio` are object paths within those buckets (null = none).
 */

export interface MeditationScene {
  key: string;
  name: string;
  stillUri: string | null;
  animatedUri: string | null;
  audioUri: string | null;
}

const IMAGE_BUCKET = 'meditation-images';
const AUDIO_BUCKET = 'meditation-audio';

const publicUrl = (bucket: string, path: string | null): string | null =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

// The scenes. `still`/`animated` live in meditation-images; `audio` in meditation-audio.
const SCENE_DEFS: { key: string; name: string; still: string | null; animated: string | null; audio: string | null }[] = [
  { key: 'silence', name: 'Silence', still: 'keeping-watch-2.webp', animated: null, audio: null },
  { key: 'autumn-sky', name: 'Autumn Sky', still: 'autumn-sky.webp', animated: null, audio: 'autumn-sky-meditation.m4a' },
  { key: 'sunrise', name: 'Sunrise', still: 'sunrise.webp', animated: null, audio: 'sunrise.m4a' },
  { key: 'summer-rain', name: 'Summer Rain', still: 'summer-rain.webp', animated: null, audio: 'summer_rain.m4a' },
  { key: 'snowfall', name: 'Snowfall', still: 'snowing.webp', animated: null, audio: 'snowfall.m4a' },
];

const SCENES: Record<string, MeditationScene> = Object.fromEntries(
  SCENE_DEFS.map((s) => [
    s.key,
    {
      key: s.key,
      name: s.name,
      stillUri: publicUrl(IMAGE_BUCKET, s.still),
      animatedUri: publicUrl(IMAGE_BUCKET, s.animated),
      audioUri: publicUrl(AUDIO_BUCKET, s.audio),
    },
  ]),
);

/** Scenes keyed by `key`. Static — no fetch, no loading state. */
export function useMeditationScenes(): Record<string, MeditationScene> {
  return SCENES;
}
