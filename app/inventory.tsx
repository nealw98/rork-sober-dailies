import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';

const Inventory = () => {
  const onTheBeam = [
    'HONESTY',
    'FAITH',
    'COURAGE',
    'GIVING',
    'CALM',
    'GRATEFUL',
    'PATIENCE',
    'LOVE',
    'TRUST',
    'ACTION'
  ];

  const offTheBeam = [
    'DISHONEST',
    'FEAR',
    'PRIDE',
    'GREEDY',
    'ANGER',
    'ENVY',
    'IMPATIENT',
    'HATE',
    'SUSPICION',
    'SLOTH'
  ];

  return (
    <>
      <Stack.Screen options={{ title: "Spot Check Inventory" }} />
      <ScreenContainer style={styles.container}>
        <LinearGradient
          colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Are you</Text>
              <Text style={styles.subtitle}>"ON THE BEAM"</Text>
              <View style={styles.cardContainer}>
                <View style={styles.gridContainer}>
                  <View style={styles.columnContainer}>
                    <Text style={styles.columnTitleOn}>ON THE BEAM</Text>
                    <View style={styles.underline} />
                    {onTheBeam.map((item, index) => (
                      <Text key={index} style={[styles.itemText, styles.noWrap]}>{item}</Text>
                    ))}
                  </View>
                  <View style={styles.columnContainer}>
                    <Text style={styles.columnTitleOff}>OFF THE BEAM</Text>
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
    backgroundColor: 'white',
    padding: 20,
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: 'rgba(135, 206, 235, 0.7)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 36,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  columnTitleOff: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  underline: {
    height: 2,
    backgroundColor: '#333',
    marginBottom: 12,
    marginTop: -10,
    width: '80%',
    alignSelf: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
    paddingVertical: 8,
  },
  noWrap: {
    flexShrink: 0,
  },
});

export default Inventory;