import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Heart, Share as ShareIcon, Save, Folder, CheckCircle, Calendar, Trash2, RotateCcw } from 'lucide-react-native';
import AnimatedWeeklyProgressMessage from '@/components/AnimatedWeeklyProgressMessage';
import { LinearGradient } from 'expo-linear-gradient';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';
import SavedGratitudeEntries from '@/components/SavedGratitudeEntries';
import { GratitudeCompleteModal } from '@/components/GratitudeCompleteModal';

// 25 inspirational gratitude quotes for daily rotation
const GRATITUDE_QUOTES = [
  "Taking time each day to acknowledge what we're grateful for strengthens our recovery and brings peace to our hearts.",
  "Gratitude turns what we have into enough, and sobriety gives us the clarity to see it.",
  "Each day of recovery is a gift. Each moment of gratitude is a step forward.",
  "In sobriety, we learn that gratitude isn't about having everything, but appreciating what we do have.",
  "Gratitude is not only the greatest of virtues but the parent of all others. — Cicero",
  "The unthankful heart discovers no mercies; but the thankful heart will find, in every hour, some heavenly blessings to flow upon it. — Henry Ward Beecher",
  "When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in. — Kristin Armstrong",
  "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow. — Melody Beattie",
  "A full and thankful heart cannot entertain great conceits. — As Bill Sees It, p 37",
  "We are grateful for the gifts we have been given, grateful for the people we love, grateful for the mercy of a loving God. — Daily Reflections",
  "Gratitude is the attitude that sets the altitude for living. — AA Slogan",
  "When we are grateful, we are not anxious. When we are anxious, we are not grateful. — Recovery Wisdom",
  "The more you practice gratitude, the more you see how much there is to be grateful for. — Sobriety Insight",
  "Gratitude is the foundation of a happy life and a strong recovery.",
  "Every day in sobriety is a miracle worth celebrating with gratitude.",
  "Gratitude transforms the ordinary into the extraordinary.",
  "In recovery, we discover that gratitude is not just a feeling—it's a practice that changes everything.",
  "The practice of gratitude opens our hearts to the abundance that surrounds us.",
  "Gratitude is the key that unlocks the door to peace and contentment in recovery.",
  "When we count our blessings instead of our problems, we find true happiness.",
  "Gratitude is the bridge between where we were and where we want to be.",
  "In moments of gratitude, we connect with something greater than ourselves.",
  "The habit of gratitude creates a foundation for lasting joy and serenity.",
  "Gratitude is the light that illuminates even the darkest moments of our journey.",
  "Today I choose gratitude over resentment, love over fear, and hope over despair."
];

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

