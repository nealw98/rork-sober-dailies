import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFIED_UPDATES_KEY = 'ota_notified_updates';

interface UpdateInfo {
  updateId: string;
  manifestHash?: string;
  timestamp: number;
}

export const useOTAUpdates = () => {
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastCheckTime = useRef<number>(0);
  const MIN_CHECK_INTERVAL = 30000; // 30 seconds minimum between checks

  // Get notified updates from storage
  const getNotifiedUpdates = useCallback(async (): Promise<Set<string>> => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFIED_UPDATES_KEY);
      if (stored) {
        const updates: UpdateInfo[] = JSON.parse(stored);
        // Clean up old entries (older than 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentUpdates = updates.filter(update => update.timestamp > weekAgo);
        
        if (recentUpdates.length !== updates.length) {
          await AsyncStorage.setItem(NOTIFIED_UPDATES_KEY, JSON.stringify(recentUpdates));
        }
        
        return new Set(recentUpdates.map(update => update.updateId));
      }
    } catch (error) {
      console.log('[OTA] Error getting notified updates:', error);
    }
    return new Set();
  }, []);

  // Mark update as notified
  const markUpdateAsNotified = useCallback(async (updateId: string, manifestHash?: string) => {
    try {
      const notifiedUpdates = await getNotifiedUpdates();
      const updates: UpdateInfo[] = Array.from(notifiedUpdates).map(id => ({
        updateId: id,
        timestamp: Date.now(),
      }));
      
      updates.push({
        updateId,
        manifestHash,
        timestamp: Date.now(),
      });
      
      await AsyncStorage.setItem(NOTIFIED_UPDATES_KEY, JSON.stringify(updates));
    } catch (error) {
      console.log('[OTA] Error marking update as notified:', error);
    }
  }, [getNotifiedUpdates]);

  // Check for updates
  const checkForUpdates = useCallback(async (force = false) => {
    // Prevent too frequent checks
    const now = Date.now();
    if (!force && (now - lastCheckTime.current) < MIN_CHECK_INTERVAL) {
      return;
    }
    lastCheckTime.current = now;

    if (isChecking) return;
    setIsChecking(true);

    try {
      const Updates = await import('expo-updates');
      
      // Check if updates are available
      const result = await Updates.checkForUpdateAsync();
      
      if (result.isAvailable) {
        console.log('[OTA] Update available, fetching...');
        
        // Fetch the update
        const fetched = await Updates.fetchUpdateAsync();
        
        if (fetched.isNew) {
          const updateId = fetched.manifest?.id || fetched.manifest?.createdAt?.toString() || 'unknown';
          const manifestHash = fetched.manifest?.extra?.expoClient?.updates?.hash;
          
          console.log('[OTA] New update fetched:', { updateId, manifestHash });
          
          // Show snackbar very briefly then reload to apply immediately (matches earlier behavior)
          setShowSnackbar(true);
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch (e) {
              console.log('[OTA] Failed to reload after update:', e);
            }
          }, 1200);
          
          // Record notification to avoid loops
          const notifiedUpdates = await getNotifiedUpdates();
          const uniqueKey = manifestHash || updateId;
          if (!notifiedUpdates.has(uniqueKey)) {
            await markUpdateAsNotified(uniqueKey, manifestHash);
          }
        }
      }
    } catch (error) {
      console.log('[OTA] Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, getNotifiedUpdates, markUpdateAsNotified]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[OTA] App came to foreground, checking for updates');
        checkForUpdates();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkForUpdates]);

  // Initial check on mount
  useEffect(() => {
    // Small delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      checkForUpdates(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  const dismissSnackbar = useCallback(() => {
    setShowSnackbar(false);
  }, []);

  return {
    showSnackbar,
    dismissSnackbar,
    checkForUpdates,
    isChecking,
  };
};
