import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { DailyCheckIn, EmergencyContact, UserProfile } from '@/types/sobriety';

const STORAGE_KEY = 'sober_dailies_profile';

export const [SobrietyProvider, useSobriety] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>({
    sobrietyDate: new Date().toISOString(),
    dailyCheckIns: [],
    emergencyContacts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from storage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = useCallback(async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }, []);

  const setSobrietyDate = useCallback(async (date: string) => {
    const newProfile = { ...profile, sobrietyDate: date };
    await saveProfile(newProfile);
  }, [profile, saveProfile]);

  const addDailyCheckIn = useCallback(async (checkIn: Omit<DailyCheckIn, 'id' | 'createdAt'>) => {
    const newCheckIn: DailyCheckIn = {
      ...checkIn,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    const newProfile = {
      ...profile,
      dailyCheckIns: [newCheckIn, ...profile.dailyCheckIns],
      lastCheckIn: new Date().toISOString(),
    };
    
    await saveProfile(newProfile);
    return newCheckIn;
  }, [profile, saveProfile]);

  const addEmergencyContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now().toString(),
    };
    
    const newProfile = {
      ...profile,
      emergencyContacts: [...profile.emergencyContacts, newContact],
    };
    
    await saveProfile(newProfile);
    return newContact;
  }, [profile, saveProfile]);

  const removeEmergencyContact = useCallback(async (contactId: string) => {
    const newProfile = {
      ...profile,
      emergencyContacts: profile.emergencyContacts.filter(c => c.id !== contactId),
    };
    
    await saveProfile(newProfile);
  }, [profile, saveProfile]);

  const getDaysSober = useCallback(() => {
    const start = new Date(profile.sobrietyDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [profile.sobrietyDate]);

  const getTodaysCheckIn = useCallback(() => {
    const today = new Date().toDateString();
    return profile.dailyCheckIns.find(
      checkIn => new Date(checkIn.date).toDateString() === today
    );
  }, [profile.dailyCheckIns]);

  const resetSobriety = useCallback(async () => {
    const newProfile = {
      ...profile,
      sobrietyDate: new Date().toISOString(),
      dailyCheckIns: [],
    };
    await saveProfile(newProfile);
  }, [profile, saveProfile]);

  return useMemo(() => ({
    profile,
    isLoading,
    setSobrietyDate,
    addDailyCheckIn,
    addEmergencyContact,
    removeEmergencyContact,
    getDaysSober,
    getTodaysCheckIn,
    resetSobriety,
  }), [
    profile,
    isLoading,
    setSobrietyDate,
    addDailyCheckIn,
    addEmergencyContact,
    removeEmergencyContact,
    getDaysSober,
    getTodaysCheckIn,
    resetSobriety,
  ]);
});