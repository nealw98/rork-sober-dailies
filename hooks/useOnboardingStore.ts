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
        // Check if onboarding was completed with a timeout
        const statusPromise = AsyncStorage.getItem(ONBOARDING_KEY);
        const timeoutPromise = new Promise<string | null>((resolve) => 
          setTimeout(() => resolve(null), 2000)
        );
        
        const status = await Promise.race([statusPromise, timeoutPromise]);
        
        // Show consent page for new users, complete for returning users
        if (status === null) {
          console.log('Onboarding status: new user or timeout - showing consent page');
          setIsOnboardingComplete(false); // New users see consent page
        } else {
          console.log('Onboarding status: returning user - skipping consent');
          setIsOnboardingComplete(status === 'true'); // Returning users skip consent
        }
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        // On error, show consent page to be safe (don't skip onboarding)
        setIsOnboardingComplete(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Start checking status
    checkStatus();
    
    // Failsafe: if loading takes too long, force complete to prevent splash loop
    // But log this case so we can investigate why AsyncStorage is slow
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('FAILSAFE: Onboarding check took too long, forcing completion to prevent splash loop');
        console.log('WARNING: This bypasses consent page - investigate AsyncStorage performance');
        setIsOnboardingComplete(true);
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout - compromise between 2s and 5s
    
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