import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  Share,
  ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, Share as ShareIcon, Save, List, CheckCircle, Calendar, Trash2, RotateCcw, ChevronLeft } from 'lucide-react-native';
import AnimatedWeeklyProgressMessage from '@/components/AnimatedWeeklyProgressMessage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';
import SavedGratitudeEntries from '@/components/SavedGratitudeEntries';
import { GratitudeCompleteModal } from '@/components/GratitudeCompleteModal';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useGratitudeQuote } from '@/hooks/useGratitudeQuote';

// 25 daily-changing toast confirmation messages
const TOAST_MESSAGES = [
  "Gratitude saved! Your recovery journey continues. 💚",
  "Thankful thoughts recorded! Keep building that foundation. 🌱",
  "Gratitude captured! Every entry strengthens your path. ✨",
  "Saved with gratitude! Your heart grows stronger each day. 💪",
  "Grateful moment preserved! Recovery is built one day at a time. 🌟",
  "Thankfulness recorded! You're building something beautiful. 🎯",
  "Gratitude saved! Each entry is a step toward peace. 🕊️",
  "Captured with appreciation! Your journey inspires. 🌈",
  "Saved with thanks! Recovery grows through daily practice. 🌿",
  "Gratitude recorded! You're creating positive change. ⭐",
  "Thankful entry saved! Keep nurturing your recovery. 🌺",
  "Gratitude captured! Every moment of thanks matters. 💫",
  "Saved with appreciation! Your dedication shows. 🎉",
  "Grateful thoughts recorded! Recovery is a daily choice. 🌅",
  "Thankfulness saved! You're building a life of meaning. 🏗️",
  "Gratitude preserved! Each entry strengthens your foundation. 🧱",
  "Captured with thanks! Your recovery journey continues. 🛤️",
  "Saved with gratitude! Peace comes from daily practice. ☮️",
  "Thankful moment recorded! You're creating positive energy. ⚡",
  "Gratitude saved! Every entry builds your resilience. 🛡️",
  "Captured with appreciation! Recovery is about progress. 📈",
  "Saved with thanks! Your gratitude practice inspires. 💡",
  "Grateful entry recorded! Each day brings new opportunities. 🌅",
  "Thankfulness saved! You're building something lasting. 🏛️",
  "Gratitude captured! Recovery is a beautiful journey. 🌸",
];

