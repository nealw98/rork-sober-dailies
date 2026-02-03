import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GratitudeQuote {
  quote: string;
  source: string | null;
}

interface CachedQuote extends GratitudeQuote {
  day_of_year: number;
  cached_at: string;
}

const CACHE_KEY = 'gratitude_quote_cache';

// Fallback quote in case of network issues
const FALLBACK_QUOTE: GratitudeQuote = {
  quote: "Gratitude unlocks the fullness of life. It turns what we have into enough, and more.",
  source: "Melody Beattie"
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function useGratitudeQuote() {
  const [quote, setQuote] = useState<GratitudeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyQuote();
  }, []);

  async function fetchDailyQuote() {
    const dayOfYear = getDayOfYear();
    
    try {
      // Check cache first
      const cached = await getCachedQuote();
      if (cached && cached.day_of_year === dayOfYear) {
        setQuote({ quote: cached.quote, source: cached.source });
        setIsLoading(false);
        return;
      }

      // Fetch from Supabase
      const { data, error: fetchError } = await supabase
        .from('gratitude_quotes')
        .select('quote, source')
        .eq('day_of_year', dayOfYear)
        .single();

      if (fetchError) {
        console.error('Error fetching gratitude quote:', fetchError);
        // Try to use cached quote even if from different day
        if (cached) {
          setQuote({ quote: cached.quote, source: cached.source });
        } else {
          setQuote(FALLBACK_QUOTE);
        }
        setError(fetchError.message);
      } else if (data) {
        const fetchedQuote: GratitudeQuote = {
          quote: data.quote,
          source: data.source
        };
        setQuote(fetchedQuote);
        
        // Cache the quote
        await cacheQuote({
          ...fetchedQuote,
          day_of_year: dayOfYear,
          cached_at: new Date().toISOString()
        });
      } else {
        // No quote found for this day, use fallback
        setQuote(FALLBACK_QUOTE);
      }
    } catch (err) {
      console.error('Error in fetchDailyQuote:', err);
      setQuote(FALLBACK_QUOTE);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function getCachedQuote(): Promise<CachedQuote | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  async function cacheQuote(quote: CachedQuote): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(quote));
    } catch (err) {
      console.error('Error caching quote:', err);
    }
  }

  // Format quote with em-dash for display
  const formattedQuote = quote
    ? quote.source
      ? `${quote.quote} — ${quote.source}`
      : quote.quote
    : '';

  return {
    quote: quote?.quote || '',
    source: quote?.source || null,
    formattedQuote,
    isLoading,
    error,
    refetch: fetchDailyQuote
  };
}
