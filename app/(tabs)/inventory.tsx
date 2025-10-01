import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import ScreenContainer from '@/components/ScreenContainer';

// Spot check pairs: Watch For → Strive For
const spotCheckPairs = [
  { watchFor: 'Anger', striveFor: 'Self-Control' },
  { watchFor: 'Self-Pity', striveFor: 'Self-Forgiveness' },
  { watchFor: 'Self-Justification', striveFor: 'Integrity' },
  { watchFor: 'Self-Importance', striveFor: 'Modesty' },
  { watchFor: 'Self-Condemnation', striveFor: 'Self-Esteem' },
  { watchFor: 'Dishonesty', striveFor: 'Honesty' },
  { watchFor: 'Impatience', striveFor: 'Patience' },
  { watchFor: 'Hate', striveFor: 'Love' },
  { watchFor: 'Resentment', striveFor: 'Forgiveness' },
  { watchFor: 'False Pride', striveFor: 'Humility' },
  { watchFor: 'Jealousy', striveFor: 'Trust' },
  { watchFor: 'Envy', striveFor: 'Generosity' },
  { watchFor: 'Laziness', striveFor: 'Activity' },
  { watchFor: 'Procrastination', striveFor: 'Promptness' },
  { watchFor: 'Insincerity', striveFor: 'Straightforwardness' },
  { watchFor: 'Negative Thinking', striveFor: 'Positive Thinking' },
  { watchFor: 'Criticizing', striveFor: 'Look For The Good' },
  { watchFor: 'Fear', striveFor: 'Faith' },
];

const Inventory = () => {
  return (
    <ScreenContainer style={styles.container} noPadding>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Spot Check Inventory</Text>
            
            {/* Column Headers */}
            <View style={styles.headerRow}>
              <Text style={styles.headerLeft}>Watch For</Text>
              <Text style={styles.headerRight}>Strive For</Text>
            </View>

            {/* Spot Check Cards */}
            <View style={styles.cardsContainer}>
              {spotCheckPairs.map((pair, index) => (
                <View key={index} style={styles.card}>
                  <Text style={styles.watchForText} numberOfLines={1}>
                    {pair.watchFor}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.striveForText} numberOfLines={1}>
                    {pair.striveFor}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc3545',
    flex: 1,
    textAlign: 'left',
  },
  headerRight: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    flex: 1,
    textAlign: 'right',
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  watchForText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#dc3545',
    textAlign: 'left',
  },
  arrow: {
    fontSize: 20,
    color: Colors.light.text,
    marginHorizontal: 12,
    fontWeight: 'bold',
  },
  striveForText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#28a745',
    textAlign: 'right',
  },
});

export default Inventory;
