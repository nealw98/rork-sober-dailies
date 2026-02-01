import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { logEvent } from '@/lib/usageLogger';

/**
 * Hook to track time spent on a screen
 * 
 * Tracks:
 * - screen_opened: when user navigates to screen or returns from background
 * - screen_closed: when user navigates away or goes to background
 * - screen_time_completed: summary event with total duration
 * 
 * Ignores sessions under 2 seconds
 * 
 * IMPORTANT: Only fires screen_opened when screen is actually focused/visible,
 * not on mount. This prevents firing events for all tabs on app launch.
 * 
 * Sends events to both PostHog and Supabase (via usageLogger Edge Function).
 * 
 * @param screenName - Human-readable screen name (e.g., "Daily Reflections", "Salty Sam")
 */
export function useScreenTimeTracking(screenName: string) {
  const posthog = usePostHog();
  const startTimeRef = useRef<number | null>(null);
  const appStateSubscriptionRef = useRef<any>(null);

  // Track screen open/close based on screen focus (not mount)
  useFocusEffect(
    useCallback(() => {
      // Helper to safely capture PostHog events
      const safeCapture = (event: string, properties: Record<string, any>) => {
        try {
          posthog?.capture(event, properties);
        } catch (error) {
          console.warn(`[ScreenTime] PostHog capture failed for ${event}:`, error);
        }
      };

      // Screen is now focused - track screen open
      const openTimestamp = Date.now();
      startTimeRef.current = openTimestamp;
      
      console.log(`[ScreenTime] ${screenName} opened at ${new Date(openTimestamp).toISOString()}`);
      
      // PostHog
      safeCapture('screen_opened', {
        $screen_name: screenName,
        timestamp: openTimestamp,
      });
      
      // Supabase - already has internal error handling
      logEvent('screen_opened', {
        screen: screenName,
        timestamp: openTimestamp,
      });

      // Listen to app state changes (background/foreground)
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        try {
          const now = Date.now();

          if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App going to background - close the session
            if (startTimeRef.current) {
              const duration = Math.floor((now - startTimeRef.current) / 1000); // seconds
              
              console.log(`[ScreenTime] ${screenName} backgrounded, duration: ${duration}s`);
              
              // Only track if session was > 2 seconds
              if (duration >= 2) {
                // PostHog
                safeCapture('screen_closed', {
                  $screen_name: screenName,
                  timestamp: now,
                  duration_seconds: duration,
                });

                safeCapture('screen_time_completed', {
                  $screen_name: screenName,
                  duration_seconds: duration,
                  open_timestamp: startTimeRef.current,
                  close_timestamp: now,
                });
                
                // Supabase
                logEvent('screen_closed', {
                  screen: screenName,
                  duration_seconds: duration,
                  timestamp: now,
                });

                logEvent('screen_time_completed', {
                  screen: screenName,
                  duration_seconds: duration,
                  open_timestamp: startTimeRef.current,
                  close_timestamp: now,
                });
              } else {
                console.log(`[ScreenTime] ${screenName} session too short (${duration}s), ignoring`);
              }

              startTimeRef.current = null;
            }
          } else if (nextAppState === 'active') {
            // App returning to foreground - reopen the session
            // Only if we don't already have a start time (meaning we closed on background)
            if (!startTimeRef.current) {
              const reopenTimestamp = Date.now();
              startTimeRef.current = reopenTimestamp;
              
              console.log(`[ScreenTime] ${screenName} reopened from background at ${new Date(reopenTimestamp).toISOString()}`);
              
              // PostHog
              safeCapture('screen_opened', {
                $screen_name: screenName,
                timestamp: reopenTimestamp,
              });
              
              // Supabase
              logEvent('screen_opened', {
                screen: screenName,
                timestamp: reopenTimestamp,
              });
            }
          }
        } catch (error) {
          console.warn('[ScreenTime] App state change handler error:', error);
        }
      };

      let subscription: any = null;
      try {
        subscription = AppState.addEventListener('change', handleAppStateChange);
        appStateSubscriptionRef.current = subscription;
      } catch (error) {
        console.warn('[ScreenTime] Failed to add AppState listener:', error);
      }

      // Cleanup when screen loses focus
      return () => {
        // Remove app state listener
        try {
          if (appStateSubscriptionRef.current) {
            appStateSubscriptionRef.current.remove();
            appStateSubscriptionRef.current = null;
          }
        } catch (error) {
          console.warn('[ScreenTime] Failed to remove AppState listener:', error);
        }
        
        // Track screen close
        if (startTimeRef.current) {
          const closeTimestamp = Date.now();
          const duration = Math.floor((closeTimestamp - startTimeRef.current) / 1000); // seconds
          
          console.log(`[ScreenTime] ${screenName} closed (blur), duration: ${duration}s`);
          
          // Only track if session was > 2 seconds
          if (duration >= 2) {
            // PostHog
            safeCapture('screen_closed', {
              $screen_name: screenName,
              timestamp: closeTimestamp,
              duration_seconds: duration,
            });

            safeCapture('screen_time_completed', {
              $screen_name: screenName,
              duration_seconds: duration,
              open_timestamp: startTimeRef.current,
              close_timestamp: closeTimestamp,
            });
            
            // Supabase
            logEvent('screen_closed', {
              screen: screenName,
              duration_seconds: duration,
              timestamp: closeTimestamp,
            });

            logEvent('screen_time_completed', {
              screen: screenName,
              duration_seconds: duration,
              open_timestamp: startTimeRef.current,
              close_timestamp: closeTimestamp,
            });
          } else {
            console.log(`[ScreenTime] ${screenName} session too short (${duration}s), ignoring`);
          }
          
          startTimeRef.current = null;
        }
      };
    }, [screenName, posthog])
  );
}
