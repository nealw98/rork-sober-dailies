import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function GratitudeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Gratitude</Text>
        <Text style={styles.subtitle}>Start your day with gratitude</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Today I am grateful for:</Text>
        
        <View style={styles.gratitudeCard}>
          <Text style={styles.cardNumber}>1.</Text>
          <Text style={styles.cardPlaceholder}>Tap to add your first gratitude...</Text>
        </View>

        <View style={styles.gratitudeCard}>
          <Text style={styles.cardNumber}>2.</Text>
          <Text style={styles.cardPlaceholder}>Tap to add your second gratitude...</Text>
        </View>

        <View style={styles.gratitudeCard}>
          <Text style={styles.cardNumber}>3.</Text>
          <Text style={styles.cardPlaceholder}>Tap to add your third gratitude...</Text>
        </View>

        <Text style={styles.inspiration}>
          "Gratitude turns what we have into enough, and more. It turns denial into acceptance, 
          chaos into order, confusion into clarity...it makes sense of our past, brings peace 
          for today, and creates a vision for tomorrow."
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  gratitudeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 12,
  },
  cardPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  inspiration: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  backButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
