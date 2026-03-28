import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getCurrentSessionId, startNewSession } from '@/lib/usageLogger';

interface SessionContextType {
  sessionId: string | null;
  startNewSession: () => string;
  isSessionActive: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Context provider for session management
 * Provides real-time session ID updates throughout the app
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Get initial session ID
    const currentSessionId = getCurrentSessionId();
    setSessionId(currentSessionId);

    // Listen for app state changes to detect new sessions
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      
      // Check if session ID changed (happens on app foreground)
      const newSessionId = getCurrentSessionId();
      if (newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [sessionId]);

  const handleStartNewSession = () => {
    const newSessionId = startNewSession();
    setSessionId(newSessionId);
    return newSessionId;
  };

  const value: SessionContextType = {
    sessionId,
    startNewSession: handleStartNewSession,
    isSessionActive: !!sessionId,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Hook to access session context
 * Must be used within a SessionProvider
 */
export const useSessionContext = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
};

/**
 * Simple hook to get current session ID
 * Falls back to direct usageLogger call if not in context
 */
export const useSessionId = (): string | null => {
  try {
    const { sessionId } = useSessionContext();
    return sessionId;
  } catch {
    // Fallback if not in context
    return getCurrentSessionId();
  }
};
