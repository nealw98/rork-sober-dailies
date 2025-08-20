import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { calculateDaysBetween } from '@/lib/dateUtils';
import { DailyCheckIn, EmergencyContact } from '@/types/sobriety';

interface SobrietyData {
  sobrietyDate: string | null;
  hasSeenPrompt: boolean;
  dailyCheckIns: DailyCheckIn[];
  emergencyContacts: EmergencyContact[];
}

const SOBRIETY_STORAGE_KEY = 'sobriety_data';

export const [SobrietyProvider, useSobriety] = createContextHook(() => {
  const [sobrietyDate, setSobrietyDate] = useState<string | null>(null);
  const [hasSeenPrompt, setHasSeenPrompt] = useState<boolean>(false);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
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
          setDailyCheckIns(data.dailyCheckIns || []);
          setEmergencyContacts(data.emergencyContacts || []);
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
  const saveData = useCallback(async (newSobrietyDate: string | null, newHasSeenPrompt: boolean, newDailyCheckIns?: DailyCheckIn[], newEmergencyContacts?: EmergencyContact[]) => {
    try {
      const data: SobrietyData = {
        sobrietyDate: newSobrietyDate,
        hasSeenPrompt: newHasSeenPrompt,
        dailyCheckIns: newDailyCheckIns || dailyCheckIns,
        emergencyContacts: newEmergencyContacts || emergencyContacts,
      };
      await AsyncStorage.setItem(SOBRIETY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving sobriety data:', error);
    }
  }, [dailyCheckIns, emergencyContacts]);

  const setSobrietyDateAndSave = useCallback((date: string) => {
    setSobrietyDate(date);
    setHasSeenPrompt(true);
    saveData(date, true);
  }, [saveData]);

  const dismissPrompt = useCallback(() => {
    setHasSeenPrompt(true);
    saveData(sobrietyDate, true);
  }, [sobrietyDate, saveData]);

  const calculateDaysSober = useCallback((): number => {
    if (!sobrietyDate) return 0;
    return calculateDaysBetween(sobrietyDate);
  }, [sobrietyDate]);

  const shouldShowPrompt = useCallback((): boolean => {
    return !isLoading && !hasSeenPrompt && !sobrietyDate;
  }, [isLoading, hasSeenPrompt, sobrietyDate]);

  const shouldShowAddButton = useCallback((): boolean => {
    return !isLoading && hasSeenPrompt && !sobrietyDate;
  }, [isLoading, hasSeenPrompt, sobrietyDate]);

  const resetPrompt = useCallback(() => {
    setHasSeenPrompt(false);
    saveData(sobrietyDate, false);
  }, [sobrietyDate, saveData]);

  const addDailyCheckIn = useCallback(async (checkIn: Omit<DailyCheckIn, 'id' | 'createdAt'>) => {
    const newCheckIn: DailyCheckIn = {
      ...checkIn,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updatedCheckIns = [...dailyCheckIns, newCheckIn];
    setDailyCheckIns(updatedCheckIns);
    await saveData(sobrietyDate, hasSeenPrompt, updatedCheckIns, emergencyContacts);
  }, [dailyCheckIns, sobrietyDate, hasSeenPrompt, emergencyContacts, saveData]);

  const getTodaysCheckIn = useCallback((): DailyCheckIn | null => {
    const today = new Date().toDateString();
    return dailyCheckIns.find(checkIn => 
      new Date(checkIn.date).toDateString() === today
    ) || null;
  }, [dailyCheckIns]);

  const addEmergencyContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now().toString(),
    };
    const updatedContacts = [...emergencyContacts, newContact];
    setEmergencyContacts(updatedContacts);
    await saveData(sobrietyDate, hasSeenPrompt, dailyCheckIns, updatedContacts);
  }, [emergencyContacts, sobrietyDate, hasSeenPrompt, dailyCheckIns, saveData]);

  return useMemo(() => ({
    sobrietyDate,
    hasSeenPrompt,
    isLoading,
    dailyCheckIns,
    emergencyContacts,
    setSobrietyDate: setSobrietyDateAndSave,
    dismissPrompt,
    calculateDaysSober,
    shouldShowPrompt,
    shouldShowAddButton,
    resetPrompt,
    addDailyCheckIn,
    getTodaysCheckIn,
    addEmergencyContact,
  }), [
    sobrietyDate,
    hasSeenPrompt,
    isLoading,
    dailyCheckIns,
    emergencyContacts,
    setSobrietyDateAndSave,
    dismissPrompt,
    calculateDaysSober,
    shouldShowPrompt,
    shouldShowAddButton,
    resetPrompt,
    addDailyCheckIn,
    getTodaysCheckIn,
    addEmergencyContact,
  ]);
});