import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function PrayersScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prayers</Text>
        <Text style={styles.subtitle}>Connect with your Higher Power</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.prayerCard} onPress={() => console.log('Morning Prayer')}>
          <Text style={styles.cardTitle}>Morning Prayer</Text>
          <Text style={styles.cardDescription}>
            Start your day by asking your Higher Power for guidance and strength.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.prayerCard} onPress={() => console.log('Evening Prayer')}>
          <Text style={styles.cardTitle}>Evening Prayer</Text>
          <Text style={styles.cardDescription}>
            End your day with gratitude and reflection on your actions.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.prayerCard} onPress={() => console.log('Serenity Prayer')}>
          <Text style={styles.cardTitle}>Serenity Prayer</Text>
          <Text style={styles.cardDescription}>
            "God, grant me the serenity to accept the things I cannot change..."
          </Text>
        </TouchableOpacity>
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
    backgroundColor: '#8B5A2B',
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
  prayerCard: {
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
  backButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#8B5A2B',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
