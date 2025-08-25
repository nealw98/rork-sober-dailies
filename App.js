import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function App() {
  console.log('=== SOBER DAILIES APP LOADING ===');
  
  const handleButtonPress = (feature) => {
    console.log(`Pressed: ${feature}`);
    // For now, just log. Later we can add navigation
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sober Dailies</Text>
        <Text style={styles.subtitle}>
          This app helps you practice your dailies — the daily habits that maintain your sobriety.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Morning Routine</Text>
        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('Morning Prayer')}>
          <Text style={styles.cardTitle}>Morning Prayer</Text>
          <Text style={styles.cardDescription}>Invite your higher power to help you through the day.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('Daily Gratitude')}>
          <Text style={styles.cardTitle}>Daily Gratitude</Text>
          <Text style={styles.cardDescription}>Start your day with gratitude and stay in the solution.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Throughout the Day</Text>
        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('AI Sponsor')}>
          <Text style={styles.cardTitle}>AI Sponsor</Text>
          <Text style={styles.cardDescription}>Talk with an AI sponsor voice when you need support.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('Literature')}>
          <Text style={styles.cardTitle}>Literature</Text>
          <Text style={styles.cardDescription}>Read something out of the literature every day.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evening Routine</Text>
        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('Evening Review')}>
          <Text style={styles.cardTitle}>Evening Review</Text>
          <Text style={styles.cardDescription}>Reflect on your day and practice Step 10.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => handleButtonPress('Evening Prayer')}>
          <Text style={styles.cardTitle}>Evening Prayer</Text>
          <Text style={styles.cardDescription}>End your day with gratitude and humility.</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#4A90E2',
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
    lineHeight: 22,
  },
  section: {
    padding: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});