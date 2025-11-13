import { installedBefore } from './first-install-tracker';
import { getCustomerInfoSafe } from './purchases';
import { IS_TESTFLIGHT_PREVIEW } from '@/constants/featureFlags';

/**
 * Big Book Reader Access Control
 * 
 * Determines if a user has access to the premium Big Book Reader.
 * Access is granted if:
 * 1. User installed before launch date (grandfathered), OR
 * 2. User has an active subscription via RevenueCat
 */

// Session-only TestFlight bypass state and listeners
let bypassPaywallForSession = false;
const bypassListeners: Array<() => void> = [];

export function enableBigBookTestflightBypass() {
  if (!IS_TESTFLIGHT_PREVIEW) return;
  bypassPaywallForSession = true;
  bypassListeners.forEach(fn => fn());
}

export function disableBigBookTestflightBypass() {
  bypassPaywallForSession = false;
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

// Set to future date (TEMPORARY - for testing both versions)
// This will be the cutoff date for grandfathering early adopters
// TODO: Change back to actual launch date before production
export const BIG_BOOK_LAUNCH_DATE = new Date('2026-01-01T00:00:00.000Z');

/**
 * Check if the user has access to the Big Book Reader.
 * 
 * @returns Promise<boolean> - true if user has access, false otherwise
 */
export async function hasBigBookAccess(): Promise<boolean> {
  try {
    // TestFlight session bypass
    if (IS_TESTFLIGHT_PREVIEW && bypassPaywallForSession) {
      console.log('[BigBookAccess] TestFlight bypass enabled');
      return true;
    }

    // In TestFlight preview builds, default to locked state until user unlocks via bypass.
    if (IS_TESTFLIGHT_PREVIEW && !bypassPaywallForSession) {
      console.log('[BigBookAccess] TestFlight preview default locked state');
      return false;
    }
    
    // Check 1: Is user grandfathered? (installed before launch)
    const isGrandfathered = await installedBefore(BIG_BOOK_LAUNCH_DATE);
    
    if (isGrandfathered) {
      console.log('[BigBookAccess] User is grandfathered (installed before launch)');
      return true;
    }
    
    // Check 2: Does user have active subscription?
    const customerInfo = await getCustomerInfoSafe();
    
    if (!customerInfo) {
      console.log('[BigBookAccess] Could not retrieve customer info');
      return false;
    }
    
    // Check if user has any active entitlements
    const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
    
    if (hasActiveEntitlement) {
      console.log('[BigBookAccess] User has active subscription');
      return true;
    }
    
    console.log('[BigBookAccess] User does not have access (not grandfathered, no subscription)');
    return false;
  } catch (error) {
    console.error('[BigBookAccess] Error checking access:', error);
    return false;
  }
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
  const isGrandfathered = await installedBefore(BIG_BOOK_LAUNCH_DATE);
  
  const customerInfo = await getCustomerInfoSafe();
  const hasSubscription = customerInfo 
    ? Object.keys(customerInfo.entitlements.active).length > 0 
    : false;
  
  const hasAccess = (IS_TESTFLIGHT_PREVIEW && bypassPaywallForSession) || isGrandfathered || hasSubscription;
  
  return {
    hasAccess,
    isGrandfathered,
    hasSubscription,
    launchDate: BIG_BOOK_LAUNCH_DATE,
  };
}

