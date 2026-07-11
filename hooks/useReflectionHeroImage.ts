import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

/**
 * Daily Reflection hero image — rotates daily from the images in Supabase
 * Storage, and keeps rotating with a poor or no connection.
 *
 * The pool is the image files in `${BUCKET}/${FOLDER}`, listed straight from
 * Storage — no DB table. We pick `images[dayOfYear % images.length]`, so the
 * hero changes once per day, is stable within the day, cycles back to the first
 * image once the list is exhausted, and grows automatically as files are added.
 *
 * Offline durability (two layers, both refreshed on every successful online
 * fetch):
 *  1. The whole pool is prefetched into expo-image's on-disk cache, so any
 *     upcoming day's image is already downloaded — not just the ones shown so
 *     far. Rotation then continues with no connection.
 *  2. The URL list is persisted to AsyncStorage, so a cold offline start still
 *     knows the pool (and can compute today's pick) even though the Storage
 *     list request fails. `fetchHeroImages` falls back to it on any error.
 *
 * The bundled `reflection_bg7.webp` stays the offline/loading placeholder on the
 * Today hero, so a truly empty cache (returns null) still degrades gracefully.
 */

const BUCKET = 'daily-reflection-images';
const FOLDER = 'daily-reflections';
const IMAGE_RE = /\.(webp|jpe?g|png)$/i;
const CACHE_KEY = 'reflection-hero-images-v1';

export interface HeroImage {
  uri: string;
  alt: string;
}

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000); // 1..366
}

// Trailing number in a filename (e.g. "reflections-12.webp" → 12) for a clean,
// sequential daily cycle; names without one sort to the end.
function nameOrder(name: string): number {
  const m = name.match(/(\d+)(?=\.\w+$)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

async function fetchHeroImages(): Promise<HeroImage[]> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;

    const images: HeroImage[] = (data ?? [])
      .filter((f) => f.id != null && IMAGE_RE.test(f.name)) // real files only (folders have a null id)
      .sort((a, b) => nameOrder(a.name) - nameOrder(b.name)) // numeric, sequential
      .map((f) => ({
        uri: supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${f.name}`).data.publicUrl,
        alt: 'Daily reflection',
      }));

    if (images.length === 0) throw new Error('empty hero pool');

    // Persist the list + pull the whole pool onto disk so rotation survives a
    // dropped connection. Both are best-effort — don't fail the fetch on them.
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(images)).catch(() => {});
    Image.prefetch(images.map((i) => i.uri), { cachePolicy: 'memory-disk' }).catch(() => {});

    return images;
  } catch (err) {
    // Offline / list failed: reuse the last-known pool if we ever fetched one.
    // The bytes are already on disk (layer 1), so the daily pick still renders.
    const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as HeroImage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* corrupt cache — fall through */ }
    }
    throw err;
  }
}

/** Today's hero image, or null while loading / if the pool is empty or offline. */
export function useReflectionHeroImage(): HeroImage | null {
  const { data: images = [] } = useQuery({
    queryKey: ['reflectionHeroImages'],
    queryFn: fetchHeroImages,
    staleTime: 1000 * 60 * 60 * 12, // 12h — content rotates at most daily
    gcTime: 1000 * 60 * 60 * 24,
  });

  if (images.length === 0) return null;
  return images[getDayOfYear() % images.length];
}
