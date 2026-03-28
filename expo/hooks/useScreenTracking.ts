import { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { usageLogger } from '@/lib/usageLogger';

// Screen tracking hook for NavigationContainer
export const useScreenTracking = (navigationRef: React.RefObject<NavigationContainerRef<any>>) => {
  const currentRouteNameRef = useRef<string | undefined>();

  useEffect(() => {
    if (!navigationRef.current) return;

    const navigation = navigationRef.current;

    // Get the current route name
    const getCurrentRouteName = (): string | undefined => {
      try {
        const state = navigation.getState();
        const route = state.routes[state.index];
        return route.name;
      } catch (error) {
        console.error('[ScreenTracking] Error getting current route:', error);
        return undefined;
      }
    };

    // Set up navigation state listener
    const unsubscribe = navigation.addListener('state', () => {
      const currentRouteName = getCurrentRouteName();

      if (currentRouteName && currentRouteName !== currentRouteNameRef.current) {
        // Screen changed
        const previousRouteName = currentRouteNameRef.current;
        currentRouteNameRef.current = currentRouteName;

        // Log screen close for previous screen
        if (previousRouteName) {
          usageLogger.onScreenBlur(previousRouteName);
        }

        // Log screen open for new screen
        usageLogger.onScreenFocus(currentRouteName);
      }
    });

    // Log initial screen
    const initialRouteName = getCurrentRouteName();
    if (initialRouteName) {
      currentRouteNameRef.current = initialRouteName;
      usageLogger.onScreenFocus(initialRouteName);
    }

    return unsubscribe;
  }, [navigationRef]);
};

// Hook to log initial screen focus when app starts
export const useInitialScreenFocus = (navigationRef: React.RefObject<NavigationContainerRef<any>>) => {
  const hasLoggedInitial = useRef(false);

  useEffect(() => {
    if (!navigationRef.current || hasLoggedInitial.current) return;

    try {
      const state = navigationRef.current.getState();
      const route = state.routes[state.index];
      const initialScreen = route.name;

      if (initialScreen) {
        usageLogger.onScreenFocus(initialScreen);
        hasLoggedInitial.current = true;
        console.log('[ScreenTracking] Initial screen logged:', initialScreen);
      }
    } catch (error) {
      console.error('[ScreenTracking] Error logging initial screen:', error);
    }
  }, [navigationRef]);
};
