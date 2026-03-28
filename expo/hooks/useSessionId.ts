import { useState, useEffect } from 'react';
import { getCurrentSessionId } from '@/lib/usageLogger';

/**
 * Hook to get the current session ID for analytics tracking
 * Automatically updates when a new session starts (app foreground/background)
 */
export const useSessionId = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session ID
    const currentSessionId = getCurrentSessionId();
    setSessionId(currentSessionId);

    // Set up interval to check for session changes
    // This is a simple approach - in a more complex app you might want to use
    // a context provider or event emitter for real-time updates
    const interval = setInterval(() => {
      const newSessionId = getCurrentSessionId();
      if (newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [sessionId]);

  return sessionId;
};

/**
 * Hook to get session ID with additional session management utilities
 */
export const useSession = () => {
  const sessionId = useSessionId();
  
  return {
    sessionId,
    // Additional session utilities can be added here
    isSessionActive: !!sessionId,
  };
};
