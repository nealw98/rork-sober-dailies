// Simple global tracking of previous route for back navigation
let previousRoute: string = '/';
let currentRoute: string = '/';

export const setPreviousRoute = (newRoute: string) => {
  // Only update if the route is different and not settings
  if (newRoute !== currentRoute && newRoute !== '/settings') {
    previousRoute = currentRoute;
    currentRoute = newRoute;
  } else if (newRoute === '/settings') {
    // When navigating to settings, just update current
    currentRoute = newRoute;
  }
};

export const getPreviousRoute = (): string => {
  return previousRoute || '/';
};

