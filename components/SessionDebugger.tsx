import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSessionContext } from '@/hooks/useSessionContext';
import Colors from '@/constants/colors';

/**
 * Debug component to show current session ID and test session management
 * This can be used for testing and debugging session ID generation
 */
export const SessionDebugger: React.FC = () => {
  const { sessionId, startNewSession, isSessionActive } = useSessionContext();

  const handleStartNewSession = () => {
    const newSessionId = startNewSession();
    console.log('[SessionDebugger] Manual new session started:', newSessionId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Debug Info</Text>
      <Text style={styles.label}>Session ID:</Text>
      <Text style={styles.sessionId} numberOfLines={1} ellipsizeMode="middle">
        {sessionId || 'No session'}
      </Text>
      <Text style={styles.label}>Status:</Text>
      <Text style={[styles.status, { color: isSessionActive ? Colors.light.tint : '#ff6b6b' }]}>
        {isSessionActive ? 'Active' : 'Inactive'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleStartNewSession}>
        <Text style={styles.buttonText}>Start New Session</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.light.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.muted,
    marginTop: 8,
  },
  sessionId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.light.text,
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  button: {
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
