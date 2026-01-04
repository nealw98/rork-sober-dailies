import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Big Book Reader Access Control (Simplified)
 * 
 * For now, always grants access to the premium Big Book Reader.
 * Keeps the bypass toggle for testing free vs premium views.
 */

// Session-only bypass state and listeners (for toggling between views)
let bypassPaywallForSession = true; // Default to premium access
let bypassInitialized = false;
const BIG_BOOK_BYPASS_KEY = '@sober_dailies:bigbook_premium_unlocked';
const bypassListeners: Array<() => void> = [];

export function enableBigBookTestflightBypass() {
  bypassPaywallForSession = true;
  AsyncStorage.setItem(BIG_BOOK_BYPASS_KEY, 'true').catch((error) =>
    console.error('[BigBookAccess] Failed to persist bypass state:', error)
  );
  bypassListeners.forEach(fn => fn());
}

export function disableBigBookTestflightBypass() {
  bypassPaywallForSession = false;
  AsyncStorage.removeItem(BIG_BOOK_BYPASS_KEY).catch((error) =>
    console.error('[BigBookAccess] Failed to clear bypass state:', error)
  );
  bypassListeners.forEach(fn => fn());
}

export function onBigBookBypassChange(listener: () => void) {
  bypassListeners.push(listener);
  return () => {
    const i = bypassListeners.indexOf(listener);
    if (i >= 0) bypassListeners.splice(i, 1);
  };
}

export function isBigBookBypassEnabled() {
  return bypassPaywallForSession;
}

export async function loadBigBookBypassState() {
  if (bypassInitialized) {
    return;
  }
  try {
    const stored = await AsyncStorage.getItem(BIG_BOOK_BYPASS_KEY);
    // Default to true (premium access) if not set
    bypassPaywallForSession = stored !== 'false';
  } catch (error) {
    console.error('[BigBookAccess] Failed to load bypass state:', error);
    bypassPaywallForSession = true; // Default to premium on error
  } finally {
    bypassInitialized = true;
  }
}

/**
 * Check if the user has access to the Big Book Reader.
 * Currently always returns true (premium access).
 */
export async function hasBigBookAccess(): Promise<boolean> {
  await loadBigBookBypassState();
  // For now, always grant access
  return true;
}

/**
 * Get a detailed access status for debugging/display purposes.
 */
export async function getBigBookAccessStatus(): Promise<{
  hasAccess: boolean;
  isGrandfathered: boolean;
  hasSubscription: boolean;
  launchDate: Date;
}> {
  return {
    hasAccess: true,
    isGrandfathered: true, // Everyone is grandfathered for now
    hasSubscription: false,
    launchDate: new Date('2026-01-01T00:00:00.000Z'),
  };
}
