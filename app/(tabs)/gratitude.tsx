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
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { Heart, Share as ShareIcon, Save, Archive, CheckCircle, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';
import SavedGratitudeEntries from '@/components/SavedGratitudeEntries';

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
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  confirmationText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 24,
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
  streakText: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  gratitudeItemText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
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
  privacyText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
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
  const [inputValue, setInputValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedEntries, setShowSavedEntries] = useState(false);
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

    // Save for today's date
    saveDetailedEntry(gratitudeItems);
    
    // Set showConfirmation to true to show the completed screen with saved message
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



  // Show completion state if completed
  if (showConfirmation || isCompleted) {
    return (
      <ScreenContainer style={styles.container}>
        <Stack.Screen options={{ title: 'Daily Gratitude' }} />
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gratitude Complete</Text>
            <Text style={styles.subtitle}>{formatDateDisplay(today)}</Text>
            <Text style={styles.description}>
              Thank you for taking time to reflect on gratitude
            </Text>
            <Text style={styles.savedMessage}>Your gratitude list has been saved</Text>
          </View>

          {/* Confirmation Message */}
          <View style={styles.card}>
            <Text style={styles.confirmationText}>
              Your gratitude practice strengthens your recovery — one day at a time.
            </Text>
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
                      day.isToday && styles.dayCircleToday,
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
            
            <Text style={styles.streakText}>
              {weeklyStreak} {weeklyStreak === 1 ? 'day' : 'days'} this week — keep it going!
            </Text>
          </View>

          {/* Privacy Notice */}
          <Text style={styles.privacyText}>
            Your gratitude lists are saved only on your device. Nothing is uploaded or shared.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.shareButtonSolid} onPress={handleShare}>
              <ShareIcon size={20} color="white" />
              <Text style={styles.shareButtonSolidText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={handleEditGratitude}>
              <Text style={styles.outlineButtonText}>Edit Gratitude List</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <Stack.Screen options={{ title: 'Daily Gratitude' }} />
      
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
            <Text style={styles.title}>Gratitude List</Text>
            <Text style={styles.description}>
              &ldquo;A full and thankful heart cannot entertain great conceits.&rdquo; — As Bill Sees It, p 37
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
                      <Text style={styles.gratitudeItemText}>{item}</Text>
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
          </View>
          
          {/* View Saved Lists Button */}
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setShowSavedEntries(true)}
          >
            <Archive size={20} color={Colors.light.tint} />
            <Text style={styles.secondaryButtonText}>View Saved Lists</Text>
          </TouchableOpacity>

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