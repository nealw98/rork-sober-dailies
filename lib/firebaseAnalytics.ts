import analytics from '@react-native-firebase/analytics';
import app from '@react-native-firebase/app';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Firebase Analytics Service
 * 
 * This service runs ALONGSIDE the existing Supabase analytics (lib/usageLogger.ts).
 * We maintain both systems to get the best of both worlds:
 * - Supabase: Custom SQL queries, full control, detailed custom events
 * - Firebase: Industry-standard metrics, Firebase Console insights, automatic features
 * 
 * Usage:
 * - Import and call functions directly, or
 * - Use through the dual analytics wrapper (lib/analytics.ts)
 */

class FirebaseAnalyticsService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Wait for Firebase to be initialized by the native layer
      // React Native Firebase auto-initializes from config files, but it happens asynchronously
      // We need to wait a moment for the native initialization to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify Firebase app is available
      const apps = app().apps;
      if (apps.length === 0) {
        console.warn('[Firebase Analytics] No Firebase apps found after waiting, analytics will be disabled');
        this.isInitialized = false;
        return;
      }
      
      console.log('[Firebase Analytics] Firebase app found, initializing analytics');
      
      // Enable analytics collection
      await analytics().setAnalyticsCollectionEnabled(true);
      
      this.isInitialized = true;
      console.log('[Firebase Analytics] Initialized successfully');

      // Set default user properties
      await this.setUserProperties({
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version || 'unknown',
      });
    } catch (error) {
      console.error('[Firebase Analytics] Initialization failed:', error);
      // Don't throw - Firebase analytics should be non-blocking
      this.isInitialized = false;
    }
  }

  /**
   * Log a custom event to Firebase Analytics
   * Firebase has a limit of 500 distinct events per app, so we map
   * our custom events to Firebase's naming conventions
   */
  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[Firebase Analytics] Not initialized, skipping event:', eventName);
      return;
    }

    try {
      // Firebase has reserved event names and parameter names
      // Convert our event names to Firebase-friendly format
      const firebaseEventName = this.sanitizeEventName(eventName);
      const firebaseParams = this.sanitizeParams(params);

      await analytics().logEvent(firebaseEventName, firebaseParams);
      console.log('[Firebase Analytics] Event logged:', firebaseEventName, firebaseParams);
    } catch (error) {
      console.error('[Firebase Analytics] Failed to log event:', eventName, error);
      // Don't throw - analytics should be non-blocking
    }
  }

  /**
   * Log screen view events
   * Firebase has a dedicated screen_view event
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log('[Firebase Analytics] Screen view logged:', screenName);
    } catch (error) {
      console.error('[Firebase Analytics] Failed to log screen view:', screenName, error);
    }
  }

  /**
   * Set user properties (dimensions for filtering in Firebase Console)
   */
  async setUserProperties(properties: Record<string, string>): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      for (const [key, value] of Object.entries(properties)) {
        await analytics().setUserProperty(key, value);
      }
      console.log('[Firebase Analytics] User properties set:', properties);
    } catch (error) {
      console.error('[Firebase Analytics] Failed to set user properties:', error);
    }
  }

  /**
   * Set a user ID (for tracking across sessions)
   * Note: This is different from anonymous_id in Supabase
   */
  async setUserId(userId: string | null): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await analytics().setUserId(userId);
      console.log('[Firebase Analytics] User ID set:', userId);
    } catch (error) {
      console.error('[Firebase Analytics] Failed to set user ID:', error);
    }
  }

  /**
   * Log app open event (Firebase predefined event)
   */
  async logAppOpen(): Promise<void> {
    await this.logEvent('app_open');
  }

  /**
   * Sanitize event names to Firebase requirements:
   * - Max 40 characters
   * - Only alphanumeric and underscores
   * - Must start with a letter
   */
  private sanitizeEventName(eventName: string): string {
    let sanitized = eventName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[^a-z]/, 'e_'); // Ensure starts with letter

    if (sanitized.length > 40) {
      sanitized = sanitized.substring(0, 40);
    }

    return sanitized;
  }

  /**
   * Sanitize parameter names and values for Firebase:
   * - Parameter names: max 40 characters, alphanumeric + underscores
   * - String values: max 100 characters
   * - Max 25 parameters per event
   */
  private sanitizeParams(params?: Record<string, any>): Record<string, any> | undefined {
    if (!params) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};
    let paramCount = 0;

    for (const [key, value] of Object.entries(params)) {
      if (paramCount >= 25) {
        console.warn('[Firebase Analytics] Max 25 parameters per event, truncating');
        break;
      }

      // Sanitize parameter name
      let sanitizedKey = key
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .substring(0, 40);

      // Sanitize value
      let sanitizedValue = value;
      if (typeof value === 'string' && value.length > 100) {
        sanitizedValue = value.substring(0, 100);
      } else if (typeof value === 'object') {
        // Firebase doesn't support nested objects, convert to string
        sanitizedValue = JSON.stringify(value).substring(0, 100);
      }

      sanitized[sanitizedKey] = sanitizedValue;
      paramCount++;
    }

    return sanitized;
  }

  /**
   * Helper methods that map to common analytics patterns
   */

  async trackScreenOpen(screenName: string): Promise<void> {
    await Promise.all([
      this.logScreenView(screenName),
      this.logEvent('screen_open', { screen: screenName }),
    ]);
  }

  async trackScreenClose(screenName: string, durationSeconds?: number): Promise<void> {
    await this.logEvent('screen_close', {
      screen: screenName,
      duration_seconds: durationSeconds,
    });
  }

  async trackFeatureUse(feature: string, screen?: string): Promise<void> {
    await this.logEvent('feature_use', {
      feature,
      screen,
    });
  }

  async trackAppBackground(): Promise<void> {
    await this.logEvent('app_background', {
      platform: Platform.OS,
    });
  }

  async trackAppForeground(): Promise<void> {
    await this.logEvent('app_foreground', {
      platform: Platform.OS,
    });
  }
}

// Export singleton instance
export const firebaseAnalytics = new FirebaseAnalyticsService();

// Export convenience functions
export const initFirebaseAnalytics = () => firebaseAnalytics.initialize();
export const logFirebaseEvent = (eventName: string, params?: Record<string, any>) =>
  firebaseAnalytics.logEvent(eventName, params);
export const logFirebaseScreenView = (screenName: string, screenClass?: string) =>
  firebaseAnalytics.logScreenView(screenName, screenClass);
export const setFirebaseUserId = (userId: string | null) =>
  firebaseAnalytics.setUserId(userId);
export const trackFirebaseScreenOpen = (screenName: string) =>
  firebaseAnalytics.trackScreenOpen(screenName);
export const trackFirebaseScreenClose = (screenName: string, durationSeconds?: number) =>
  firebaseAnalytics.trackScreenClose(screenName, durationSeconds);
export const trackFirebaseFeatureUse = (feature: string, screen?: string) =>
  firebaseAnalytics.trackFeatureUse(feature, screen);
