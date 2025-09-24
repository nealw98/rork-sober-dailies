import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { usageLogger } from '@/lib/usageLogger';

// Hook to track screen changes in Expo Router
export const useExpoRouterTracking = () => {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (pathname) {
      // Convert pathname to screen name
      const screenName = getScreenNameFromPathname(pathname);
      console.log('[ScreenTracking] Pathname changed:', pathname, '-> Screen:', screenName);

      if (isInitialLoad.current) {
        // On initial app load, log screen_open for the first screen
        console.log('[ScreenTracking] Initial load - logging screen_open for:', screenName);
        usageLogger.setCurrentScreen(screenName);
        isInitialLoad.current = false;
      } else if (previousPathname.current && previousPathname.current !== pathname) {
        // On route change, log screen_close for previous and screen_open for current
        const previousScreenName = getScreenNameFromPathname(previousPathname.current);
        console.log('[ScreenTracking] Route change - logging screen_close for:', previousScreenName, 'and screen_open for:', screenName);
        usageLogger.setCurrentScreen(screenName);
      }

      previousPathname.current = pathname;
    }
  }, [pathname]);
};

// Helper function to convert pathname to readable screen name
const getScreenNameFromPathname = (pathname: string): string => {
  if (pathname === '/') {
    return 'Home';
  }
  
  // Remove leading slash and any (tabs) group
  let name = pathname.replace(/^\//, '').replace(/^\(tabs\)\//, '');
  
  // Replace hyphens with spaces and capitalize each word
  name = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  
  // Handle dynamic routes like [id]
  if (name.includes('[')) {
    name = name.replace(/\[.*?\]/g, 'Detail');
  }
  
  // Handle special cases
  if (name === '') return 'Home';
  if (name === 'Literature') return 'Literature';
  if (name === 'EveningReview') return 'EveningReview';
  if (name === 'Gratitude') return 'Gratitude';
  if (name === 'AboutSupport') return 'AboutSupport';
  if (name === 'Store') return 'AboutSupport'; // Store screen is actually About/Support
  if (name === 'Privacy') return 'Privacy';
  if (name === 'Terms') return 'Terms';
  
  return name || 'Unknown';
};
