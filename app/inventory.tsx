import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';

const Inventory = () => {
  const onTheBeam = [
    'Honesty',
    'Faith',
    'Courage',
    'Considerate',
    'Humility',
    'Giving',
    'Calm',
    'Grateful',
    'Patience',
    'Tolerance',
    'Forgiveness',
    'Love',
    'Self-Forgetfulness',
    'Humility',
    'Modesty',
    'Self-Forgiveness',
    'Trust',
    'Moderation',
    'Action'
  ];

  const offTheBeam = [
    'Dishonest',
    'Fear',
    'Frightened',
    'Inconsiderate',
    'Pride',
    'Greedy',
    'Anger',
    'Envy',
    'Impatient',
    'Intolerant',
    'Resentment',
    'Hate',
    'Self-Pity',
    'Self-Justification',
    'Self-Importance',
    'Self-Condemnation',
    'Suspicion',
    'Gluttony',
    'Sloth'
  ];

  return (
    <>
      <Stack.Screen options={{ title: "Spot Check Inventory" }} />
      <ScreenContainer style={styles.container} noPadding>
        <LinearGradient
          colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentContainer}>
              <Text style={styles.titleLine2}>Are you on the beam?</Text>
              <View style={styles.cardContainer}>
                <View style={styles.gridContainer}>
                  <View style={styles.columnContainer}>
                    <Text style={[styles.columnTitleOn, { fontStyle: 'italic' }]}>ON THE BEAM</Text>
                    <View style={styles.underline} />
                    {onTheBeam.map((item, index) => (
                      <Text key={index} style={[styles.itemText, styles.noWrap]}>{item}</Text>
                    ))}
                  </View>
                  <View style={styles.columnContainer}>
                    <Text style={[styles.columnTitleOff, { fontStyle: 'italic' }]}>OFF THE BEAM</Text>
                    <View style={styles.underline} />
                    {offTheBeam.map((item, index) => (
                      <Text key={index} style={[styles.itemText, styles.noWrap]}>{item}</Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ScreenContainer>
    </>
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
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  contentContainer: {
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 20,
    paddingTop: 20,
    // Remove blue card outline/shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  titleLine1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleLine2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  columnContainer: {
    width: '48%',
    marginBottom: 16,
  },
  columnTitleOn: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  columnTitleOff: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  underline: {
    height: 2,
    backgroundColor: '#333',
    marginBottom: 8,
    marginTop: -8,
    width: '80%',
    alignSelf: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
    paddingVertical: 4,
  },
  noWrap: {
    flexShrink: 0,
  },
});

export default Inventory;