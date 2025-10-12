import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LastPageData {
  lastPage: number;
  updatedAt: string;
}

const STORAGE_KEY = 'READ_PROGRESS_bigbook_1e';

export const useLastPageStore = () => {
  const [lastPageData, setLastPageData] = useState<LastPageData | null>(null);

  const loadLastPage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('🔍 Loading from storage key:', STORAGE_KEY, 'value:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔍 Parsed data:', parsed);
        setLastPageData(parsed);
      }
    } catch (error) {
      console.error('Error loading last page:', error);
    }
  }, []);

  useEffect(() => {
    loadLastPage();
  }, [loadLastPage]);

  const saveLastPage = useCallback(async (pageNumber: number) => {
    try {
      const data: LastPageData = {
        lastPage: pageNumber,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastPageData(data);
      console.log('Saved last page:', data);
      // Reload from storage to ensure consistency
      await loadLastPage();
    } catch (error) {
      console.error('Error saving last page:', error);
    }
  }, [loadLastPage]);

  return {
    lastPage: lastPageData?.lastPage || null,
    saveLastPage,
    refreshLastPage: loadLastPage,
  };
};
