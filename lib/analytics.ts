import { usageLogger } from './usageLogger';
import { firebaseAnalytics } from './firebaseAnalytics';

/**
 * Unified Analytics Service
 * 
 * This is a wrapper that sends analytics events to BOTH:
 * - Supabase (custom backend, full SQL query access)
 * - Firebase Analytics (industry standard, Firebase Console)
 * 
 * Why both?
 * - Supabase gives us full control and custom queries
 * - Firebase gives us automatic insights and mobile-optimized analytics
 * 
 * Usage:
 * Import this file instead of usageLogger directly for new code.
 * Existing code can continue using usageLogger - it still works independently.
 */

class DualAnalyticsService {
  /**
   * Initialize both analytics services
   */
  async initialize(): Promise<void> {
    // Supabase analytics is initialized in its constructor
    // Just initialize Firebase
    await firebaseAnalytics.initialize();
    console.log('[Analytics] Dual analytics system initialized');
  }

  /**
   * Log a custom event to both systems
   */
  async logEvent(event: string, props?: Record<string, any>): Promise<void> {
    // Send to both systems in parallel
    await Promise.all([
      usageLogger.logEvent(event, props),
      firebaseAnalytics.logEvent(event, props),
    ]);
  }

  /**
   * Track screen open
   */
  async screenOpen(screenName: string): Promise<void> {
    // Supabase handles screen tracking through onScreenFocus
    usageLogger.onScreenFocus(screenName);
    
    // Firebase uses dedicated screen tracking
    await firebaseAnalytics.trackScreenOpen(screenName);
  }

  /**
   * Track screen close
   */
  async screenClose(screenName: string, durationSeconds?: number): Promise<void> {
    // Supabase handles screen tracking through onScreenBlur
    usageLogger.onScreenBlur(screenName);
    
    // Firebase also tracks screen close
    if (durationSeconds !== undefined) {
      await firebaseAnalytics.trackScreenClose(screenName, durationSeconds);
    }
  }

  /**
   * Track feature use
   */
  async featureUse(feature: string, screen?: string): Promise<void> {
    await Promise.all([
      usageLogger.featureUse(feature, screen),
      firebaseAnalytics.trackFeatureUse(feature, screen),
    ]);
  }

  /**
   * Set anonymous user ID (Supabase) and Firebase user ID
   */
  async setUserId(anonymousId: string): Promise<void> {
    // Supabase anonymous ID is managed internally by usageLogger
    // Set the same ID in Firebase for cross-platform tracking
    await firebaseAnalytics.setUserId(anonymousId);
  }

  /**
   * Get current session ID (from Supabase analytics)
   */
  getSessionId(): string | null {
    return usageLogger.getSessionId();
  }

  /**
   * Get anonymous ID (from Supabase analytics)
   */
  getAnonymousId(): string | null {
    return usageLogger.getAnonymousIdSync();
  }
}

// Export singleton instance
export const analytics = new DualAnalyticsService();

// Export convenience functions that work with both systems
export const initAnalytics = () => analytics.initialize();
export const logEvent = (event: string, props?: Record<string, any>) => 
  analytics.logEvent(event, props);
export const screenOpen = (screenName: string) => 
  analytics.screenOpen(screenName);
export const screenClose = (screenName: string, durationSeconds?: number) => 
  analytics.screenClose(screenName, durationSeconds);
export const featureUse = (feature: string, screen?: string) => 
  analytics.featureUse(feature, screen);
export const getSessionId = () => 
  analytics.getSessionId();
export const getAnonymousId = () => 
  analytics.getAnonymousId();

// Export individual services for direct access if needed
export { usageLogger } from './usageLogger';
export { firebaseAnalytics } from './firebaseAnalytics';
