import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'sober_dailies_onboarding_complete';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Simplified onboarding check - just check AsyncStorage without complex timing
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await AsyncStorage.getItem(ONBOARDING_KEY);
        console.log('Onboarding status check:', status);
        
        if (status === 'true') {
          console.log('Returning user - skipping consent');
          setIsOnboardingComplete(true);
        } else {
          console.log('New user - showing consent page');
          setIsOnboardingComplete(false);
        }
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        // On error, show consent page to be safe
        setIsOnboardingComplete(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkStatus();
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  }, []);

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
  };
});