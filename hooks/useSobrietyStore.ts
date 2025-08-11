import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { calculateDaysBetween } from '@/lib/dateUtils';

interface SobrietyData {
  sobrietyDate: string | null;
  hasSeenPrompt: boolean;
}

const SOBRIETY_STORAGE_KEY = 'sobriety_data';

export const [SobrietyProvider, useSobriety] = createContextHook(() => {
  const [sobrietyDate, setSobrietyDate] = useState<string | null>(null);
  const [hasSeenPrompt, setHasSeenPrompt] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from storage on mount
  useEffect(() => {
    const loadSobrietyData = async () => {
      try {
        const stored = await AsyncStorage.getItem(SOBRIETY_STORAGE_KEY);
        if (stored) {
          const data: SobrietyData = JSON.parse(stored);
          setSobrietyDate(data.sobrietyDate);
          setHasSeenPrompt(data.hasSeenPrompt);
        }
      } catch (error) {
        console.error('Error loading sobriety data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSobrietyData();
  }, []);

  // Save data to storage whenever it changes
  const saveData = async (newSobrietyDate: string | null, newHasSeenPrompt: boolean) => {
    try {
      const data: SobrietyData = {
        sobrietyDate: newSobrietyDate,
        hasSeenPrompt: newHasSeenPrompt,
      };
      await AsyncStorage.setItem(SOBRIETY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving sobriety data:', error);
    }
  };

  const setSobrietyDateAndSave = (date: string) => {
    setSobrietyDate(date);
    setHasSeenPrompt(true);
    saveData(date, true);
  };

  const dismissPrompt = () => {
    setHasSeenPrompt(true);
    saveData(sobrietyDate, true);
  };

  const calculateDaysSober = (): number => {
    if (!sobrietyDate) return 0;
    return calculateDaysBetween(sobrietyDate);
  };

  const shouldShowPrompt = (): boolean => {
    return !isLoading && !hasSeenPrompt && !sobrietyDate;
  };

  const shouldShowAddButton = (): boolean => {
    return !isLoading && hasSeenPrompt && !sobrietyDate;
  };

  const resetPrompt = () => {
    setHasSeenPrompt(false);
    saveData(sobrietyDate, false);
  };

  return {
    sobrietyDate,
    hasSeenPrompt,
    isLoading,
    setSobrietyDate: setSobrietyDateAndSave,
    dismissPrompt,
    calculateDaysSober,
    shouldShowPrompt,
    shouldShowAddButton,
    resetPrompt,
  };
});