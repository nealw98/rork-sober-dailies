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
  anonymous_id: string | null;
  app_version?: string;
  platform: string;
}

class UsageLogger {
  private sessionId: string | null = null;
  private anonymousId: string | null = null;
  private eventQueue: UsageEvent[] = [];
  private isFlushing = false;
  private currentScreen: string | null = null;
  private lastEventTime: number = Date.now();
  private appState: AppStateStatus = 'active';
  private lastScreenLogged: string | null = null;
  private lastScreenLogTime: number = 0;

  constructor() {
    this.initializeSession();
    this.initializeAnonymousId();
    this.setupAppStateListener();
  }

  async initializeSession(): Promise<void> {
    try {
      // Always generate a new session ID on app launch
      this.sessionId = this.generateSessionId();
      console.log('[UsageLogger] New session initialized on app launch:', this.sessionId);
      
      // Log app launch event
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

      // Try to get from AsyncStorage
      const storedId = await AsyncStorage.getItem('anonymous_id');
      if (storedId) {
        this.anonymousId = storedId;
        return storedId;
      }

      // Generate new anonymous ID
      const newId = this.generateSessionId(); // Reuse UUID generation logic
      await AsyncStorage.setItem('anonymous_id', newId);
      this.anonymousId = newId;
      
      console.log('[UsageLogger] Generated new anonymous ID:', newId);
      return newId;
    } catch (error) {
      console.error('[UsageLogger] Failed to get/generate anonymous ID:', error);
      // Return a fallback ID if AsyncStorage fails
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

    const usageEvent: UsageEvent = {
      ts: new Date().toISOString(),
      event,
      screen: props?.screen || this.currentScreen || undefined,
      session_id: this.sessionId,
      anonymous_id: this.anonymousId,
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
      // Log screen close for previous screen
      if (this.currentScreen && this.shouldLogScreenEvent(this.currentScreen, 'close')) {
        this.logEvent('screen_close', { screen: this.currentScreen });
      }

      // Update current screen
      this.currentScreen = screenName;

      // Log screen open for new screen
      if (this.shouldLogScreenEvent(screenName, 'open')) {
        this.logEvent('screen_open', { screen: screenName });
      }
    }
  }

  onScreenBlur(screenName: string): void {
    if (this.currentScreen === screenName) {
      if (this.shouldLogScreenEvent(screenName, 'close')) {
        this.logEvent('screen_close', { screen: screenName });
      }
      this.currentScreen = null;
    }
  }

  // App state change handler
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousAppState = this.appState;
      this.appState = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - log app_background event
        this.logEvent('app_background', { 
          platform: Platform.OS,
          screen: this.currentScreen 
        });
        
        // Also log screen close if we have a current screen
        if (this.currentScreen) {
          this.logEvent('screen_close', {
            screen: this.currentScreen,
            reason: 'app_background'
          });
        }
      } else if (nextAppState === 'active' && previousAppState !== 'active') {
        // App coming back to foreground from background/inactive
        // Generate a new session ID for the new session
        const previousSessionId = this.sessionId;
        this.sessionId = this.generateSessionId();
        
        console.log('[UsageLogger] New session started on app foreground:', this.sessionId, 'Previous:', previousSessionId);
        
        // Log app_foreground event with new session
        this.logEvent('app_foreground', { 
          platform: Platform.OS,
          previous_session_id: previousSessionId,
          new_session_id: this.sessionId
        });
        
        // Check daily streak (non-blocking)
        this.checkDailyStreak().catch(error => {
          console.error('[UsageLogger] Daily streak check failed:', error);
        });
        
        // Also log screen open for the current screen with new session
        if (this.currentScreen && this.shouldLogScreenEvent(this.currentScreen, 'open')) {
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

// Export helper functions
export const logEvent = (event: string, props?: Record<string, any>) => usageLogger.logEvent(event, props);
export const featureUse = (feature: string, screen?: string) => usageLogger.featureUse(feature, screen);
export const setCurrentScreen = (screenName: string) => usageLogger.setCurrentScreen(screenName);
export const getCurrentSessionId = () => usageLogger.getSessionId();
export const getCurrentAnonymousId = () => usageLogger.getAnonymousIdSync();
export const getAnonymousId = () => usageLogger.getAnonymousId();
export const startNewSession = () => usageLogger.startNewSession();
export const checkDailyStreak = () => usageLogger.checkDailyStreak();
