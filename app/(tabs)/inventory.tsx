import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
  { id: 'falsePride', lookFor: 'Pride', striveFor: 'Humility' },
  { id: 'jealousy', lookFor: 'Jealousy', striveFor: 'Trust' },
  { id: 'envy', lookFor: 'Envy', striveFor: 'Generosity' },
  { id: 'laziness', lookFor: 'Laziness', striveFor: 'Activity' },
  { id: 'procrastination', lookFor: 'Procrastination', striveFor: 'Promptness' },
  { id: 'insincerity', lookFor: 'Insincerity', striveFor: 'Straight Forwardness' },
  { id: 'negativeThinking', lookFor: 'Negative Thinking', striveFor: 'Positive Thinking' },
  { id: 'criticizing', lookFor: 'Criticizing', striveFor: 'Look For The Good' },
  { id: 'fear', lookFor: 'Fear', striveFor: 'Faith' },
];

type SelectionState = 'none' | 'lookFor' | 'complete';

const SpotCheckPair: React.FC<{
  pair: typeof spotCheckPairs[0];
  state: SelectionState;
  onPressLookFor: () => void;
  onPressStriveFor: () => void;
}> = ({ pair, state, onPressLookFor, onPressStriveFor }) => {
  const arrowScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const striveForScale = useRef(new Animated.Value(1)).current;
  const prevStateRef = useRef<SelectionState>('none');

  React.useEffect(() => {
    // Only animate on state change
    if (prevStateRef.current === state) return;
    const previousState = prevStateRef.current;
    prevStateRef.current = state;

    if (state === 'lookFor') {
      // Pulse arrow when Look For is selected
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowScale, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(arrowScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Same card pop animation as green to draw attention
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (state === 'complete') {
      // Stop all animations when complete
      arrowScale.stopAnimation();
      arrowScale.setValue(1);
      striveForScale.setValue(1);
      cardScale.setValue(1);
    } else {
      arrowScale.stopAnimation();
      arrowScale.setValue(1);
      striveForScale.stopAnimation();
      striveForScale.setValue(1);
      cardScale.setValue(1);
    }
  }, [state]);

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }] }]}>
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.textButton}
          onPress={onPressLookFor}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.lookForText,
            state === 'lookFor' && styles.selectedText,
            state === 'lookFor' && styles.lookForSelected,
          ]}>
            {pair.lookFor}
          </Text>
        </TouchableOpacity>
        
        <Animated.Text style={[
          styles.arrow,
          { transform: [{ scale: arrowScale }] }
        ]}>
          →
        </Animated.Text>
        
        <TouchableOpacity 
          style={styles.textButton}
          onPress={onPressStriveFor}
          activeOpacity={0.7}
        >
          <Animated.Text style={[
            styles.striveForText,
            (state === 'lookFor' || state === 'complete') && styles.selectedText,
            state === 'complete' && styles.striveForSelected,
            { transform: [{ scale: striveForScale }] }
          ]}>
            {pair.striveFor}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const Inventory = () => {
  const [selections, setSelections] = useState<{ [key: string]: SelectionState }>({});
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

  const handlePressLookFor = (pairId: string) => {
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'lookFor' || current === 'complete') {
        // Deselect if already selected
        return { ...prev, [pairId]: 'none' };
      } else {
        // Select Look For - add haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return { ...prev, [pairId]: 'lookFor' };
      }
    });
  };

  const handlePressStriveFor = (pairId: string) => {
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'complete') {
        // Deselect - go back to none (red is cleared)
        return { ...prev, [pairId]: 'none' };
      } else {
        // Complete the pair (reward animation) - this also clears red if it was set
        return { ...prev, [pairId]: 'complete' };
      }
    });
  };

  const handleReset = () => {
    setSelections({});
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
                <SpotCheckPair
                  key={pair.id}
                  pair={pair}
                  state={selections[pair.id] || 'none'}
                  onPressLookFor={() => handlePressLookFor(pair.id)}
                  onPressStriveFor={() => handlePressStriveFor(pair.id)}
                />
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'left',
  },
  headerRight: {
    fontSize: 18,
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
    fontSize: 16,
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
    fontSize: 16,
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
