import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'sober_dailies_onboarding_complete';

// Track if we've already initialized to prevent multiple initializations
let initialized = false;

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check onboarding status only once on mount
  useEffect(() => {
    // Prevent duplicate initialization
    if (initialized) {
      console.log('Onboarding already initialized, skipping');
      setIsLoading(false);
      return;
    }
    
    initialized = true;
    
    const checkStatus = async () => {
      try {
        // Check if onboarding was completed
        const status = await AsyncStorage.getItem(ONBOARDING_KEY);
        
        // For development/preview, skip onboarding if not explicitly set
        if (status === null) {
          setIsOnboardingComplete(true);
        } else {
          setIsOnboardingComplete(status === 'true');
        }
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        // On error, skip onboarding to prevent app from being stuck
        setIsOnboardingComplete(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Start checking status
    checkStatus();
    
    // Failsafe: if loading takes too long, force complete
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('FAILSAFE: Onboarding check took too long, forcing completion');
        setIsOnboardingComplete(true);
        setIsLoading(false);
      }
    }, 2000); // 2 second timeout (reduced from 5s)
    
    return () => clearTimeout(timeout);
  }, []); // Empty dependency array - only run once on mount

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  }, []);

  // Memoize to prevent unnecessary re-renders
  return useMemo(() => ({
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
  }), [isOnboardingComplete, isLoading, completeOnboarding]);
});