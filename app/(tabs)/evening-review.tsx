import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Share,
  KeyboardAvoidingView,
  Animated,
  Pressable,
  Easing
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import ScreenContainer from "@/components/ScreenContainer";
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Circle, Calendar, Share as ShareIcon, Save, Folder, RotateCcw, Check } from 'lucide-react-native';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import SavedEveningReviews from '@/components/SavedEveningReviews';
import AnimatedEveningReviewMessage from '@/components/AnimatedEveningReviewMessage';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

// Animated Checkbox Component
const AnimatedCheckbox = ({ checked, onPress, children }: { 
  checked: boolean; 
  onPress: () => void; 
  children: React.ReactNode;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Trigger animation only when checking (not unchecking)
  React.useEffect(() => {
    if (checked) {
      // Animate scale with elastic easing
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 400,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }).start(() => {
        // Reset scale after animation completes
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [checked]);

  const handlePress = () => {
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.checkboxRowPressable}>
      <View style={styles.checkboxRowContainer}>
        <View 
          style={[
            styles.checkboxRow,
            {
              backgroundColor: checked ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            }
          ]}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Check size={16} color="white" />}
          </View>
          <View style={styles.textContainer}>
            <Animated.Text 
              style={[
                styles.checkboxText,
                {
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              {children}
            </Animated.Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default function EveningReview() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedReviews, setShowSavedReviews] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // New Daily Actions state
  const [stayedSober, setStayedSober] = useState(false);
  const [prayedOrMeditated, setPrayedOrMeditated] = useState(false);
  const [practicedGratitude, setPracticedGratitude] = useState(false);
  const [readAALiterature, setReadAALiterature] = useState(false);
  const [talkedToAlcoholic, setTalkedToAlcoholic] = useState(false);
  const [didSomethingForOthers, setDidSomethingForOthers] = useState(false);

  // New Inventory state
  const [reflectionResentful, setReflectionResentful] = useState('');
  const [reflectionApology, setReflectionApology] = useState('');
  const [reflectionShared, setReflectionShared] = useState('');
  const [reflectionKind, setReflectionKind] = useState('');
  const [reflectionBetter, setReflectionBetter] = useState('');
  const [reflectionOthers, setReflectionOthers] = useState('');
  const [reflectionWell, setReflectionWell] = useState('');

  // Always call hooks in the same order
  const eveningReviewStore = useEveningReviewStore();

  // Add safety check to prevent destructuring undefined
  if (!eveningReviewStore) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.content}>
          <Text>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }
  
  const { isCompletedToday, uncompleteToday, getWeeklyProgress, getWeeklyStreak, saveDetailedEntry, getSavedEntry } = eveningReviewStore;
  
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return dateString;
  };
  
  const today = new Date();
  const isCompleted = isCompletedToday();
  const weeklyProgress = getWeeklyProgress();
  const weeklyStreak = getWeeklyStreak();

  const dailyActions = [
    { key: 'stayedSober', label: 'Stayed sober', checked: stayedSober, setChecked: setStayedSober },
    { key: 'prayedOrMeditated', label: 'Prayed or meditated', checked: prayedOrMeditated, setChecked: setPrayedOrMeditated },
    { key: 'practicedGratitude', label: 'Practiced gratitude', checked: practicedGratitude, setChecked: setPracticedGratitude },
    { key: 'readAALiterature', label: 'Read AA literature', checked: readAALiterature, setChecked: setReadAALiterature },
            { key: 'talkedToAlcoholic', label: 'Talked with another alcoholic', checked: talkedToAlcoholic, setChecked: setTalkedToAlcoholic },
    { key: 'didSomethingForOthers', label: 'Did something for someone else', checked: didSomethingForOthers, setChecked: setDidSomethingForOthers },
  ];

  const inventoryQuestions = [
    { key: 'reflectionResentful', label: 'Was I resentful, selfish, dishonest, or afraid?', value: reflectionResentful, setValue: setReflectionResentful },
    { key: 'reflectionApology', label: 'Do I owe an apology?', value: reflectionApology, setValue: setReflectionApology },
    { key: 'reflectionShared', label: 'Did I keep something to myself that should be shared with another?', value: reflectionShared, setValue: setReflectionShared },
    { key: 'reflectionOthers', label: 'Was I thinking of myself most of the time, or of what I could do for others?', value: reflectionOthers, setValue: setReflectionOthers },
    { key: 'reflectionKind', label: 'Was I kind and loving toward all?', value: reflectionKind, setValue: setReflectionKind },
    { key: 'reflectionWell', label: 'What have I done well today?', value: reflectionWell, setValue: setReflectionWell },
    { key: 'reflectionBetter', label: 'What could I have done better?', value: reflectionBetter, setValue: setReflectionBetter },
  ];

  const handleStartNew = () => {
    setStayedSober(false);
    setPrayedOrMeditated(false);
    setPracticedGratitude(false);
    setReadAALiterature(false);
    setTalkedToAlcoholic(false);
    setDidSomethingForOthers(false);
    setReflectionResentful('');
    setReflectionApology('');
    setReflectionShared('');
    setReflectionOthers('');
    setReflectionKind('');
    setReflectionWell('');
    setReflectionBetter('');
    setShowConfirmation(false);
  };

  const handleEditReview = () => {
    // Load saved data back into form if it exists
    const todayString = getTodayDateString();
    const savedEntry = eveningReviewStore.getSavedEntry(todayString);

    if (savedEntry) {
      const data = savedEntry.data;
      // Load new format data if available, otherwise use legacy format
      if (data.stayedSober !== undefined) {
        setStayedSober(data.stayedSober);
        setPrayedOrMeditated(data.prayedOrMeditated);
        setPracticedGratitude(data.practicedGratitude);
        setReadAALiterature(data.readAALiterature);
        setTalkedToAlcoholic(data.talkedToAlcoholic);
        setDidSomethingForOthers(data.didSomethingForOthers);
        setReflectionResentful(data.reflectionResentful || '');
        setReflectionApology(data.reflectionApology || '');
        setReflectionShared(data.reflectionShared || '');
        setReflectionOthers(data.reflectionOthers || '');
        setReflectionKind(data.reflectionKind || '');
        setReflectionWell(data.reflectionWell || '');
        setReflectionBetter(data.reflectionBetter || '');
      } else {
        // Legacy format - convert to new format
        setStayedSober(true); // Assume sober if they're doing the review
        setPrayedOrMeditated(data.prayerMeditationFlag === 'yes');
        setPracticedGratitude(false);
        setReadAALiterature(false);
        setTalkedToAlcoholic(false);
        setDidSomethingForOthers(data.kindnessFlag === 'yes');
        setReflectionResentful(data.resentfulFlag === 'yes' ? data.resentfulNote : '');
        setReflectionApology(data.apologyFlag === 'yes' ? data.apologyName : '');
        setReflectionShared('');
        setReflectionKind(data.kindnessFlag === 'yes' ? data.kindnessNote : '');
        setReflectionBetter(data.spiritualNote || '');
        setReflectionOthers('');
      }
    }

    // Immediately uncomplete today to prevent UI flickering
    uncompleteToday();
    // Force show the form instead of completion screen
    setShowConfirmation(false);
    setIsEditing(true);
  };

  const handleShare = async () => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });

    let shareMessage = `${today}\n\n`;

    // Daily Actions
    shareMessage += 'Daily Actions:\n';
    dailyActions.forEach(action => {
      // Use green check for completed, black X (✖) for unchecked
      const status = action.checked ? '✅ ' : '✖ ';
      shareMessage += `${status}${action.label}\n`;
    });

    // Inventory
    shareMessage += '\nInventory:\n';
    inventoryQuestions.forEach(question => {
      const answer = question.value.trim();
      shareMessage += `${question.label}\n`;
      if (answer) {
        shareMessage += `${answer}\n\n`;
      } else {
        shareMessage += `No answer\n\n`;
      }
    });

    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Your nightly review has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } else {
        const result = await Share.share({
          message: shareMessage,
          title: `Nightly Review - ${today}`
        });
      }
    } catch (error) {
      console.error('Error sharing nightly review:', error);
      try {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Sharing failed, but your nightly review has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } catch (clipboardError) {
        Alert.alert(
          'Share Error',
          'Unable to share your nightly review. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };
  const handleReset = () => {
    const hasContent = dailyActions.some(a => a.checked) || 
                      inventoryQuestions.some(q => q.value.trim() !== '');
    
    if (!hasContent) return;
    
    // Check if there are unsaved changes by comparing current state with saved entry
    const todayString = getTodayDateString();
    const savedEntry = getSavedEntry(todayString);
    
    let hasUnsavedChanges = false;
    
    if (savedEntry) {
      const data = savedEntry.data;
      // Compare current state with saved state
      hasUnsavedChanges = 
        stayedSober !== data.stayedSober ||
        prayedOrMeditated !== data.prayedOrMeditated ||
        practicedGratitude !== data.practicedGratitude ||
        readAALiterature !== data.readAALiterature ||
        talkedToAlcoholic !== data.talkedToAlcoholic ||
        didSomethingForOthers !== data.didSomethingForOthers ||
        reflectionResentful !== (data.reflectionResentful || '') ||
        reflectionApology !== (data.reflectionApology || '') ||
        reflectionShared !== (data.reflectionShared || '') ||
        reflectionOthers !== (data.reflectionOthers || '') ||
        reflectionKind !== (data.reflectionKind || '') ||
        reflectionWell !== (data.reflectionWell || '') ||
        reflectionBetter !== (data.reflectionBetter || '');
    } else {
      // No saved entry, so any content means unsaved changes
      hasUnsavedChanges = hasContent;
    }
    
    console.log('[Evening Review] handleReset - hasUnsavedChanges:', hasUnsavedChanges, 'hasContent:', hasContent);
    
    // Only show warning if there are unsaved changes
    if (hasUnsavedChanges) {
      Alert.alert(
        'Reset Nightly Review',
        'You have unsaved changes. Are you sure you want to clear your current review?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              // Reset all state
              setStayedSober(false);
              setPrayedOrMeditated(false);
              setPracticedGratitude(false);
              setReadAALiterature(false);
              setTalkedToAlcoholic(false);
              setDidSomethingForOthers(false);
              setReflectionResentful('');
              setReflectionApology('');
              setReflectionShared('');
              setReflectionOthers('');
              setReflectionKind('');
              setReflectionWell('');
              setReflectionBetter('');
            }
          }
        ]
      );
    } else {
      // No unsaved changes, just reset without warning
      console.log('[Evening Review] Resetting without alert - no unsaved changes');
      setStayedSober(false);
      setPrayedOrMeditated(false);
      setPracticedGratitude(false);
      setReadAALiterature(false);
      setTalkedToAlcoholic(false);
      setDidSomethingForOthers(false);
      setReflectionResentful('');
      setReflectionApology('');
      setReflectionShared('');
      setReflectionOthers('');
      setReflectionKind('');
      setReflectionWell('');
      setReflectionBetter('');
    }
  };
  const handleSaveEntry = () => {
    // Check if there's any content to save
    const hasActions = dailyActions.some(action => action.checked);
    const hasInventory = inventoryQuestions.some(question => question.value.trim() !== '');
    
    if (!hasActions && !hasInventory) {
      Alert.alert(
        'Save Nightly Review',
        'Please complete at least one daily action or inventory question before saving.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const detailedEntry = {
      // New format fields
      stayedSober,
      prayedOrMeditated,
      practicedGratitude,
      readAALiterature,
      talkedToAlcoholic,
      didSomethingForOthers,
      reflectionResentful,
      reflectionApology,
      reflectionShared,
      reflectionOthers,
      reflectionKind,
      reflectionWell,
      reflectionBetter,
      // Legacy fields for compatibility
      resentfulFlag: '',
      resentfulNote: '',
      selfishFlag: '',
      selfishNote: '',
      fearfulFlag: '',
      fearfulNote: '',
      apologyFlag: '',
      apologyName: '',
      kindnessFlag: '',
      kindnessNote: '',
      spiritualFlag: '',
      spiritualNote: '',
      prayerMeditationFlag: ''
    };

    saveDetailedEntry(detailedEntry);

    // Set showConfirmation to true to show the completed screen with saved message
    setShowConfirmation(true);
    setIsEditing(false);
  };

  const canSave = () => {
    return dailyActions.some(action => action.checked) || 
           inventoryQuestions.some(question => question.value.trim() !== '');
  };

  // Show completion screen if review is completed, unless we're editing
  if (showConfirmation || (isCompleted && !isEditing)) {
    return (
      <ScreenContainer style={styles.container}>
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Complete</Text>
            <Text style={styles.subtitle}>{formatDateDisplay(today)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.confirmationText}>
              Thanks for checking in. You&apos;re doing the work — one day at a time.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar color={Colors.light.tint} size={20} />
              <Text style={styles.cardTitle}>This Week&apos;s Progress</Text>
            </View>
            
            <View style={styles.weeklyProgress}>
              {weeklyProgress.map((day, index) => (
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
              ))}
            </View>
            
            {weeklyStreak > 0 ? (
              <AnimatedEveningReviewMessage
                weeklyStreak={weeklyStreak}
                visible={true}
              />
            ) : (
              <Text style={styles.streakText}>
                Start your streak today! 🌱
              </Text>
            )}
          </View>

          <Text style={styles.privacyText}>
            Your responses are saved only on your device. Nothing is uploaded or shared.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleEditReview}>
              <Text style={styles.primaryButtonText} numberOfLines={1}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setShowSavedReviews(true)}
            >
              <Text style={styles.primaryButtonText} numberOfLines={1}>History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <SavedEveningReviews 
          visible={showSavedReviews}
          onClose={() => setShowSavedReviews(false)}
        />
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Action Row - Above Title */}
          <View style={styles.actionRow}>
            {/* Save */}
            <TouchableOpacity 
              onPress={handleSaveEntry}
              accessible={true}
              accessibilityLabel="Save nightly review"
              accessibilityRole="button"
              activeOpacity={0.6}
              style={styles.actionButton}
            >
              <Save color="#007AFF" size={18} />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
            
            {/* Share */}
            <TouchableOpacity 
              onPress={handleShare}
              accessible={true}
              accessibilityLabel="Share nightly review"
              accessibilityRole="button"
              activeOpacity={0.6}
              style={styles.actionButton}
            >
              <ShareIcon color="#007AFF" size={18} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            
            {/* History */}
            <TouchableOpacity 
              onPress={() => setShowSavedReviews(true)}
              accessible={true}
              accessibilityLabel="View saved reviews"
              accessibilityRole="button"
              activeOpacity={0.6}
              style={styles.actionButton}
            >
              <Folder color="#007AFF" size={18} />
              <Text style={styles.actionButtonText}>History</Text>
            </TouchableOpacity>
            
            {/* Reset */}
            <TouchableOpacity 
              onPress={handleReset}
              accessible={true}
              accessibilityLabel="Reset nightly review"
              accessibilityRole="button"
              activeOpacity={0.6}
              style={styles.actionButton}
            >
              <RotateCcw color="#007AFF" size={18} />
              <Text style={styles.actionButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.header}>
            <Text style={styles.title}>Nightly Review</Text>
            <Text style={styles.description}>
              Nightly inventory based on AA&apos;s &apos;When We Retire at Night&apos; guidance
            </Text>
          </View>

          <View style={styles.dateCard}>
            <Text style={styles.dateText}>{formatDateDisplay(today)}</Text>
          </View>

          {/* Daily Actions Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Daily Actions</Text>
            <View style={styles.dailyActionsContainer}>
              {dailyActions.map((action) => (
                <AnimatedCheckbox
                  key={action.key}
                  checked={action.checked}
                  onPress={() => action.setChecked(!action.checked)}
                >
                  {action.label}
                </AnimatedCheckbox>
              ))}
            </View>
          </View>

          {/* Inventory Section */}
          <View style={styles.inventoryCard}>
            <Text style={styles.sectionTitle}>10th Step Inventory</Text>
            <Text style={styles.inventoryDescription}>
              Based on AA&apos;s &apos;When We Retire at Night&apos; p. 86
            </Text>
            <View style={styles.inventoryContainer}>
              {inventoryQuestions.map((question) => (
                <View key={question.key} style={styles.questionContainer}>
                  <Text style={styles.questionText}>{question.label}</Text>
                  <TextInput
                    style={styles.inventoryTextInput}
                    placeholder="Write your reflection here..."
                    value={question.value}
                    onChangeText={question.setValue}
                    multiline
                    placeholderTextColor={Colors.light.muted}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>
              ))}
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
          
          

          <Text style={styles.privacyText}>
            Your responses are saved only on your device. Nothing is uploaded or shared.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <SavedEveningReviews 
        visible={showSavedReviews}
        onClose={() => setShowSavedReviews(false)}
      />
    </ScreenContainer>
  );
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingTop: 4,
    paddingBottom: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  description: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  dateCard: {
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
  dateText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    textAlign: 'center',
  },
  card: {
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
  inventoryCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 16,
  },
  inventoryDescription: {
    fontSize: 12,
    color: Colors.light.muted,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  dailyActionsContainer: {
    gap: 8,
  },
  inventoryContainer: {
    gap: 16,
  },
  checkboxRowPressable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  checkboxRowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'stretch',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 15,
    color: Colors.light.text,
    textAlign: 'left',
  },
  questionContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
  },
  questionText: {
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  inventoryTextInput: {
    marginTop: 4,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 80,
    textAlignVertical: 'top',
    // Level 2.2: Interactive Cards (Softer depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
  privacyText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  // Completion screen styles
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
    lineHeight: 22,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    justifyContent: 'space-between',
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
});