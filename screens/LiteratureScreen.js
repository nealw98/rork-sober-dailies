import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function LiteratureScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Literature</Text>
        <Text style={styles.subtitle}>Read something from the literature daily</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.bookCard} onPress={() => console.log('Big Book')}>
          <Text style={styles.cardTitle}>Alcoholics Anonymous (Big Book)</Text>
          <Text style={styles.cardDescription}>
            The foundational text of AA. Contains the program of recovery and personal stories.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookCard} onPress={() => console.log('Twelve and Twelve')}>
          <Text style={styles.cardTitle}>Twelve Steps and Twelve Traditions</Text>
          <Text style={styles.cardDescription}>
            Detailed explanations of the Steps and Traditions that guide AA.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookCard} onPress={() => console.log('Daily Reflections')}>
          <Text style={styles.cardTitle}>Daily Reflections</Text>
          <Text style={styles.cardDescription}>
            Daily meditations and reflections for personal growth and recovery.
          </Text>
        </TouchableOpacity>

        <Text style={styles.inspiration}>
          "The spiritual life is not a theory. We have to live it." - Big Book, p. 83
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
    backgroundColor: '#2196F3',
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
  bookCard: {
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
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
