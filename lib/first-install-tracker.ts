import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_INSTALL_DATE_KEY = '@sober_dailies:first_install_date';

/**
 * First Install Tracker
 * 
 * Tracks when the app was first installed to support grandfathering
 * early adopters for Big Book Reader access.
 */

/**
 * Initialize the first install date if it doesn't exist.
 * Call this once on app launch.
 */
export async function initializeFirstInstallDate(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_INSTALL_DATE_KEY);
    
    if (!existing) {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(FIRST_INSTALL_DATE_KEY, now);
      console.log('[FirstInstall] Initialized first install date:', now);
    } else {
      console.log('[FirstInstall] First install date already exists:', existing);
    }
  } catch (error) {
    console.error('[FirstInstall] Error initializing first install date:', error);
  }
}

/**
 * Get the first install date.
 * Returns null if not set (shouldn't happen after initialization).
 */
export async function getFirstInstallDate(): Promise<Date | null> {
  try {
    const dateString = await AsyncStorage.getItem(FIRST_INSTALL_DATE_KEY);
    
    if (!dateString) {
      console.warn('[FirstInstall] First install date not found. Was initializeFirstInstallDate() called?');
      return null;
    }
    
    return new Date(dateString);
  } catch (error) {
    console.error('[FirstInstall] Error getting first install date:', error);
    return null;
  }
}

/**
 * Check if the user installed the app before a specific date.
 * Used for grandfathering early adopters.
 */
export async function installedBefore(cutoffDate: Date): Promise<boolean> {
  const firstInstall = await getFirstInstallDate();
  
  if (!firstInstall) {
    // If we can't determine, assume they're not grandfathered
    return false;
  }
  
  return firstInstall < cutoffDate;
}

/**
 * FOR TESTING ONLY: Reset the first install date
 */
export async function resetFirstInstallDate(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FIRST_INSTALL_DATE_KEY);
    console.log('[FirstInstall] First install date reset');
  } catch (error) {
    console.error('[FirstInstall] Error resetting first install date:', error);
  }
}

