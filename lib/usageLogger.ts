import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

interface UsageEvent {
  id?: string;
  ts: string;
  event: string;
  screen?: string;
  feature?: string;
  session_id: string;
  app_version?: string;
  platform: string;
}

class UsageLogger {
  private sessionId: string | null = null;
  private eventQueue: UsageEvent[] = [];
  private isFlushing = false;
  private currentScreen: string | null = null;
  private lastEventTime: number = Date.now();

  constructor() {
    this.initializeSession();
    this.setupAppStateListener();
  }

  async initializeSession(): Promise<void> {
    try {
      // Try to load existing session ID
      let sessionId = await AsyncStorage.getItem('usage_session_id');

      if (!sessionId) {
        // Generate new UUID-like session ID
        sessionId = this.generateSessionId();
        await AsyncStorage.setItem('usage_session_id', sessionId);
      }

      this.sessionId = sessionId;
      console.log('[UsageLogger] Session initialized:', sessionId);
    } catch (error) {
      console.error('[UsageLogger] Failed to initialize session:', error);
      // Generate temporary session ID if storage fails
      this.sessionId = this.generateSessionId();
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

    const usageEvent: UsageEvent = {
      ts: new Date().toISOString(),
      event,
      screen: props?.screen || this.currentScreen || undefined,
      session_id: this.sessionId,
      app_version: Constants.expoConfig?.version || undefined,
      platform: Platform.OS
    };

    // Add feature if it's a feature-related event
    if (props?.feature) {
      usageEvent.feature = props.feature;
    }

    this.eventQueue.push(usageEvent);
    console.log('[UsageLogger] Event queued:', event, 'screen:', props?.screen || this.currentScreen, 'queue size:', this.eventQueue.length);

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
    if (this.isFlushing || this.eventQueue.length === 0 || !supabase) {
      return;
    }

    this.isFlushing = true;
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      console.log('[UsageLogger] Flushing', eventsToFlush.length, 'events');

      const { error } = await supabase
        .from('usage_events')
        .insert(eventsToFlush);

      if (error) {
        console.error('[UsageLogger] Failed to flush events:', error);
        // Put events back in queue for retry
        this.eventQueue.unshift(...eventsToFlush);
      } else {
        console.log('[UsageLogger] Successfully flushed events');
      }
    } catch (error) {
      console.error('[UsageLogger] Error flushing events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  // Screen tracking hooks
  onScreenFocus(screenName: string): void {
    if (this.currentScreen !== screenName) {
      // Log screen close for previous screen
      if (this.currentScreen) {
        this.logEvent('screen_close', { screen: this.currentScreen });
      }

      // Update current screen
      this.currentScreen = screenName;

      // Log screen open for new screen
      this.logEvent('screen_open', { screen: screenName });
    }
  }

  onScreenBlur(screenName: string): void {
    if (this.currentScreen === screenName) {
      this.logEvent('screen_close', { screen: screenName });
      this.currentScreen = null;
    }
  }

  // App state change handler
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - log screen close if we have a current screen
        if (this.currentScreen) {
          this.logEvent('screen_close', {
            screen: this.currentScreen,
            reason: 'app_background'
          });
        }
      } else if (nextAppState === 'active') {
        // App coming back to foreground
        this.logEvent('app_foreground', { platform: Platform.OS });
      }
    });
  }

  // Get current session ID
  getSessionId(): string | null {
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

// Export helper functions
export const logEvent = (event: string, props?: Record<string, any>) => usageLogger.logEvent(event, props);
export const featureUse = (feature: string, screen?: string) => usageLogger.featureUse(feature, screen);
export const setCurrentScreen = (screenName: string) => usageLogger.setCurrentScreen(screenName);
