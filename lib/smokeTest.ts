// Smoke test for usage logger - call this from anywhere in the app to test the pipeline
import { usageLogger } from './usageLogger';

export const runSmokeTest = () => {
  console.log('[SmokeTest] Starting usage logger smoke test...');
  
  // Log a test event
  usageLogger.logEvent('feature_use', { feature: 'smoke_test' });
  
  // Force flush after a short delay
  setTimeout(() => {
    console.log('[SmokeTest] Forcing flush...');
    usageLogger.flushEvents();
  }, 500);
  
  console.log('[SmokeTest] Smoke test completed. Check Supabase usage_events table.');
};
