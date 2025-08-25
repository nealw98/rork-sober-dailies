import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'sober_dailies_onboarding_complete';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      console.log('=== ONBOARDING CHECK START ===');
      console.log('Platform:', Platform.OS);
      
      // For development/preview, skip onboarding to get to main app faster
      console.log('Skipping onboarding for development/preview');
      setIsOnboardingComplete(true);
      
      // Original logic commented out for debugging
      /*
      if (Platform.OS === 'android') {
        try {
          const status = await AsyncStorage.getItem(ONBOARDING_KEY);
          console.log('Android AsyncStorage status:', status);
          setIsOnboardingComplete(status === 'true');
        } catch (androidError) {
          console.log('Android AsyncStorage error, skipping onboarding:', androidError);
          setIsOnboardingComplete(true);
        }
      } else {
        const status = await AsyncStorage.getItem(ONBOARDING_KEY);
        console.log('AsyncStorage status:', status);
        setIsOnboardingComplete(status === 'true');
      }
      */
    } catch (error) {
      console.log('Error checking onboarding status:', error);
      setIsOnboardingComplete(true);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
      console.log('=== ONBOARDING CHECK COMPLETE ===');
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  }, []);

  return useMemo(() => ({
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
  }), [isOnboardingComplete, isLoading, completeOnboarding]);
});