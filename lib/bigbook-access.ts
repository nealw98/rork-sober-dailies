import { installedBefore } from './first-install-tracker';
import { getCustomerInfoSafe } from './purchases';

/**
 * Big Book Reader Access Control
 * 
 * Determines if a user has access to the premium Big Book Reader.
 * Access is granted if:
 * 1. User installed before launch date (grandfathered), OR
 * 2. User has an active subscription via RevenueCat
 */

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
  
  const hasAccess = isGrandfathered || hasSubscription;
  
  return {
    hasAccess,
    isGrandfathered,
    hasSubscription,
    launchDate: BIG_BOOK_LAUNCH_DATE,
  };
}

