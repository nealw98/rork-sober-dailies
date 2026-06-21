import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Daily Reflection hero image — rotates daily from a pool in Supabase.
 *
 * Pool = active rows of `app_image_assets` in the `daily-reflection-images` bucket.
 * We pick `rows[dayOfYear % rows.length]`, so the image changes once per day,
 * is stable within the day, and grows automatically as more rows are added
 * (one row → always that one). Read-only Supabase content (DATA-SOURCES.md).
 *
 * The bundled `reflection_bg7.webp` stays the offline/loading placeholder on
 * the Today hero, so a failed/empty fetch (returns null) degrades gracefully.
 */

const BUCKET = 'daily-reflection-images';

export interface HeroImage {
  uri: string;
  alt: string;
}

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000); // 1..366
}

async function fetchHeroImages(): Promise<HeroImage[]> {
  const { data, error } = await supabase
    .from('app_image_assets')
    .select('asset_key, bucket, object_path, alt_text')
    .eq('bucket', BUCKET)
    .eq('is_active', true)
    .order('asset_key', { ascending: true }); // stable order for deterministic rotation

  if (error) throw error;

  return (data ?? []).map((row) => ({
    uri: supabase.storage.from(row.bucket).getPublicUrl(row.object_path).data.publicUrl,
    alt: row.alt_text || '',
  }));
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
