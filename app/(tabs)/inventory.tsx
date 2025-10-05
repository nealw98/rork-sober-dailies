import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  TextInput,
  Alert,
  Share as ShareModule,
  Platform,
  Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw, Share as ShareIcon, Save as SaveIcon, Clock, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import ScreenContainer from '@/components/ScreenContainer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';

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

interface SpotCheckRecord {
  id: string;
  ts: string;
  situation: string;
  selections: { [key: string]: SelectionState };
}

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
    <Animated.View style={[
      styles.cardWrapperLevel2, 
      { 
        transform: [{ scale: cardScale }],
        backgroundColor: '#fff' // Always pure white (awake state)
      }
    ]}>
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

const SpotCheckHistorySheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectRecord: (record: SpotCheckRecord) => void;
  hasUnsavedChanges: boolean;
  handleSave: () => Promise<void>;
}> = ({ visible, onClose, onSelectRecord, hasUnsavedChanges, handleSave }) => {
  const [records, setRecords] = useState<SpotCheckRecord[]>([]);

  useEffect(() => {
    if (visible) {
      loadRecords();
    }
  }, [visible]);

  const loadRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
      if (stored) {
        const parsedRecords = JSON.parse(stored);
        const sortedRecords = parsedRecords.sort((a: SpotCheckRecord, b: SpotCheckRecord) => {
          const aTime = new Date(a.ts || 0).getTime();
          const bTime = new Date(b.ts || 0).getTime();
          return bTime - aTime;
        });
        setRecords(sortedRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('[History] Error loading records:', error);
      setRecords([]);
    }
  };

  const formatTimestamp = (record: SpotCheckRecord) => {
    if (!record.ts) return 'Unknown date';
    const date = new Date(record.ts);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSelectionCount = (record: SpotCheckRecord) => {
    return Object.values(record.selections || {}).filter(s => s !== 'none').length;
  };

  const getSelectedTraits = (record: SpotCheckRecord) => {
    const lookForTraits: string[] = [];
    const completeTraits: string[] = [];
    
    Object.entries(record.selections || {}).forEach(([pairId, state]) => {
      const pair = spotCheckPairs.find(p => p.id === pairId);
      if (pair) {
        if (state === 'lookFor') {
          lookForTraits.push(pair.lookFor);
        } else if (state === 'complete') {
          completeTraits.push(pair.striveFor);
        }
      }
    });
    
    return { lookForTraits, completeTraits };
  };

  const handleDelete = async (recordId: string) => {
    try {
      const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
      if (stored) {
        const parsedRecords = JSON.parse(stored);
        const updatedRecords = parsedRecords.filter((r: SpotCheckRecord) => r.id !== recordId);
        await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updatedRecords));
        setRecords(updatedRecords);
      }
    } catch (error) {
      console.error('[History] Error deleting record:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.historyOverlay}>
      <TouchableOpacity style={styles.historyBackdrop} onPress={onClose} />
      <View style={styles.historySheet}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Previous Spot Checks</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.historyClose}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.historyList}>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No previous inventories yet.</Text>
            </View>
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <TouchableOpacity
                  style={styles.historyItemTouchable}
                  onPress={() => {
                    // Check for unsaved changes before loading new record
                    if (hasUnsavedChanges) {
                      Alert.alert(
                        'Unsaved Changes',
                        'Save your current spot check before loading a different one?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Discard', style: 'destructive', onPress: () => {
                            onSelectRecord(record);
                            onClose();
                          }},
                          { text: 'Save First', onPress: async () => {
                            await handleSave();
                            onSelectRecord(record);
                            onClose();
                          }}
                        ]
                      );
                    } else {
                      onSelectRecord(record);
                      onClose();
                    }
                  }}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemDate}>{formatTimestamp(record)}</Text>
                    {record.situation && (
                      <Text style={styles.historyItemSituation} numberOfLines={2}>
                        {record.situation}
                      </Text>
                    )}
                    {(() => {
                      const { lookForTraits, completeTraits } = getSelectedTraits(record);
                      const allTraits = [...lookForTraits, ...completeTraits];
                      if (allTraits.length > 0) {
                        return (
                          <Text style={styles.historyItemTraits} numberOfLines={2} ellipsizeMode="tail">
                            {lookForTraits.map((trait, idx) => (
                              <Text key={`lookFor-${idx}`} style={styles.historyItemTraitRed}>
                                {trait}
                                {idx < lookForTraits.length - 1 || completeTraits.length > 0 ? ', ' : ''}
                              </Text>
                            ))}
                            {completeTraits.map((trait, idx) => (
                              <Text key={`complete-${idx}`} style={styles.historyItemTraitGreen}>
                                {trait}
                                {idx < completeTraits.length - 1 ? ', ' : ''}
                              </Text>
                            ))}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyItemDelete}
                  onPress={() => handleDelete(record.id)}
                >
                  <Trash2 size={20} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const Inventory = () => {
  const [selections, setSelections] = useState<{ [key: string]: SelectionState }>({});
  const [situation, setSituation] = useState('');
  const [currentRecord, setCurrentRecord] = useState<SpotCheckRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigation = useNavigation();

  // Function to dismiss keyboard
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const formatSavedTimestamp = () => {
    if (!currentRecord) return '';
    const timestamp = currentRecord.ts;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Check if form has any content
  const hasContent = situation.trim() !== '' || Object.values(selections).some(s => s !== 'none');

  // Add header icons (Save, Share, History, Reset)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16, paddingRight: 16 }}>
          {hasContent && (
            <TouchableOpacity 
              onPress={handleSave}
              accessible={true}
              accessibilityLabel="Save spot check"
              accessibilityRole="button"
            >
              <SaveIcon color={Colors.light.tint} size={20} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleShare}
            accessible={true}
            accessibilityLabel="Share spot check"
            accessibilityRole="button"
          >
            <ShareIcon color={Colors.light.tint} size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowHistory(true)}
            accessible={true}
            accessibilityLabel="View history"
            accessibilityRole="button"
          >
            <Clock color={Colors.light.tint} size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleReset}
            accessible={true}
            accessibilityLabel="Reset all selections"
            accessibilityRole="button"
          >
            <RotateCcw size={20} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, hasUnsavedChanges, hasContent]);

  const handlePressLookFor = (pairId: string) => {
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'lookFor') {
        // Deselect if Look For is already selected
        return { ...prev, [pairId]: 'none' };
      } else {
        // Select Look For (whether from 'none' or 'complete') - add haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return { ...prev, [pairId]: 'lookFor' };
      }
    });
  };

  const handlePressStriveFor = (pairId: string) => {
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'complete') {
        // Deselect if Strive For is already selected
        return { ...prev, [pairId]: 'none' };
      } else {
        // Complete the pair (reward animation) - this also clears red if it was set
        return { ...prev, [pairId]: 'complete' };
      }
    });
  };

  const handleReset = () => {
    setSelections({});
    setSituation('');
    setCurrentRecord(null);
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    try {
      const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
      const records = stored ? JSON.parse(stored) : [];
      
      // If editing an existing record, update it; otherwise create new
      if (currentRecord && currentRecord.id) {
        // Update existing record
        const recordIndex = records.findIndex((r: SpotCheckRecord) => r.id === currentRecord.id);
        const updatedRecord: SpotCheckRecord = {
          ...currentRecord,
          ts: new Date().toISOString(), // Update timestamp
          situation,
          selections
        };
        
        if (recordIndex !== -1) {
          records[recordIndex] = updatedRecord;
        } else {
          // If not found (shouldn't happen), add as new
          records.unshift(updatedRecord);
        }
        
        setCurrentRecord(updatedRecord);
      } else {
        // Create new record
        const newRecord: SpotCheckRecord = {
          id: Date.now().toString(),
          ts: new Date().toISOString(),
          situation,
          selections
        };
        records.unshift(newRecord);
        setCurrentRecord(newRecord);
      }
      
      await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
      setHasUnsavedChanges(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving spot check:', error);
      Alert.alert('Error', 'Failed to save spot check.');
    }
  };

  const handleShare = async () => {
    try {
      const selectedPairs = Object.entries(selections)
        .filter(([_, state]) => state !== 'none')
        .map(([pairId, state]) => {
          const pair = spotCheckPairs.find(p => p.id === pairId);
          if (!pair) return '';
          
          if (state === 'lookFor') {
            return `${pair.lookFor} → (in progress)`;
          } else if (state === 'complete') {
            return `${pair.lookFor} → ${pair.striveFor}`;
          }
          return '';
        })
        .filter(Boolean);

      const shareText = [
        'Spot Check Inventory Results',
        '',
        situation ? `Situation: ${situation}` : '',
        '',
        'Character Traits:',
        ...selectedPairs,
        '',
        'Generated by Sober Dailies'
      ].filter(Boolean).join('\n');

      await ShareModule.share({
        message: shareText,
        title: 'Spot Check Inventory'
      });
    } catch (error) {
      console.error('Error sharing spot check:', error);
    }
  };

  const handleSelectRecord = (record: SpotCheckRecord) => {
    setSituation(record.situation || '');
    setSelections(record.selections || {});
    setCurrentRecord(record);
    setHasUnsavedChanges(false);
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
            
            {/* Saved Timestamp - always reserve space */}
            <Text style={styles.savedTimestamp}>
              {currentRecord ? `Saved: ${formatSavedTimestamp()}` : ' '}
            </Text>
            
            {/* Situation Input */}
            <View style={styles.situationContainer}>
              <Text style={styles.situationLabel}>What's disturbing you?</Text>
              <TextInput
                style={styles.situationInput}
                value={situation}
                onChangeText={setSituation}
                placeholder="Describe the situation"
                placeholderTextColor={Colors.light.muted}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
                blurOnSubmit={true}
              />
            </View>
            
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
      
      <SpotCheckHistorySheet
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectRecord={handleSelectRecord}
        hasUnsavedChanges={hasUnsavedChanges}
        handleSave={handleSave}
      />
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
    marginBottom: 16,
  },
  savedTimestamp: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  situationContainer: {
    marginBottom: 28,
  },
  situationLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  situationInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 80,
    textAlignVertical: 'top',
    // Level 2: Interactive Cards (High depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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
  cardWrapperSelected: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  cardWrapperLevel2: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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
  historyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  historyBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  historySheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  historyClose: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemTouchable: {
    flex: 1,
    padding: 16,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemDelete: {
    padding: 16,
    paddingLeft: 8,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  historyItemSituation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  historyItemTraits: {
    fontSize: 13,
    lineHeight: 18,
  },
  historyItemTraitRed: {
    fontSize: 13,
    color: '#dc3545',
    fontWeight: '500',
  },
  historyItemTraitGreen: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
});

export default Inventory;
