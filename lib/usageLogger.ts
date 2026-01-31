import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const ANONYMOUS_ID_KEY = 'sober_dailies_anonymous_id';

// Edge Function URL for logging events with geolocation
const USAGE_EVENT_FUNCTION_URL = 'https://uzfqabcjxjqufpipdcla.supabase.co/functions/v1/log-usage-event';

// Supabase anon key for Edge Function authorization
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZnFhYmNqeGpxdWZwaXBkY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTI4NDgsImV4cCI6MjA2ODc2ODg0OH0.kqPftTCAXLQNd0sdDpIC1TRMXjk315hn92BEW7TKXmU';

interface UsageEvent {
  id?: string;
  ts: string;
  event: string;
  screen?: string;
  feature?: string;
  duration_seconds?: number;
  session_id: string;
  anonymous_id: string | null;
  app_version?: string;
  platform: string;
  properties?: Record<string, any>;
}

// PostHog type (avoiding direct import to prevent circular dependencies)
type PostHogInstance = {
  capture: (event: string, properties?: Record<string, any>) => void;
} | null;

class UsageLogger {
  private sessionId: string | null = null;
  private anonymousId: string | null = null;
  private eventQueue: UsageEvent[] = [];
  private isFlushing = false;
  private currentScreen: string | null = null;
  private screenOpenTime: number | null = null;
  private lastEventTime: number = Date.now();
  private appState: AppStateStatus = 'active';
  private lastScreenLogged: string | null = null;
  private lastScreenLogTime: number = 0;
  private posthog: PostHogInstance = null;
  private sessionStartTime: number = Date.now(); // Track when session started
  private lastBackgroundEventTime: number = 0; // Prevent duplicate background events

  constructor() {
    this.initializeSession();
    this.initializeAnonymousId();
    this.setupAppStateListener();
  }

  // Set PostHog instance for dual tracking
  setPostHog(posthogInstance: PostHogInstance): void {
    this.posthog = posthogInstance;
    console.log('[UsageLogger] PostHog instance registered for dual tracking');
  }

  async initializeSession(): Promise<void> {
    try {
      // Always generate a new session ID on app launch
      this.sessionId = this.generateSessionId();
      this.sessionStartTime = Date.now(); // Record session start time
      console.log('[UsageLogger] New session initialized on app launch:', this.sessionId);
      
      // Log app launch event to Supabase (NOT PostHog - user doesn't want Application Opened)
      this.logEvent('app_launch', { 
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version 
      });
      
      // Check daily streak on app launch (non-blocking)
      this.checkDailyStreak().catch(error => {
        console.error('[UsageLogger] Daily streak check failed on launch:', error);
      });
    } catch (error) {
      console.error('[UsageLogger] Failed to initialize session:', error);
      // Generate temporary session ID if anything fails
      this.sessionId = this.generateSessionId();
    }
  }

  async initializeAnonymousId(): Promise<void> {
    try {
      this.anonymousId = await this.getAnonymousId();
      console.log('[UsageLogger] Anonymous ID initialized:', this.anonymousId);
    } catch (error) {
      console.error('[UsageLogger] Failed to initialize anonymous ID:', error);
      // Continue without anonymous ID - events will still be logged
      this.anonymousId = null;
    }
  }

  async getAnonymousId(): Promise<string> {
    try {
      // Check if we already have it in memory
      if (this.anonymousId) {
        return this.anonymousId;
      }

      // Try to get from SecureStore first (persists across reinstalls on iOS)
      const secureId = await SecureStore.getItemAsync(ANONYMOUS_ID_KEY);
      if (secureId) {
        this.anonymousId = secureId;
        console.log('[UsageLogger] Retrieved anonymous ID from SecureStore');
        return secureId;
      }

      // Check AsyncStorage for migration from existing users
      const legacyId = await AsyncStorage.getItem('anonymous_id');
      if (legacyId) {
        // Migrate to SecureStore
        await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, legacyId);
        this.anonymousId = legacyId;
        console.log('[UsageLogger] Migrated anonymous ID to SecureStore:', legacyId);
        return legacyId;
      }

      // Generate new anonymous ID and store in SecureStore
      const newId = this.generateSessionId(); // Reuse UUID generation logic
      await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, newId);
      // Also store in AsyncStorage as backup
      await AsyncStorage.setItem('anonymous_id', newId);
      this.anonymousId = newId;
      
