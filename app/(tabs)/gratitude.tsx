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
import { Heart, Share as ShareIcon, Save, Archive, CheckCircle, Calendar, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';
import SavedGratitudeEntries from '@/components/SavedGratitudeEntries';

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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    // Level 3: Content Cards (Medium depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    // Level 3: Content Cards (Medium depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  toastModal: {
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 280,
  },
  toastIconContainer: {
    marginBottom: 12,
  },
  toastTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: adjustFontWeight('700'),
    textAlign: 'center',
    marginBottom: 8,
  },
  toastMessage: {
    color: 'white',
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  toastButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  toastCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toastCancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
  },
  toastOkButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  toastOkText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
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
  const [showToast, setShowToast] = useState(false);
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
    
    // Set showConfirmation to true to show the completed screen with saved message
    setShowConfirmation(true);
    
    // Show toast on completion screen
    setShowToast(true);
  };

  const canSave = () => {
    return gratitudeItems.length > 0;
  };


  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddGratitude();
    }
  };



  // Show completion state if completed
  if (showConfirmation || isCompleted) {
    return (
      <ScreenContainer style={styles.container}>
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <CheckCircle color={Colors.light.tint} size={32} />
            <Text style={styles.title}>Gratitude Complete</Text>
            <Text style={styles.subtitle}>{formatDateDisplay(today)}</Text>
          </View>



          {/* Weekly Progress */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar color={Colors.light.tint} size={20} />
              <Text style={styles.cardTitle}>This Week&apos;s Progress</Text>
            </View>
            
            <View style={styles.weeklyProgress}>
              {weeklyProgress.map((day, index) => {
                console.log('Rendering day:', day.date, 'completed:', day.completed, 'isToday:', day.isToday, 'isFuture:', day.isFuture);
                
                return (
                  <View key={index} style={styles.dayContainer}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <View style={[
                      styles.dayCircle,
                      day.completed && !day.isFuture && styles.dayCircleCompleted,
                      day.isToday && !day.completed && styles.dayCircleToday,
                      day.isFuture && styles.dayCircleFuture
                    ]}>
                      {day.completed && !day.isFuture && (
                        <CheckCircle color="white" size={16} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.streakContainer}>
              <Text style={styles.streakText}>
                {weeklyStreak} {weeklyStreak === 1 ? 'day' : 'days'} this week
              </Text>
              <Text style={styles.streakMotivation}>
                {weeklyStreak >= 7 ? 'Perfect week! 🎉' : 
                 weeklyStreak >= 5 ? 'Amazing progress! 🌟' :
                 weeklyStreak >= 3 ? 'Great job! 💪' :
                 weeklyStreak >= 1 ? '✨ Keep it going! ✨' :
                 'Start your streak today! 🌱'}
              </Text>
            </View>
          </View>

          {/* Privacy Notice */}
          <Text style={styles.privacyText}>
            Your gratitude lists are saved only on your device. Nothing is uploaded or shared.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleEditGratitude}>
              <Text style={styles.primaryButtonText} numberOfLines={1}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setShowSavedEntries(true)}
            >
              <Text style={styles.primaryButtonText} numberOfLines={1}>Saved Lists</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <SavedGratitudeEntries 
          visible={showSavedEntries}
          onClose={() => setShowSavedEntries(false)}
        />
        
        {/* Success Toast Modal */}
        {showToast && (
          <View style={styles.toastOverlay}>
            <View style={styles.toastModal}>
              <View style={styles.toastIconContainer}>
                <CheckCircle size={32} color="white" />
              </View>
              <Text style={styles.toastTitle}>Gratitude Saved!</Text>
              <Text style={styles.toastMessage}>
                {getMilestoneToastMessage(getConsecutiveDays(gratitudeStore?.savedEntries || []))}
              </Text>
              <View style={styles.toastButtons}>
                <TouchableOpacity 
                  style={styles.toastCancelButton}
                  onPress={() => {
                    setShowToast(false);
                    handleEditGratitude();
                  }}
                >
                  <Text style={styles.toastCancelText}>Back to Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toastOkButton}
                  onPress={() => setShowToast(false)}
                >
                  <Text style={styles.toastOkText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

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
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Heart color={Colors.light.tint} size={32} />
            <Text style={styles.title}>Gratitude List</Text>
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
                  placeholder="e.g., My sobriety"
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
                            blurOnSubmit
                            onSubmitEditing={commitEdit}
                            onBlur={commitEdit}
                            returnKeyType="done"
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.saveButton,
                !canSave() && styles.saveButtonDisabled
              ]} 
              onPress={handleSaveEntry}
              disabled={!canSave()}
            >
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.shareButton,
                !canSave() && styles.shareButtonDisabled
              ]}
              onPress={handleShare}
              disabled={!canSave()}
            >
              <ShareIcon size={20} color="white" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
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
    </ScreenContainer>
  );
}