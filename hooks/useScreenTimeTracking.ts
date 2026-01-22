import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePostHog } from 'posthog-react-native';

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
 * @param screenName - Human-readable screen name (e.g., "Daily Reflections", "Salty Sam")
 */
export function useScreenTimeTracking(screenName: string) {
  const posthog = usePostHog();
  const startTimeRef = useRef<number | null>(null);
  const wasBackgroundedRef = useRef(false);

  useEffect(() => {
    // Track screen open on mount
    const openTimestamp = Date.now();
    startTimeRef.current = openTimestamp;
    
    console.log(`[ScreenTime] ${screenName} opened at ${new Date(openTimestamp).toISOString()}`);
    
    posthog?.capture('screen_opened', {
      screen_name: screenName,
      timestamp: openTimestamp,
    });

    // Listen to app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const now = Date.now();

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - close the session
        if (startTimeRef.current) {
          const duration = Math.floor((now - startTimeRef.current) / 1000); // seconds
          
          console.log(`[ScreenTime] ${screenName} backgrounded, duration: ${duration}s`);
          
          // Only track if session was > 2 seconds
          if (duration >= 2) {
            posthog?.capture('screen_closed', {
              screen_name: screenName,
              timestamp: now,
              duration_seconds: duration,
            });

            posthog?.capture('screen_time_completed', {
              screen_name: screenName,
              duration_seconds: duration,
              open_timestamp: startTimeRef.current,
              close_timestamp: now,
            });
          } else {
            console.log(`[ScreenTime] ${screenName} session too short (${duration}s), ignoring`);
          }

          wasBackgroundedRef.current = true;
          startTimeRef.current = null;
        }
      } else if (nextAppState === 'active') {
        // App returning to foreground - reopen the session
        if (wasBackgroundedRef.current) {
          const reopenTimestamp = Date.now();
          startTimeRef.current = reopenTimestamp;
          wasBackgroundedRef.current = false;
          
          console.log(`[ScreenTime] ${screenName} reopened from background at ${new Date(reopenTimestamp).toISOString()}`);
          
          posthog?.capture('screen_opened', {
            screen_name: screenName,
            timestamp: reopenTimestamp,
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Track screen close on unmount
    return () => {
      subscription.remove();
      
      if (startTimeRef.current) {
        const closeTimestamp = Date.now();
        const duration = Math.floor((closeTimestamp - startTimeRef.current) / 1000); // seconds
        
        console.log(`[ScreenTime] ${screenName} closed (unmount), duration: ${duration}s`);
        
        // Only track if session was > 2 seconds
        if (duration >= 2) {
          posthog?.capture('screen_closed', {
            screen_name: screenName,
            timestamp: closeTimestamp,
            duration_seconds: duration,
          });

          posthog?.capture('screen_time_completed', {
            screen_name: screenName,
            duration_seconds: duration,
            open_timestamp: startTimeRef.current,
            close_timestamp: closeTimestamp,
          });
        } else {
          console.log(`[ScreenTime] ${screenName} session too short (${duration}s), ignoring`);
        }
      }
    };
  }, [screenName, posthog]);
}
