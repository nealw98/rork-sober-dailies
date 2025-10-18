/**
 * Test script for Big Book access control
 * 
 * Run this to test the grandfathering and subscription logic.
 * 
 * Usage:
 * 1. In your app, check the console logs when navigating to Big Book
 * 2. You should see logs from [FirstInstall] and [BigBookAccess]
 * 3. To test grandfathering: clear app data and reinstall before launch date
 * 4. To test subscription: make a test purchase in the store
 */

import { hasBigBookAccess, getBigBookAccessStatus, BIG_BOOK_LAUNCH_DATE } from '../lib/bigbook-access';
import { getFirstInstallDate, resetFirstInstallDate } from '../lib/first-install-tracker';

export async function testBigBookAccess() {
  console.log('\n=== Big Book Access Control Test ===\n');
  
  // Check current first install date
  const firstInstall = await getFirstInstallDate();
  console.log('First Install Date:', firstInstall?.toISOString() || 'Not set');
  console.log('Launch Date (Cutoff):', BIG_BOOK_LAUNCH_DATE.toISOString());
  
  // Get detailed status
  const status = await getBigBookAccessStatus();
  console.log('\nAccess Status:');
  console.log('  Has Access:', status.hasAccess);
  console.log('  Is Grandfathered:', status.isGrandfathered);
  console.log('  Has Subscription:', status.hasSubscription);
  
  // Simple access check
  const hasAccess = await hasBigBookAccess();
  console.log('\nFinal Result:', hasAccess ? '✓ ACCESS GRANTED' : '✗ ACCESS DENIED');
  
  console.log('\n=== Test Complete ===\n');
  
  return hasAccess;
}

/**
 * Reset first install date for testing
 * WARNING: This will clear the grandfathering flag!
 */
export async function resetForTesting() {
  console.log('⚠️  Resetting first install date...');
  await resetFirstInstallDate();
  console.log('✓ Reset complete. Next app launch will set a new date.');
}