// Function to calculate consecutive days of gratitude practice
function getConsecutiveDays(entries: any[]): number {
  if (!entries || entries.length === 0) return 0;
  
  // Sort entries by date (newest first)
  const sortedEntries = entries
    .filter(entry => entry.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let consecutiveDays = 0;
  const today = new Date();
  
  for (let i = 0; i < sortedEntries.length; i++) {
    const entryDate = new Date(sortedEntries[i].date);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    // Check if dates match (ignoring time)
    if (entryDate.toDateString() === expectedDate.toDateString()) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
}

// Function to get milestone-based toast message
function getMilestoneToastMessage(consecutiveDays: number): string {
  const baseMessage = "Your gratitude list has been recorded! Keep up the great work!";
  
  // Special milestone messages
  if (consecutiveDays === 100) {
    return `${baseMessage} 💯 100 days in a row!`;
  } else if (consecutiveDays === 90) {
    return `${baseMessage} 🚀 90 days in a row!`;
  } else if (consecutiveDays === 60) {
    return `${baseMessage} 🔥 60 days in a row!`;
  } else if (consecutiveDays === 50) {
    return `${baseMessage} 🎯 50 days in a row!`;
  } else if (consecutiveDays === 30) {
    return `${baseMessage} 🏆 30 days in a row!`;
  } else if (consecutiveDays >= 31) {
    // Acknowledge every day after 30
    return `${baseMessage} 🔥 ${consecutiveDays} days in a row!`;
  } else if (consecutiveDays >= 21) {
    return `${baseMessage} 🌟 21 days in a row!`;
  } else if (consecutiveDays >= 15) {
    return `${baseMessage} 💪 15 days in a row!`;
  } else if (consecutiveDays >= 7) {
    return `${baseMessage} ✨ 7 days in a row!`;
  } else if (consecutiveDays >= 3) {
    return `${baseMessage} 🌱 3 days in a row!`;
  } else {
    return baseMessage;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3D8B8B',
    fontWeight: '500',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  quoteTile: {
    backgroundColor: 'rgba(61, 139, 139, 0.25)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 28,
  },
  quoteText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#000',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#000',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
  },
  addButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  itemsList: {
    marginBottom: 16,
  },
  gratitudeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  gratitudeItemEditInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#000',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  gratitudeItemText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    flexShrink: 1,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});

const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function GratitudeListScreen() {
  const posthog = usePostHog();
  const { palette } = useTheme();
  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedEntries, setShowSavedEntries] = useState(false);
  const { formattedQuote, isLoading: isQuoteLoading } = useGratitudeQuote();
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  const insets = useSafeAreaInsets();
  
  // Track screen time
  useScreenTimeTracking('Gratitude List');
  
  // Always call hooks in the same order
  const gratitudeStore = useGratitudeStore();
  const { fontSize, lineHeight } = useTextSettings();

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Gratitude List');
    }, [posthog])
  );

  // Add safety check to prevent destructuring undefined
  if (!gratitudeStore) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.content}>
          <Text>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }
  
  const {
    isCompletedToday,
    getTodaysItems,
    addItemsToToday,
    updateItemsForToday,
    deleteItemForToday,
    completeToday,
    uncompleteToday,
    getWeeklyProgress,
    getWeeklyStreak,
    saveDetailedEntry,
    getSavedEntry
  } = gratitudeStore;
  
  const getTodayDateString = () => {
    const today = new Date();
    // Ensure we're working in local timezone
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log('gratitude getTodayDateString:', dateString, 'timezone offset:', today.getTimezoneOffset());
    return dateString;
  };
  
  const today = new Date();
  const isCompleted = isCompletedToday();
  const weeklyProgress = getWeeklyProgress();
  const weeklyStreak = getWeeklyStreak();

  useEffect(() => {
    const todaysItems = getTodaysItems();
    setGratitudeItems(todaysItems);
  }, [getTodaysItems]);

  const handleReset = () => {
    if (gratitudeItems.length === 0 && inputValue.trim() === '') return;
    
    // Check if there are unsaved changes by comparing current items with saved entry
    const todayString = getTodayDateString();
    const savedEntry = getSavedEntry(todayString);
    const savedItems = savedEntry?.items || [];
    
    // Determine if there are unsaved changes:
    // - Items in UI differ from saved items
    // - Or there's text in the input field
    const hasUnsavedChanges = 
      inputValue.trim() !== '' ||
      gratitudeItems.length !== savedItems.length ||
      gratitudeItems.some((item, index) => item !== savedItems[index]);
    
    console.log('[Gratitude] handleReset - hasUnsavedChanges:', hasUnsavedChanges, 'gratitudeItems:', gratitudeItems.length, 'savedItems:', savedItems.length);
    
    // Only show warning if there are unsaved changes
    if (hasUnsavedChanges) {
      Alert.alert(
        'Reset Gratitude List',
        'You have unsaved changes. Are you sure you want to clear your current gratitude list?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              // Clear UI state
              setGratitudeItems([]);
              setInputValue('');
              setEditingIndex(null);
              setEditingValue('');
              // Clear storage - this actually removes the items
              updateItemsForToday([]);
            }
          }
        ]
      );
    } else {
      // No unsaved changes, just reset without warning
      console.log('[Gratitude] Resetting without alert - no unsaved changes');
      // Clear UI state
      setGratitudeItems([]);
      setInputValue('');
      setEditingIndex(null);
      setEditingValue('');
      // Clear storage - this actually removes the items
      updateItemsForToday([]);
    }
  };

  const handleAddGratitude = () => {
    if (inputValue.trim()) {
      const newItems = [...gratitudeItems, inputValue.trim()];
      setGratitudeItems(newItems);
      addItemsToToday([inputValue.trim()]);
      posthog?.capture('gratitude_item_added', { 
        $screen_name: 'Gratitude List',
        item_count: newItems.length 
      });
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const beginEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(gratitudeItems[index]);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    const value = editingValue.trim();
    let updated = [...gratitudeItems];
    if (value.length === 0) {
      // Treat empty as delete
      updated.splice(editingIndex, 1);
      deleteItemForToday(editingIndex);
    } else {
      updated[editingIndex] = value;
      updateItemsForToday(updated);
    }
    setGratitudeItems(updated);
    setEditingIndex(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDelete = (index: number) => {
    const updated = gratitudeItems.filter((_, i) => i !== index);
    setGratitudeItems(updated);
    deleteItemForToday(index);
  };

  const handleStartNew = () => {
    setGratitudeItems([]);
    setInputValue('');
    setShowConfirmation(false);
    setShouldTriggerReviewOnDismiss(false);
  };

  const handleEditGratitude = () => {
    // Load saved data back into form if it exists
    const todayString = getTodayDateString();
    const savedEntry = getSavedEntry(todayString);
    
    if (savedEntry) {
      setGratitudeItems(savedEntry.items);
    }
    
    // Uncomplete today to show the form
    uncompleteToday();
    setShowConfirmation(false);
  };




  const handleShare = async () => {
    console.log('=== SHARE BUTTON PRESSED ===');
    console.log('Share button pressed, items:', gratitudeItems.length);
    console.log('Platform:', Platform.OS);
    
    if (gratitudeItems.length === 0) {
      console.log('No items to share, showing alert');
      Alert.alert(
        'Share Gratitude List',
        'Please add at least one gratitude item before sharing.',
        [{ text: 'OK' }]
      );
      return;
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const gratitudeText = gratitudeItems.join('\n');
    const shareMessage = `Today I'm grateful for:\n${gratitudeText}`;
    
    console.log('Share message prepared:', shareMessage.substring(0, 100) + '...');

    try {
      console.log('Attempting to share on platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        console.log('Web platform detected, using clipboard');
        // For web, copy to clipboard since Share API doesn't work reliably in web preview
        try {
          await Clipboard.setStringAsync(shareMessage);
          console.log('Clipboard write successful');
          Alert.alert(
            'Copied to Clipboard',
            'Your gratitude list has been copied to the clipboard. You can now paste it in any messaging app or text field.',
            [{ text: 'OK' }]
          );
        } catch (clipboardError) {
          console.error('Clipboard failed on web:', clipboardError);
          // Fallback for web - show the text in an alert so user can copy manually
          Alert.alert(
            'Share Gratitude List',
            shareMessage,
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('Mobile platform detected, using native Share API');
        // For mobile, use native Share API
        const result = await Share.share({
          message: shareMessage,
          title: `Gratitude List - ${today}`
        });
        console.log('Share result:', result);
      }
    } catch (error) {
      console.error('Error sharing gratitude list:', error);
      
      // Universal fallback - show the text in an alert
      Alert.alert(
        'Share Gratitude List',
        shareMessage,
        [{ text: 'OK' }]
      );
    }
    console.log('=== SHARE FUNCTION COMPLETE ===');
  };

  const handleSaveEntry = () => {
    if (gratitudeItems.length === 0) {
      Alert.alert(
        'Save Gratitude List',
        'Please add at least one gratitude item before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Haptic feedback for success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save for today's date and mark as completed
    saveDetailedEntry(gratitudeItems);
    completeToday(gratitudeItems);
    
    posthog?.capture('gratitude_list_completed', { 
      $screen_name: 'Gratitude List',
      item_count: gratitudeItems.length 
    });
    
    // Show completion modal
    setShowConfirmation(true);
  };

  const canSave = () => {
    return gratitudeItems.length > 0;
  };


  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddGratitude();
    }
  };

  const handleViewSavedLists = () => {
    setShowConfirmation(false);
    setShowSavedEntries(true);
  };

  // For input boxes in Deep Sea, use tint (Blue Slate) as background
  const inputBackground = palette.sponsorSelection ? palette.tint : palette.cardBackground;
  
  // Main form render
  return (
    <ScreenContainer style={[styles.container, { backgroundColor: palette.background }]} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={palette.gradients.header as [string, string, ...string[]]}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top row with back button */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={[styles.headerTitle, { color: palette.headerText }]}>Gratitude List</Text>
      </LinearGradient>
      
      {/* Action Row - Below header */}
      <View style={[styles.actionRow, { borderBottomColor: palette.divider, backgroundColor: palette.background }]}>
        <TouchableOpacity 
          onPress={() => setShowSavedEntries(true)}
          accessible={true}
          accessibilityLabel="View saved lists"
          accessibilityRole="button"
          activeOpacity={0.6}
          style={styles.actionButton}
        >
          <List color={palette.tint} size={18} />
          <Text style={[styles.actionButtonText, { color: palette.tint }]}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleSaveEntry}
          accessible={true}
          accessibilityLabel="Save gratitude list"
          accessibilityRole="button"
          activeOpacity={0.6}
          style={styles.actionButton}
        >
          <Save color={palette.tint} size={18} />
          <Text style={[styles.actionButtonText, { color: palette.tint }]}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleShare}
          accessible={true}
          accessibilityLabel="Share gratitude list"
          accessibilityRole="button"
          activeOpacity={0.6}
          style={styles.actionButton}
        >
          <ShareIcon color={palette.tint} size={18} />
          <Text style={[styles.actionButtonText, { color: palette.tint }]}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleReset}
          accessible={true}
          accessibilityLabel="Reset gratitude list"
          accessibilityRole="button"
          activeOpacity={0.6}
          style={styles.actionButton}
        >
          <RotateCcw color={palette.tint} size={18} />
          <Text style={[styles.actionButtonText, { color: palette.tint }]}>Reset</Text>
        </TouchableOpacity>
      </View>
      
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Date */}
          <Text style={[styles.dateText, { color: palette.text }]}>{formatDateDisplay(today)}</Text>

          {/* Daily Quote */}
          {!isQuoteLoading && formattedQuote && (
            <View style={[styles.quoteTile, { backgroundColor: `${palette.tint}40` }]}>
              <Text style={[styles.quoteText, { fontSize, lineHeight, color: palette.text }]}>
                &ldquo;{formattedQuote}&rdquo;
              </Text>
            </View>
          )}
          
          {/* Gratitude Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { fontSize, color: palette.text }]}>Today I'm grateful for:</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.textInput, { fontSize, backgroundColor: inputBackground, color: palette.text, borderColor: palette.border }]}
                placeholder={gratitudeItems.length === 0 ? "e.g., My sobriety" : ""}
                placeholderTextColor={palette.sponsorSelection ? palette.text : palette.muted}
                value={inputValue}
                onChangeText={setInputValue}
                onKeyPress={handleKeyPress}
                onSubmitEditing={handleAddGratitude}
                returnKeyType="done"
                multiline
                blurOnSubmit={true}
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: inputValue.trim() ? palette.tint : palette.muted },
                  !inputValue.trim() && { opacity: 0.6 }
                ]}
                onPress={handleAddGratitude}
                disabled={!inputValue.trim()}
              >
                <Text style={[
                  styles.addButtonText,
                  { color: palette.headerText },
                  !inputValue.trim() && { opacity: 0.7 }
                ]}>Add</Text>
              </TouchableOpacity>
            </View>

            {gratitudeItems.length > 0 && (
              <View style={styles.itemsList}>
                {gratitudeItems.map((item, index) => (
                  <View key={index} style={[styles.gratitudeItem, { borderBottomColor: palette.divider }]}>
                    <View style={{ flex: 1 }}>
                      {editingIndex === index ? (
                        <TextInput
                          style={[styles.gratitudeItemEditInput, { fontSize, backgroundColor: inputBackground, color: palette.text, borderColor: palette.border }]}
                          value={editingValue}
                          onChangeText={setEditingValue}
                          autoFocus
                          blurOnSubmit={true}
                          returnKeyType="done"
                          onSubmitEditing={commitEdit}
                          onBlur={commitEdit}
                          multiline
                          textAlignVertical="top"
                        />
                      ) : (
                        <TouchableOpacity onPress={() => beginEdit(index)} activeOpacity={0.7}>
                          <Text style={[styles.gratitudeItemText, { fontSize, lineHeight, color: palette.text }]}>{item}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteButton}>
                      <Trash2 size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Privacy Notice */}
          <Text style={[styles.privacyText, { color: palette.muted }]}>
            Your gratitude lists are saved only on your device. Nothing is uploaded or shared.
          </Text>
        </ScrollView>
      
      <SavedGratitudeEntries 
        visible={showSavedEntries}
        onClose={() => setShowSavedEntries(false)}
      />

      {/* Completion Modal */}
      <GratitudeCompleteModal
        visible={showConfirmation || isCompleted}
        onClose={handleEditGratitude}
      />
    </ScreenContainer>
  );
}