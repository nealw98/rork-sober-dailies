import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { usageLogger } from '@/lib/usageLogger';

// Hook to track screen changes in Expo Router
export const useExpoRouterTracking = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      // Convert pathname to screen name
      const screenName = pathname
        .replace(/^\//, '') // Remove leading slash
        .replace(/\/.*/, '') // Remove everything after first slash
        .replace(/^\(.*/, '') // Remove group names like (tabs)
        .replace(/\)$/, '') // Remove closing parentheses
        .replace(/\[.*\]/, ':id') // Convert [id] to :id
        .replace(/\+/, '') // Remove + prefix
        || 'home'; // Default to home if empty

      // Set current screen for logging
      usageLogger.setCurrentScreen(screenName);
    }
  }, [pathname]);
};
