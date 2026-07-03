import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getAnonymousId, getAnonymousIdSync } from './anonymousId';

/**
 * Mixpanel analytics (replaces the old Supabase usage_events pipeline). Posts
 * directly to Mixpanel's HTTP ingestion API — no native SDK, so this ships via
 * OTA like everything else. Session/screen tracking and batched-queue-with-retry
 * are ported as-is from the old usageLogger; only the transport changed.
 *
 * distinct_id = the same per-device anonymous ID used elsewhere in the app
 * (lib/anonymousId.ts), so existing users keep continuous identity.
 */

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';
const MIXPANEL_TRACK_URL = 'https://api.mixpanel.com/track';
const MAX_BATCH_SIZE = 50; // Mixpanel's per-request event limit

interface QueuedEvent {
  event: string;
  properties: Record<string, any>;
}

class Analytics {
  private sessionId: string | null = null;
  private eventQueue: QueuedEvent[] = [];
  private isFlushing = false;
  private currentScreen: string | null = null;
  private screenOpenTime: number | null = null;
  private lastEventTime = 0;
  private appState: AppStateStatus = 'active';
  private sessionStartTime = Date.now();
  private lastBackgroundEventTime = 0;
  private warnedNoToken = false;

  constructor() {
    try {
      this.sessionId = this.generateId();
      this.setupAppStateListener();
    } catch (error) {
      console.error('[Analytics] Constructor error (non-fatal):', error);
      if (!this.sessionId) this.sessionId = this.generateId();
    }
  }

  init(): void {
    this.sessionId = this.generateId();
    this.sessionStartTime = Date.now();
    this.logEvent('app_launch', { platform: Platform.OS, app_version: Constants.expoConfig?.version });
    this.checkDailyStreak().catch((e) => console.error('[Analytics] Daily streak check failed:', e));
  }

  private generateId(): string {
    try {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
    }
  }

  async logEvent(event: string, props?: Record<string, any>): Promise<void> {
    if (!MIXPANEL_TOKEN) {
      if (!this.warnedNoToken) {
        console.warn('[Analytics] EXPO_PUBLIC_MIXPANEL_TOKEN not set — events are dropped, not queued.');
        this.warnedNoToken = true;
      }
      return;
    }
    if (!this.sessionId) {
      console.warn('[Analytics] Session not initialized, skipping event:', event);
      return;
    }

    const now = Date.now();
    // Throttle to max 1/sec, but let screen_* events through for accurate navigation tracking.
    if (now - this.lastEventTime < 1000 && !event.startsWith('screen_')) return;
    this.lastEventTime = now;

    const { screen, feature, duration_seconds, ...otherProps } = props || {};
    const anonymousId = getAnonymousIdSync() ?? (await getAnonymousId());

    this.eventQueue.push({
      event,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: anonymousId,
        time: now,
        $insert_id: `${this.sessionId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        session_id: this.sessionId,
        screen: screen || this.currentScreen || undefined,
        feature,
        duration_seconds,
        app_version: Constants.expoConfig?.version || undefined,
        platform: Platform.OS,
        ...otherProps,
      },
    });

    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.isFlushing || this.eventQueue.length === 0) return;
    setTimeout(() => this.flushEvents(), 2000);
  }

  async flushEvents(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) return;
    this.isFlushing = true;

    const batch = this.eventQueue.slice(0, MAX_BATCH_SIZE);
    const remainder = this.eventQueue.slice(MAX_BATCH_SIZE);
    this.eventQueue = remainder;

    try {
      const response = await fetch(MIXPANEL_TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error('[Analytics] Mixpanel track failed:', response.status);
        this.eventQueue.unshift(...batch); // retry next flush
      }
    } catch (error) {
      console.error('[Analytics] Error flushing to Mixpanel:', error);
      this.eventQueue.unshift(...batch);
    } finally {
      this.isFlushing = false;
      if (this.eventQueue.length > 0) this.scheduleFlush();
    }
  }

  onScreenFocus(screenName: string): void {
    if (this.currentScreen !== screenName) {
      this.currentScreen = screenName;
      this.screenOpenTime = Date.now();
    }
  }

  onScreenBlur(screenName: string): void {
    if (this.currentScreen === screenName) {
      this.currentScreen = null;
      this.screenOpenTime = null;
    }
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousAppState = this.appState;
      this.appState = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const now = Date.now();
        if (now - this.lastBackgroundEventTime < 1000) return;
        this.lastBackgroundEventTime = now;

        const sessionDuration = Math.floor((now - this.sessionStartTime) / 1000);
        this.logEvent('app_background', { platform: Platform.OS, screen: this.currentScreen, session_duration_seconds: sessionDuration });
        this.screenOpenTime = null;
      } else if (nextAppState === 'active' && previousAppState !== 'active') {
        const previousSessionId = this.sessionId;
        this.sessionId = this.generateId();
        this.sessionStartTime = Date.now();

        this.logEvent('app_foreground', { platform: Platform.OS, previous_session_id: previousSessionId, new_session_id: this.sessionId });
        this.checkDailyStreak().catch((e) => console.error('[Analytics] Daily streak check failed:', e));

        if (this.currentScreen) this.screenOpenTime = Date.now();
      }
    });
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async checkDailyStreak(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = await AsyncStorage.getItem('last_streak_check');
      if (lastCheck !== today) {
        await this.logEvent('daily_check_in', { date: today, platform: Platform.OS });
        await AsyncStorage.setItem('last_streak_check', today);
      }
    } catch (error) {
      console.error('[Analytics] Failed to check daily streak:', error);
    }
  }

  startNewSession(): string {
    const previousSessionId = this.sessionId;
    this.sessionId = this.generateId();
    this.logEvent('session_change', { previous_session_id: previousSessionId, new_session_id: this.sessionId, reason: 'manual' });
    return this.sessionId;
  }

  setCurrentScreen(screenName: string): void {
    this.onScreenFocus(screenName);
  }

  featureUse(feature: string, screen?: string): void {
    this.logEvent('feature_use', { feature, screen: screen || this.currentScreen });
  }
}

export const analytics = new Analytics();

export const initAnalytics = () => analytics.init();
export const logEvent = (event: string, props?: Record<string, any>) => analytics.logEvent(event, props);
export const featureUse = (feature: string, screen?: string) => analytics.featureUse(feature, screen);
export const setCurrentScreen = (screenName: string) => analytics.setCurrentScreen(screenName);
export const getCurrentSessionId = () => analytics.getSessionId();
export const startNewSession = () => analytics.startNewSession();
export const checkDailyStreak = () => analytics.checkDailyStreak();
