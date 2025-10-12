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
  Keyboard,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw, Share as ShareIcon, Save as SaveIcon, Clock, Trash2, X, HelpCircle, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';
const INSTRUCTIONS_SHOWN_KEY = 'spot_check_instructions_shown';

// Spot check pairs: Watch For → Strive For
const spotCheckPairs = [
  { id: 'fear', lookFor: 'Fear', striveFor: 'Faith' },
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
];

interface SpotCheckRecord {
  id: string;
  ts: string;
  situation: string;
  selections: { [key: string]: SelectionState };
}

type SelectionState = 'none' | 'lookFor' | 'complete';

// Simple Markdown Text Renderer for bold and italics
const MarkdownText: React.FC<{ children: string; style?: any }> = ({ children, style }) => {
  const parts: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  
  // Parse markdown for **bold** and *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(children)) !== null) {
    // Add regular text before match
    if (match.index > lastIndex) {
      parts.push({ text: children.slice(lastIndex, match.index), bold: false, italic: false });
    }
    
    // Add formatted text
    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      // Bold
      parts.push({ text: matchedText.slice(2, -2), bold: true, italic: false });
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      // Italic
      parts.push({ text: matchedText.slice(1, -1), bold: false, italic: true });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < children.length) {
    parts.push({ text: children.slice(lastIndex), bold: false, italic: false });
  }
  
  // If no markdown found, return plain text
  if (parts.length === 0) {
    return <Text style={style}>{children}</Text>;
  }
  
  return (
    <Text style={style}>
      {parts.map((part, idx) => (
        <Text 
          key={idx} 
          style={[
            part.bold && { fontWeight: 'bold' },
            part.italic && { fontStyle: 'italic' }
          ]}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
};

// Instructions Modal Component
const InstructionsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}> = ({ visible, onClose, isFirstTime = true }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.instructionsOverlay}>
        <TouchableOpacity style={styles.instructionsBackdrop} onPress={onClose} />
        <View style={styles.instructionsModal}>
          <View style={styles.instructionsHeader}>
            <Text style={styles.instructionsTitle}>
              {isFirstTime ? 'Welcome to Spot Check Inventory' : 'How to Use Spot Check Inventory'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.instructionsCloseButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.instructionsContent} showsVerticalScrollIndicator={false}>
            {isFirstTime && (
              <Text style={styles.instructionsIntro}>When you're disturbed or agitated:</Text>
            )}
            
            <View style={styles.instructionStep}>
              <MarkdownText style={styles.instructionText}>
                {isFirstTime 
                  ? '1. **Describe the situation** - What\'s bothering you?'
                  : '1. Describe what\'s disturbing you'}
              </MarkdownText>
            </View>
            
            <View style={styles.instructionStep}>
              <MarkdownText style={styles.instructionText}>
                {isFirstTime
                  ? '2. **Watch for** character defects at play. When you tap defects on the left, they\'ll turn red and highlight what to work toward on the right.'
                  : '2. Tap character defects on the left (red)'}
              </MarkdownText>
            </View>
            
            <View style={styles.instructionStep}>
              <MarkdownText style={styles.instructionText}>
                {isFirstTime
                  ? '3. **Celebrate** your progress. Mark positive traits you maintained (turn green)'
                  : '3. See what to strive for on the right'}
              </MarkdownText>
            </View>
            
            <View style={styles.instructionStep}>
              <MarkdownText style={styles.instructionText}>
                {isFirstTime
                  ? '4. **Save** to track your emotional sobriety'
                  : '4. Mark positives you maintained (green)'}
              </MarkdownText>
            </View>
            
            {!isFirstTime && (
              <View style={styles.instructionStep}>
                <MarkdownText style={styles.instructionText}>
                  5. Save to track your progress
                </MarkdownText>
              </View>
            )}
            
            <View style={styles.instructionsFooter}>
              <MarkdownText style={styles.instructionsFooterText}>
                {isFirstTime
                  ? '*Watch For your defects. Strive For their opposites.*'
                  : 'Watch For → Strive For'}
              </MarkdownText>
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.instructionsButton} onPress={onClose}>
            <Text style={styles.instructionsButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
      // Pulse arrow when Watch For is selected
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.historyContainer}>
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.historyGradient}
        />
        <View style={styles.historyHeader}>
          <TouchableOpacity style={styles.historyCloseButton} onPress={onClose}>
            <X color={Colors.light.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.historyTitle}>Previous Spot Checks</Text>
          <View style={styles.historyPlaceholder} />
        </View>

        <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color={Colors.light.muted} size={48} />
              <Text style={styles.emptyTitle}>No Previous Spot Checks</Text>
              <Text style={styles.emptyDescription}>
                Your saved spot check inventories will appear here.
              </Text>
            </View>
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.historyCard}>
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
                  activeOpacity={0.6}
                >
                  <View style={styles.historyItemContent}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemDate}>{formatTimestamp(record)}</Text>
                      <TouchableOpacity
                        style={styles.historyItemDelete}
                        onPress={() => handleDelete(record.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
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
                          <View style={styles.historyItemTraitsContainer}>
                            <Text style={styles.historyItemTraitsText} numberOfLines={2} ellipsizeMode="tail">
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
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const Inventory = () => {
  const [selections, setSelections] = useState<{ [key: string]: SelectionState }>({});
  const [situation, setSituation] = useState('');
  const [currentRecord, setCurrentRecord] = useState<SpotCheckRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFirstTimeInstructions, setIsFirstTimeInstructions] = useState(true);
  const navigation = useNavigation();

  // Check if instructions have been shown before
  useEffect(() => {
    const checkInstructionsShown = async () => {
      try {
        const shown = await AsyncStorage.getItem(INSTRUCTIONS_SHOWN_KEY);
        if (!shown) {
          setIsFirstTimeInstructions(true);
          setShowInstructions(true);
        }
      } catch (error) {
        console.error('[Inventory] Error checking instructions shown:', error);
      }
    };
    checkInstructionsShown();
  }, []);

  // Handler to close instructions and mark as shown (only for first time)
  const handleCloseInstructions = async () => {
    try {
      if (isFirstTimeInstructions) {
        await AsyncStorage.setItem(INSTRUCTIONS_SHOWN_KEY, 'true');
      }
      setShowInstructions(false);
    } catch (error) {
      console.error('[Inventory] Error saving instructions shown:', error);
      setShowInstructions(false);
    }
  };

  // Function to dismiss keyboard
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Handler to show help instructions
  const handleShowHelp = useCallback(() => {
    dismissKeyboard();
    setIsFirstTimeInstructions(false);
    setShowInstructions(true);
  }, [dismissKeyboard]);

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

  // Define handler functions before useLayoutEffect to avoid stale closures
  const handleSave = useCallback(async () => {
    dismissKeyboard(); // Hide keyboard when saving
    try {
      const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
      const records = stored ? JSON.parse(stored) : [];
      
      // Always create a new record on save
      const newRecord: SpotCheckRecord = {
        id: Date.now().toString(),
        ts: new Date().toISOString(),
        situation,
        selections
      };
      records.unshift(newRecord);
      setCurrentRecord(newRecord);
      
      await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
      setHasUnsavedChanges(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving spot check:', error);
      Alert.alert('Error', 'Failed to save spot check.');
    }
  }, [situation, selections, dismissKeyboard]);

  const handleShare = useCallback(async () => {
    dismissKeyboard(); // Hide keyboard when sharing
    try {
      console.log('[Share] Current selections:', selections);
      console.log('[Share] Current situation:', situation);
      
      const workingOnPairs: string[] = [];
      const positiveTraits: string[] = [];
      
      Object.entries(selections).forEach(([pairId, state]) => {
        const pair = spotCheckPairs.find(p => p.id === pairId);
        if (!pair) return;
        
        if (state === 'lookFor') {
          workingOnPairs.push(`${pair.lookFor} → Working on ${pair.striveFor}`);
        } else if (state === 'complete') {
          positiveTraits.push(pair.striveFor);
        }
      });

      const parts: string[] = [];
      
      if (situation) {
        parts.push('Spot Check Inventory Situation:');
        parts.push(situation);
      } else {
        parts.push('Spot Check Inventory');
      }
      
      if (workingOnPairs.length > 0) {
        parts.push('');
        parts.push('My part:');
        parts.push(...workingOnPairs);
      }
      
      if (positiveTraits.length > 0) {
        parts.push('');
        parts.push('Positive traits:');
        parts.push(positiveTraits.join(', '));
      }

      const shareText = parts.join('\n');

      await ShareModule.share({
        message: shareText,
        title: 'Spot Check Inventory'
      });
    } catch (error) {
      console.error('Error sharing spot check:', error);
    }
  }, [situation, selections, dismissKeyboard]);

  const handleReset = useCallback(() => {
    dismissKeyboard(); // Hide keyboard when resetting
    setSelections({});
    setSituation('');
    setCurrentRecord(null);
    setHasUnsavedChanges(false);
  }, [dismissKeyboard]);

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
            onPress={() => {
              dismissKeyboard(); // Hide keyboard when opening history
              setShowHistory(true);
            }}
            accessible={true}
            accessibilityLabel="View history"
            accessibilityRole="button"
          >
            <Clock color={Colors.light.tint} size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleShowHelp}
            accessible={true}
            accessibilityLabel="Show instructions"
            accessibilityRole="button"
          >
            <HelpCircle size={20} color={Colors.light.tint} />
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
  }, [navigation, hasUnsavedChanges, hasContent, handleSave, handleShare, handleReset, handleShowHelp, dismissKeyboard]);

  const handlePressLookFor = (pairId: string) => {
    dismissKeyboard(); // Hide keyboard when selecting traits
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'lookFor') {
        // Deselect if Watch For is already selected
        setHasUnsavedChanges(true);
        return { ...prev, [pairId]: 'none' };
      } else {
        // Select Watch For (whether from 'none' or 'complete') - add haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHasUnsavedChanges(true);
        return { ...prev, [pairId]: 'lookFor' };
      }
    });
  };

  const handlePressStriveFor = (pairId: string) => {
    dismissKeyboard(); // Hide keyboard when selecting traits
    setSelections(prev => {
      const current = prev[pairId] || 'none';
      if (current === 'complete') {
        // Deselect if Strive For is already selected
        setHasUnsavedChanges(true);
        return { ...prev, [pairId]: 'none' };
      } else {
        // Complete the pair (reward animation) - this also clears red if it was set
        setHasUnsavedChanges(true);
        return { ...prev, [pairId]: 'complete' };
      }
    });
  };

  const handleSituationChange = (text: string) => {
    setSituation(text);
    setHasUnsavedChanges(true);
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
                onChangeText={handleSituationChange}
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
              <Text style={styles.headerLeft}>Watch For</Text>
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
      
      <InstructionsModal
        visible={showInstructions}
        onClose={handleCloseInstructions}
        isFirstTime={isFirstTimeInstructions}
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
  historyContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  historyGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  historyCloseButton: {
    padding: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
  },
  historyPlaceholder: {
    width: 40,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    padding: 16,
    paddingTop: 16,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  historyItemTouchable: {
    flex: 1,
  },
  historyItemContent: {
    flex: 1,
    padding: 16,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemDelete: {
    padding: 4,
  },
  historyItemDate: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    flex: 1,
  },
  historyItemSituation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  historyItemTraitsContainer: {
    marginTop: 2,
  },
  historyItemTraitsText: {
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Instructions Modal Styles
  instructionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionsModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    flex: 1,
    paddingRight: 10,
  },
  instructionsCloseButton: {
    padding: 4,
  },
  instructionsContent: {
    padding: 20,
    paddingTop: 16,
  },
  instructionsIntro: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.light.text,
    marginBottom: 16,
  },
  instructionStep: {
    marginBottom: 14,
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.text,
  },
  instructionsFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  instructionsFooterText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.tint,
    textAlign: 'center',
  },
  instructionsButton: {
    backgroundColor: Colors.light.tint,
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Inventory;
