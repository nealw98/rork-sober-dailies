import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'sober_dailies_onboarding_complete';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  console.log('=== ONBOARDING HOOK INIT ===');
  console.log('Creating onboarding hook instance');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      console.log('=== ONBOARDING CHECK START ===');
      console.log('Platform:', Platform.OS);
      
      // Check if onboarding was completed
      const status = await AsyncStorage.getItem(ONBOARDING_KEY);
      console.log('AsyncStorage status:', status);
      
      // For development/preview, skip onboarding if not explicitly set
      if (status === null) {
        console.log('No onboarding status found, skipping for development');
        setIsOnboardingComplete(true);
      } else {
        setIsOnboardingComplete(status === 'true');
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
      // On error, skip onboarding to prevent app from being stuck
      setIsOnboardingComplete(true);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
      console.log('=== ONBOARDING CHECK COMPLETE ===');
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
    
    // Failsafe: if loading takes too long, force complete onboarding
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('FAILSAFE: Onboarding check took too long, forcing completion');
        setIsOnboardingComplete(true);
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, [checkOnboardingStatus, isLoading]);

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