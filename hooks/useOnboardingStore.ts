import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

// v3-specific flag. v2 set 'sober_dailies_onboarding_complete' (same device
// data survives the store upgrade), and v3's Today is a different app — v2
// upgraders MUST go through v3 onboarding, so the gate keys on a new flag
// that only v3 writes. The legacy key is still written for consistency but
// is never read.
const ONBOARDING_KEY = 'sober_dailies_onboarding_v3_complete';
const LEGACY_ONBOARDING_KEY = 'sober_dailies_onboarding_complete';
const ONBOARDING_RESET_KEYS = [
  ONBOARDING_KEY,
  LEGACY_ONBOARDING_KEY,
  'today_edit_tip_pending',
  'today_edit_tip_seen',
];

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  // True when the device completed v2 onboarding but not v3's: a store-upgrade
  // user. The flow shows its "What's new" variant for them.
  const [isUpgrader, setIsUpgrader] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Simplified onboarding check - just check AsyncStorage without complex timing
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [[, status], [, legacy]] = await AsyncStorage.multiGet([ONBOARDING_KEY, LEGACY_ONBOARDING_KEY]);
        console.log('Onboarding status check:', status, '(legacy:', legacy + ')');

        if (status === 'true') {
          console.log('Returning user - skipping consent');
          setIsOnboardingComplete(true);
        } else {
          console.log(legacy === 'true' ? 'v2 upgrader - showing What’s-new onboarding' : 'New user - showing consent page');
          setIsUpgrader(legacy === 'true');
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
      await AsyncStorage.multiSet([[ONBOARDING_KEY, 'true'], [LEGACY_ONBOARDING_KEY, 'true']]);
      setIsOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  }, []);

  // Dev-only: clear the flags so the (new-user) onboarding flow re-appears.
  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(ONBOARDING_RESET_KEYS);
      setIsUpgrader(false);
      setIsOnboardingComplete(false);
    } catch (error) {
      console.log('Error resetting onboarding status:', error);
    }
  }, []);

  // Dev-only: replay onboarding the way a v2 store-upgrade user sees it —
  // legacy flag present, v3 flag absent → the "What's new" variant.
  const resetOnboardingAsUpgrader = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([ONBOARDING_KEY, 'today_edit_tip_pending', 'today_edit_tip_seen']);
      await AsyncStorage.setItem(LEGACY_ONBOARDING_KEY, 'true');
      setIsUpgrader(true);
      setIsOnboardingComplete(false);
    } catch (error) {
      console.log('Error resetting onboarding status (upgrader):', error);
    }
  }, []);

  return {
    isOnboardingComplete,
    isUpgrader,
    isLoading,
    completeOnboarding,
    resetOnboarding,
    resetOnboardingAsUpgrader,
  };
});