// Function to get daily quote based on day of year
function getDailyQuote(): string {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % GRATITUDE_QUOTES.length;
  return GRATITUDE_QUOTES[index];
}

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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('700', true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.tint,
    marginBottom: 8,
    textAlign: 'center',
  },
  savedMessage: {
    fontSize: 16,
    color: '#28a745',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: adjustFontWeight('600'),
  },
  description: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // Level 3: Content Cards (Medium depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    marginLeft: 8,
  },
  quoteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    // Level 3: Content Cards (Medium depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  quoteText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  weeklyProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: Colors.light.muted,
    marginBottom: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9ecef',
    borderWidth: 2,
    borderColor: 'rgba(108, 117, 125, 0.2)',
  },
  dayCircleCompleted: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  dayCircleToday: {
    borderColor: Colors.light.tint,
    borderWidth: 3,
  },
  dayCircleFuture: {
    backgroundColor: '#e9ecef',
    borderColor: 'rgba(108, 117, 125, 0.2)',
  },
  streakContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  streakText: {
    fontSize: 16,
    color: Colors.light.tint,
    textAlign: 'center',
    fontWeight: adjustFontWeight('600'),
    marginBottom: 4,
  },
  streakMotivation: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gratitudeContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.text,
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
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 40,
    textAlignVertical: 'top',
    // Level 2.1: Interactive Cards (Medium-High depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 7,
    elevation: 5,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  addButtonDisabled: {
    backgroundColor: Colors.light.muted,
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
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  gratitudeItemEditInput: {
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 60,
    textAlignVertical: 'top',
    // No shadows for edit input to avoid "box in box in box" effect
  },
  gratitudeItemText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
    flexShrink: 1,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 32,
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.light.muted,
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  shareButton: {
    flex: 1,
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  shareButtonDisabled: {
    backgroundColor: Colors.light.muted,
    opacity: 0.6,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
    marginHorizontal: 32,
    marginBottom: 16,
    gap: 8,
    height: 48,
  },
  secondaryButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  outlineButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  shareButtonSolid: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonSolidText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  privacyText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    justifyContent: 'space-between',
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
  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedEntries, setShowSavedEntries] = useState(false);
  const [dailyQuote] = useState(() => getDailyQuote());
  const inputRef = useRef<TextInput>(null);
  
  // Always call hooks in the same order
  const gratitudeStore = useGratitudeStore();

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

  // Main form render
  return (
    <ScreenContainer style={styles.container}>
      
      <LinearGradient
        colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gratitude List</Text>
            
            {/* Icon Navigation Row */}
            <View style={styles.iconRow}>
              {/* Save (only show if has content) */}
              {gratitudeItems.length > 0 && (
                <TouchableOpacity 
                  onPress={handleSaveEntry}
                  accessible={true}
                  accessibilityLabel="Save gratitude list"
                  accessibilityRole="button"
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Save color="#007AFF" size={20} />
                </TouchableOpacity>
              )}
              
              {/* Share */}
              <TouchableOpacity 
                onPress={handleShare}
                accessible={true}
                accessibilityLabel="Share gratitude list"
                accessibilityRole="button"
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ShareIcon color="#007AFF" size={20} />
              </TouchableOpacity>
              
              {/* Saved Lists */}
              <TouchableOpacity 
                onPress={() => setShowSavedEntries(true)}
                accessible={true}
                accessibilityLabel="View saved lists"
                accessibilityRole="button"
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Folder color="#007AFF" size={20} />
              </TouchableOpacity>
              
              {/* Reset */}
              <TouchableOpacity 
                onPress={handleReset}
                accessible={true}
                accessibilityLabel="Reset gratitude list"
                accessibilityRole="button"
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <RotateCcw color="#007AFF" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Quote */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              &ldquo;{dailyQuote}&rdquo;
            </Text>
          </View>

          {/* Gratitude Input */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{formatDateDisplay(today)}</Text>
            
            <View style={styles.gratitudeContainer}>
              <Text style={styles.inputLabel}>Today I&apos;m grateful for:</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder={gratitudeItems.length === 0 ? "e.g., My sobriety" : ""}
                  placeholderTextColor={Colors.light.muted}
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
                    !inputValue.trim() && styles.addButtonDisabled
                  ]}
                  onPress={handleAddGratitude}
                  disabled={!inputValue.trim()}
                >
                  <Text style={[
                    styles.addButtonText,
                    !inputValue.trim() && styles.addButtonTextDisabled
                  ]}>Add</Text>
                </TouchableOpacity>
              </View>

              {gratitudeItems.length > 0 && (
                <View style={styles.itemsList}>
                  {gratitudeItems.map((item, index) => (
                    <View key={index} style={styles.gratitudeItem}>
                      <View style={{ flex: 1 }}>
                        {editingIndex === index ? (
                          <TextInput
                            style={styles.gratitudeItemEditInput}
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
                            <Text style={styles.gratitudeItemText}>{item}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteButton}>
                        <Trash2 size={16} color={Colors.light.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Privacy Notice */}
          <Text style={styles.privacyText}>
            Your gratitude lists are saved only on your device. Nothing is uploaded or shared.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      
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