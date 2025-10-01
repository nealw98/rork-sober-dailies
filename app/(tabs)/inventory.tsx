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
  { watchFor: 'Insincere', striveFor: 'Straightforward' },
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
            
            {/* Main Container with all pairs */}
            <View style={styles.mainContainer}>
              {/* Column Headers */}
              <View style={styles.headerRow}>
                <Text style={styles.headerLeft}>Watch For</Text>
                <Text style={styles.headerRight}>Strive For</Text>
              </View>

              {/* Spot Check Cards */}
              <View style={styles.cardsContainer}>
                {spotCheckPairs.map((pair, index) => (
                  <View key={index} style={[styles.cardWrapper, styles.card]}>
                      <Text style={styles.watchForText}>
                        {pair.watchFor}
                      </Text>
                      <Text style={styles.arrow}>→</Text>
                      <Text style={styles.striveForText}>
                        {pair.striveFor}
                      </Text>
                  </View>
                ))}
              </View>
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
  mainContainer: {
    backgroundColor: 'rgba(186, 85, 211, 0.12)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 24,
  },
  headerLeft: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 12,
  },
  cardWrapper: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  watchForText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
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
    color: Colors.light.text,
    textAlign: 'right',
  },
});

export default Inventory;
