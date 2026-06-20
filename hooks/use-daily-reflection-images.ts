import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

export interface DailyReflectionImage {
  id: string;
  bucket: string;
  objectPath: string;
  title: string | null;
  altText: string;
  publicUrl: string;
}

export function useDailyReflectionImages() {
  const [images, setImages] = useState<DailyReflectionImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_reflection_images')
          .select('id,bucket,object_path,title,alt_text')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        const resolvedImages = (data || []).map(row => ({
          id: row.id,
          bucket: row.bucket,
          objectPath: row.object_path,
          title: row.title,
          altText: row.alt_text,
          publicUrl: supabase.storage.from(row.bucket).getPublicUrl(row.object_path).data.publicUrl,
        }));

        if (mounted) {
          setImages(resolvedImages);
        }
      } catch (error) {
        console.warn('[DailyReflectionImages] Falling back to bundled hero image', error);
        if (mounted) {
          setImages([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, []);

  const todaysImage = useMemo(() => {
    if (!images.length) return null;
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = Number(new Date()) - Number(start);
    const dayOfYear = Math.floor(diff / 86_400_000);
    return images[(dayOfYear - 1) % images.length];
  }, [images]);

  return {
    images,
    todaysImage,
    isLoading,
  };
}
