import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ScreenContainer from '@/components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';

// Spot check pairs: Look For → Strive For
const spotCheckPairs = [
  { id: 'anger', lookFor: 'Anger', striveFor: 'Self-Control' },
  { id: 'selfPity', lookFor: 'Self-Pity', striveFor: 'Self-Forgiveness' },
  { id: 'selfJustification', lookFor: 'Self-Justification', striveFor: 'Integrity' },
  { id: 'selfImportance', lookFor: 'Self-Importance', striveFor: 'Modesty' },
  { id: 'selfCondemnation', lookFor: 'Self-Condemnation', striveFor: 'Self-Esteem' },
  { id: 'dishonesty', lookFor: 'Dishonesty', striveFor: 'Honesty' },
  { id: 'impatience', lookFor: 'Impatience', striveFor: 'Patience' },
  { id: 'hate', lookFor: 'Hate', striveFor: 'Love' },
  { id: 'resentment', lookFor: 'Resentment', striveFor: 'Forgiveness' },
  { id: 'falsePride', lookFor: 'False Pride', striveFor: 'Humility' },
  { id: 'jealousy', lookFor: 'Jealousy', striveFor: 'Trust' },
  { id: 'envy', lookFor: 'Envy', striveFor: 'Generosity' },
  { id: 'laziness', lookFor: 'Laziness', striveFor: 'Activity' },
  { id: 'procrastination', lookFor: 'Procrastination', striveFor: 'Promptness' },
  { id: 'insincerity', lookFor: 'Insincerity', striveFor: 'Straight Forwardness' },
  { id: 'negativeThinking', lookFor: 'Negative Thinking', striveFor: 'Positive Thinking' },
  { id: 'criticizing', lookFor: 'Criticizing', striveFor: 'Look For The Good' },
  { id: 'fear', lookFor: 'Fear', striveFor: 'Faith' },
];

const Inventory = () => {
  const [selections, setSelections] = useState<{ [key: string]: 'lookFor' | 'striveFor' | null }>({});
  const navigation = useNavigation();

  // Add reset button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleReset}
          style={styles.resetButton}
          accessible={true}
          accessibilityLabel="Reset all selections"
          accessibilityRole="button"
        >
          <RotateCcw size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handlePress = (pairId: string, side: 'lookFor' | 'striveFor') => {
    setSelections(prev => {
      const currentSelection = prev[pairId];
      if (currentSelection === side) {
        // Clicking the same side again - deselect
        return { ...prev, [pairId]: null };
      } else {
        // Select the new side (or switch sides)
        return { ...prev, [pairId]: side };
      }
    });
  };

  const handleReset = () => {
    setSelections({});
  };

  const getTextStyle = (pairId: string, side: 'lookFor' | 'striveFor', baseStyle: any) => {
    const selection = selections[pairId];
    if (selection === side) {
      return [
        baseStyle,
        styles.selectedText,
        side === 'lookFor' ? styles.lookForSelected : styles.striveForSelected
      ];
    }
    return baseStyle;
  };

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
              <Text style={styles.headerLeft}>Look For</Text>
              <Text style={styles.headerRight}>Strive For</Text>
            </View>

            {/* Spot Check Cards */}
            <View style={styles.cardsContainer}>
              {spotCheckPairs.map((pair) => (
                <View key={pair.id} style={[styles.cardWrapper, styles.card]}>
                  <TouchableOpacity 
                    style={styles.textButton}
                    onPress={() => handlePress(pair.id, 'lookFor')}
                    activeOpacity={0.7}
                  >
                    <Text style={getTextStyle(pair.id, 'lookFor', styles.lookForText)}>
                      {pair.lookFor}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.arrow}>→</Text>
                  
                  <TouchableOpacity 
                    style={styles.textButton}
                    onPress={() => handlePress(pair.id, 'striveFor')}
                    activeOpacity={0.7}
                  >
                    <Text style={getTextStyle(pair.id, 'striveFor', styles.striveForText)}>
                      {pair.striveFor}
                    </Text>
                  </TouchableOpacity>
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
  resetButton: {
    paddingRight: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerLeft: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'left',
  },
  headerRight: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'right',
  },
  cardsContainer: {
    gap: 12,
  },
  cardWrapper: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  textButton: {
    flex: 1,
  },
  lookForText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.text,
    textAlign: 'left',
  },
  arrow: {
    fontSize: 18,
    color: Colors.light.text,
    marginHorizontal: 12,
    fontWeight: 'normal',
  },
  striveForText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.text,
    textAlign: 'right',
  },
  selectedText: {
    fontWeight: 'bold',
  },
  lookForSelected: {
    color: '#dc3545',
  },
  striveForSelected: {
    color: '#28a745',
  },
});

export default Inventory;
