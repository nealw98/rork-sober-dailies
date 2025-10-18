/**
 * Big Book Access Control Example
 * 
 * This is a reference implementation showing how to check
 * access and display appropriate UI for free vs premium users.
 * 
 * This will be integrated into the actual Big Book reader in Phase 4.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { hasBigBookAccess, getBigBookAccessStatus } from '@/lib/bigbook-access';
import Colors from '@/constants/colors';

export function BigBookAccessExample() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [statusDetails, setStatusDetails] = useState<any>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoading(true);
    
    // Simple access check
    const access = await hasBigBookAccess();
    setHasAccess(access);
    
    // Get detailed status for display
    const details = await getBigBookAccessStatus();
    setStatusDetails(details);
    
    setLoading(false);
  };

  const handleOpenPDF = () => {
    // Official Big Book PDF on aa.org
    Linking.openURL('https://www.aa.org/sites/default/files/literature/Big_Book_1-164.pdf');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    // Free user - show link to aa.org PDF
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Alcoholics Anonymous</Text>
        <Text style={styles.subtitle}>The Big Book</Text>
        
        <Text style={styles.description}>
          Read the official Big Book (first 164 pages) on AA.org
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleOpenPDF}
        >
          <Text style={styles.buttonText}>Open Big Book PDF</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Subscribe to access the premium Big Book Reader with:
          {'\n'}• Text highlighting{'\n'}• Bookmarks{'\n'}• Advanced search{'\n'}• Notes
        </Text>
      </View>
    );
  }

  // Premium user - would show full reader
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Big Book Reader</Text>
      
      {statusDetails && (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Access Status:</Text>
          {statusDetails.isGrandfathered && (
            <Text style={styles.statusText}>✓ Grandfathered (Early Adopter)</Text>
          )}
          {statusDetails.hasSubscription && (
            <Text style={styles.statusText}>✓ Active Subscription</Text>
          )}
        </View>
      )}
      
      <Text style={styles.description}>
        Full reader UI will be implemented in Phase 4.
        {'\n\n'}Features coming:
        {'\n'}• Chapter navigation
        {'\n'}• Text highlighting (4 colors)
        {'\n'}• Bookmarks
        {'\n'}• Notes on highlights
        {'\n'}• Search within text
        {'\n'}• Go to page
      </Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => console.log('Would open reader')}
      >
        <Text style={styles.buttonText}>Open Reader (Coming Soon)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.muted,
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.muted,
  },
  statusBox: {
    backgroundColor: Colors.light.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.light.success || '#4CAF50',
    marginBottom: 4,
  },
});

