import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Logger } from '@/lib/logger';

const NOTIFIED_UPDATES_KEY = 'ota_notified_updates';

interface UpdateInfo {
  updateId: string;
  manifestHash?: string;
  timestamp: number;
}

// Build environment detection
const isProductionBuild = !__DEV__ && (Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_BUILD_FLAVOR === 'prod');

// Helper to get device info for diagnostics
const getDeviceInfo = () => {
  try {
    return {
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      buildNumber: Platform.OS === 'ios' 
        ? Constants.expoConfig?.ios?.buildNumber ?? 'unknown'
        : Constants.expoConfig?.android?.versionCode ?? 'unknown',
      deviceModel: Platform.OS === 'ios' ? 'iOS' : 'Android',
      platform: Platform.OS,
      timestampIso: new Date().toISOString(),
    };
  } catch (error) {
    return {
      appVersion: 'unknown',
      buildNumber: 'unknown', 
      deviceModel: 'unknown',
      platform: Platform.OS,
      timestampIso: new Date().toISOString(),
    };
  }
};

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
      const deviceInfo = getDeviceInfo();

      // Log diagnostic context
      try {
        const runtimeVersion = Updates.runtimeVersion;
        const updateUrl = (Updates as any)?.updateUrl ?? (Updates as any)?.manifest?.extra?.expoClient?.updates?.url ?? 'unknown';
        const isEmbeddedLaunch = Updates.isEmbeddedLaunch;
        const currentUpdateId = Updates.updateId ?? 'embedded';
        
        // Log OTA status for diagnostics
        Logger.logDiag('ota_status', {
          ...deviceInfo,
          runtimeVersion,
          updateUrl,
          isEmbeddedLaunch,
          currentUpdateId,
          coldStart: force,
          network: 'unknown', // Could be enhanced with network detection
          status: 'checking',
          isUpdateAvailable: false,
          isUpdatePending: false,
        });

        console.log('[OTA] check:start', {
          force,
          runtimeVersion,
          updateUrl,
          isEmbeddedLaunch,
          currentUpdateId,
          headers: 'none',
          ts: new Date().toISOString(),
        });
      } catch (diagError) {
        // Log diagnostic error but don't crash
        if (isProductionBuild) {
          Logger.logDiag('ota_diagnostic_error', {
            ...deviceInfo,
            error: (diagError as any)?.message || 'Unknown diagnostic error',
            status: 'diagnostic_failed',
          });
        }
      }

      // Check for updates with safe fallback
      let result;
      try {
        result = await Updates.checkForUpdateAsync();
        console.log('[OTA] check:result', { isAvailable: result?.isAvailable, ts: new Date().toISOString() });
      } catch (checkError) {
        // Safe fallback: log error and continue with embedded bundle
        if (isProductionBuild) {
          Logger.logDiag('ota_fallback_embedded', {
            ...deviceInfo,
            error: (checkError as any)?.message || 'Check failed',
            status: 'check_failed',
            fallbackReason: 'check_error',
          });
        }
        console.log('[OTA] check:error', (checkError as any)?.message || checkError);
        return; // Exit gracefully, continue with embedded bundle
      }

      if (result.isAvailable) {
        console.log('[OTA] fetch:start');
        
        // Fetch the update with safe fallback
        let fetched;
        try {
          fetched = await Updates.fetchUpdateAsync();
          console.log('[OTA] fetch:result', { isNew: fetched?.isNew, ts: new Date().toISOString() });
        } catch (fetchError) {
          // Safe fallback: log error and continue with embedded bundle
          if (isProductionBuild) {
            Logger.logDiag('ota_fallback_embedded', {
              ...deviceInfo,
              error: (fetchError as any)?.message || 'Fetch failed',
              status: 'fetch_failed',
              fallbackReason: 'fetch_error',
            });
          }
          console.log('[OTA] fetch:error', (fetchError as any)?.message || fetchError);
          return; // Exit gracefully, continue with embedded bundle
        }

        if (fetched.isNew) {
          const updateId = fetched.manifest?.id || fetched.manifest?.createdAt?.toString() || 'unknown';
          const manifestHash = fetched.manifest?.extra?.expoClient?.updates?.hash;

          console.log('[OTA] fetched:new', { updateId, manifestHash });

          // Log successful update fetch
          Logger.logDiag('ota_update_ready', {
            ...deviceInfo,
            updateId,
            manifestHash,
            status: 'update_ready',
            isUpdateAvailable: true,
            isUpdatePending: true,
          });

          // Show snackbar for manual restart (NO AUTO-RELOAD)
          setShowSnackbar(true);

          // Record notification to avoid loops
          try {
            const notifiedUpdates = await getNotifiedUpdates();
            const uniqueKey = manifestHash || updateId;
            if (!notifiedUpdates.has(uniqueKey)) {
              await markUpdateAsNotified(uniqueKey, manifestHash);
            }
          } catch (notifyError) {
            // Don't crash on notification errors
            console.log('[OTA] notify:error', (notifyError as any)?.message || notifyError);
          }
        }
      } else {
        // Log no update available
        Logger.logDiag('ota_status', {
          ...deviceInfo,
          status: 'no_update_available',
          isUpdateAvailable: false,
          isUpdatePending: false,
        });
      }
    } catch (error) {
      // Safe fallback: log error and continue with embedded bundle
      if (isProductionBuild) {
        Logger.logDiag('ota_fallback_embedded', {
          ...getDeviceInfo(),
          error: (error as any)?.message || 'Unknown error',
          status: 'general_error',
          fallbackReason: 'catch_all',
        });
      }
      console.log('[OTA] check:error', (error as any)?.message || error);
    } finally {
      setIsChecking(false);
      console.log('[OTA] check:done', { ts: new Date().toISOString() });
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

  // Initial check on mount (only once per app session)
  useEffect(() => {
    let hasInitialCheckRun = false;

    if (!hasInitialCheckRun) {
      hasInitialCheckRun = true;
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        checkForUpdates(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []); // No dependencies to prevent re-running

  const dismissSnackbar = useCallback(() => {
    setShowSnackbar(false);
  }, []);

  // Manual restart function for production builds
  const restartApp = useCallback(async () => {
    try {
      if (isProductionBuild) {
        Logger.logDiag('ota_manual_restart', {
          ...getDeviceInfo(),
          status: 'manual_restart_initiated',
        });
      }
      
      const Updates = await import('expo-updates');
      console.log('[OTA] manual restart:start');
      await Updates.reloadAsync();
    } catch (error) {
      if (isProductionBuild) {
        Logger.logDiag('ota_restart_error', {
          ...getDeviceInfo(),
          error: (error as any)?.message || 'Restart failed',
          status: 'restart_failed',
        });
      }
      console.log('[OTA] restart:error', (error as any)?.message || error);
    }
  }, []);

  return {
    showSnackbar,
    dismissSnackbar,
    checkForUpdates,
    isChecking,
    restartApp,
  };
};