      console.log('[UsageLogger] Generated new anonymous ID (SecureStore):', newId);
      return newId;
    } catch (error) {
      console.error('[UsageLogger] Failed to get/generate anonymous ID:', error);
      // Return a fallback ID if storage fails
      const fallbackId = this.generateSessionId();
      this.anonymousId = fallbackId;
      return fallbackId;
    }
  }

  private generateSessionId(): string {
    // Use expo-crypto for proper UUID generation
    try {
      const { randomUUID } = require('expo-crypto');
      return randomUUID();
    } catch (error) {
      console.warn('[UsageLogger] expo-crypto not available, falling back to manual UUID generation');
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }

  async logEvent(event: string, props?: Record<string, any>): Promise<void> {
    if (!this.sessionId) {
      console.warn('[UsageLogger] Session not initialized, skipping event:', event);
      return;
    }

    const now = Date.now();
    // Throttle events to prevent spam (max 1 event per second)
    // But allow screen events to bypass throttling for proper navigation tracking
    if (now - this.lastEventTime < 1000 && !event.startsWith('screen_')) {
      return;
    }
    this.lastEventTime = now;

    // Extract known fields from props, put the rest in properties
    const { screen, feature, duration_seconds, ...otherProps } = props || {};

    const usageEvent: UsageEvent = {
      ts: new Date().toISOString(),
      event,
      screen: screen || this.currentScreen || undefined,
      session_id: this.sessionId,
      anonymous_id: this.anonymousId,
      app_version: Constants.expoConfig?.version || undefined,
      platform: Platform.OS
    };

    // Add feature if it's a feature-related event
    if (feature) {
      usageEvent.feature = feature;
    }

    // Add duration if provided (for screen_close events)
    if (duration_seconds !== undefined) {
      usageEvent.duration_seconds = duration_seconds;
    }

    // Add any additional properties to the properties field
    if (Object.keys(otherProps).length > 0) {
      usageEvent.properties = otherProps;
    }

    this.eventQueue.push(usageEvent);
    console.log('[UsageLogger] Event queued:', event, 'screen:', screen || this.currentScreen, 'duration:', duration_seconds, 'properties:', usageEvent.properties, 'queue size:', this.eventQueue.length);

    // Flush events in the background
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    // Flush after a short delay to batch events
    setTimeout(() => {
      this.flushEvents();
    }, 2000);
  }

  async flushEvents(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      console.log('[UsageLogger] Flushing', eventsToFlush.length, 'events to Edge Function');

      const response = await fetch(USAGE_EVENT_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ events: eventsToFlush }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[UsageLogger] Failed to flush events:', response.status, errorData);
        // Put events back in queue for retry
        this.eventQueue.unshift(...eventsToFlush);
      } else {
        const result = await response.json();
        console.log('[UsageLogger] Successfully flushed events:', result.message, result.location ? `(${result.location})` : '');
      }
    } catch (error) {
      console.error('[UsageLogger] Error flushing events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  // Debounced screen logging to prevent duplicates
  private shouldLogScreenEvent(screenName: string, eventType: 'open' | 'close'): boolean {
    const now = Date.now();
    const timeSinceLastLog = now - this.lastScreenLogTime;
    const isSameScreen = this.lastScreenLogged === screenName;
    
    // Allow screen events if:
    // 1. It's been more than 1 second since last screen log, OR
    // 2. It's a different screen, OR  
    // 3. It's a screen_close event (always allow close events)
    if (timeSinceLastLog > 1000 || !isSameScreen || eventType === 'close') {
      this.lastScreenLogged = screenName;
      this.lastScreenLogTime = now;
      return true;
    }
    
    console.log('[UsageLogger] Skipping duplicate screen event:', eventType, screenName, 'last logged:', timeSinceLastLog + 'ms ago');
    return false;
  }

  // Screen tracking hooks
  onScreenFocus(screenName: string): void {
    if (this.currentScreen !== screenName) {
      // Log screen close for previous screen with duration
      if (this.currentScreen && this.shouldLogScreenEvent(this.currentScreen, 'close')) {
        const duration = this.calculateScreenDuration();
        this.logEvent('screen_close', { 
          screen: this.currentScreen,
          duration_seconds: duration
        });
      }

      // Update current screen and record open time
      this.currentScreen = screenName;
      this.screenOpenTime = Date.now();

      // Log screen open for new screen
      if (this.shouldLogScreenEvent(screenName, 'open')) {
        this.logEvent('screen_open', { screen: screenName });
      }
    }
  }

  onScreenBlur(screenName: string): void {
    if (this.currentScreen === screenName) {
      if (this.shouldLogScreenEvent(screenName, 'close')) {
        const duration = this.calculateScreenDuration();
        this.logEvent('screen_close', { 
          screen: screenName,
          duration_seconds: duration
        });
      }
      this.currentScreen = null;
      this.screenOpenTime = null;
    }
  }

  // Calculate time spent on current screen in seconds
  private calculateScreenDuration(): number | undefined {
    if (!this.screenOpenTime) return undefined;
    const durationMs = Date.now() - this.screenOpenTime;
    return Math.round(durationMs / 1000);
  }

  // App state change handler
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousAppState = this.appState;
      this.appState = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Prevent duplicate background events
        const now = Date.now();
        if (now - this.lastBackgroundEventTime < 1000) {
          console.log('[UsageLogger] Skipping duplicate background event');
          return;
        }
        this.lastBackgroundEventTime = now;
        
        // Calculate session duration
        const sessionDuration = Math.floor((now - this.sessionStartTime) / 1000);
        
        // App going to background - log app_background event to Supabase
        this.logEvent('app_background', { 
          platform: Platform.OS,
          screen: this.currentScreen,
          session_duration_seconds: sessionDuration
        });
        
        // Also send to PostHog with session duration
        this.posthog?.capture('Application Backgrounded', {
          platform: Platform.OS,
          $screen_name: this.currentScreen,
          session_duration_seconds: sessionDuration,
          session_id: this.sessionId
        });
        
        // Also log screen close if we have a current screen (with duration)
        if (this.currentScreen) {
          const duration = this.calculateScreenDuration();
          this.logEvent('screen_close', {
            screen: this.currentScreen,
            reason: 'app_background',
            duration_seconds: duration
          });
          this.screenOpenTime = null;
        }
      } else if (nextAppState === 'active' && previousAppState !== 'active') {
        // App coming back to foreground from background/inactive
        // Generate a new session ID for the new session
        const previousSessionId = this.sessionId;
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now(); // Reset session start time
        
        console.log('[UsageLogger] New session started on app foreground:', this.sessionId, 'Previous:', previousSessionId);
        
        // Log app_foreground event to Supabase with new session
        this.logEvent('app_foreground', { 
          platform: Platform.OS,
          previous_session_id: previousSessionId,
          new_session_id: this.sessionId
        });
        
        // Also send to PostHog
        this.posthog?.capture('Application Became Active', {
          platform: Platform.OS,
          $screen_name: this.currentScreen,
          previous_session_id: previousSessionId,
          new_session_id: this.sessionId
        });
        
        // Check daily streak (non-blocking)
        this.checkDailyStreak().catch(error => {
          console.error('[UsageLogger] Daily streak check failed:', error);
        });
        
        // Also log screen open for the current screen with new session
        if (this.currentScreen && this.shouldLogScreenEvent(this.currentScreen, 'open')) {
          this.screenOpenTime = Date.now(); // Reset timer for returning to screen
          this.logEvent('screen_open', {
            screen: this.currentScreen,
            reason: 'app_foreground'
          });
        }
      }
    });
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Get current anonymous ID
  getAnonymousIdSync(): string | null {
    return this.anonymousId;
  }

  // Check and log daily streak
  async checkDailyStreak(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if we've already logged today
      const lastCheck = await AsyncStorage.getItem('last_streak_check');
      
      if (lastCheck !== today) {
        // Log daily check-in event
        await this.logEvent('daily_check_in', {
          date: today,
          platform: Platform.OS
        });
        
        // Update last check date
        await AsyncStorage.setItem('last_streak_check', today);
        
        console.log('[UsageLogger] Daily streak check logged for:', today);
      } else {
        console.log('[UsageLogger] Daily streak already logged for:', today);
      }
    } catch (error) {
      console.error('[UsageLogger] Failed to check daily streak:', error);
      // Don't throw - this shouldn't block app functionality
    }
  }

  // Manually start a new session (useful for testing or special cases)
  startNewSession(): string {
    const previousSessionId = this.sessionId;
    this.sessionId = this.generateSessionId();
    
    console.log('[UsageLogger] Manual new session started:', this.sessionId, 'Previous:', previousSessionId);
    
    // Log session change event
    this.logEvent('session_change', {
      previous_session_id: previousSessionId,
      new_session_id: this.sessionId,
      reason: 'manual'
    });
    
    return this.sessionId;
  }

  // Manual screen tracking
  setCurrentScreen(screenName: string): void {
    this.onScreenFocus(screenName);
  }

  // Feature use tracking helper
  featureUse(feature: string, screen?: string): void {
    this.logEvent('feature_use', { feature, screen: screen || this.currentScreen });
  }
}

// Export singleton instance
export const usageLogger = new UsageLogger();

// Export initialization function
export const initUsageLogger = () => usageLogger;

// Export function to set PostHog instance
export const setPostHogForUsageLogger = (posthogInstance: any) => usageLogger.setPostHog(posthogInstance);

// Export helper functions
export const logEvent = (event: string, props?: Record<string, any>) => usageLogger.logEvent(event, props);
export const featureUse = (feature: string, screen?: string) => usageLogger.featureUse(feature, screen);
export const setCurrentScreen = (screenName: string) => usageLogger.setCurrentScreen(screenName);
export const getCurrentSessionId = () => usageLogger.getSessionId();
export const getCurrentAnonymousId = () => usageLogger.getAnonymousIdSync();
export const getAnonymousId = () => usageLogger.getAnonymousId();
export const startNewSession = () => usageLogger.startNewSession();
export const checkDailyStreak = () => usageLogger.checkDailyStreak();
