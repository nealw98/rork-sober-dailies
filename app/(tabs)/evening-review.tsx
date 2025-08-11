import React, { useState } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import ScreenContainer from "@/components/ScreenContainer";
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Calendar, Share as ShareIcon, Save, Archive } from 'lucide-react-native';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import SavedEveningReviews from '@/components/SavedEveningReviews';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';



const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function EveningReview() {
  const eveningReviewStore = useEveningReviewStore();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedReviews, setShowSavedReviews] = useState(false);

  // Form state - matching web app structure
  const [resentfulFlag, setResentfulFlag] = useState('');
  const [resentfulNote, setResentfulNote] = useState('');
  const [selfishFlag, setSelfishFlag] = useState('');
  const [selfishNote, setSelfishNote] = useState('');
  const [fearfulFlag, setFearfulFlag] = useState('');
  const [fearfulNote, setFearfulNote] = useState('');
  const [apologyFlag, setApologyFlag] = useState('');
  const [apologyName, setApologyName] = useState('');
  const [kindnessFlag, setKindnessFlag] = useState('');
  const [kindnessNote, setKindnessNote] = useState('');
  const [spiritualFlag, setSpiritualFlag] = useState('');
  const [spiritualNote, setSpiritualNote] = useState('');
  const [prayerMeditationFlag, setPrayerMeditationFlag] = useState('');

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
    // Ensure we're working in local timezone
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log('evening-review getTodayDateString:', dateString, 'timezone offset:', today.getTimezoneOffset());
    return dateString;
  };
  
  const today = new Date();
  const isCompleted = isCompletedToday();
  const weeklyProgress = getWeeklyProgress();
  const weeklyStreak = getWeeklyStreak();

  const questions = [
    {
      text: '1. Was I resentful today?',
      flag: resentfulFlag,
      setFlag: setResentfulFlag,
      note: resentfulNote,
      setNote: setResentfulNote,
      placeholder: 'With whom?'
    },
    {
      text: '2. Was I selfish and self-centered today?',
      flag: selfishFlag,
      setFlag: setSelfishFlag,
      note: selfishNote,
      setNote: setSelfishNote,
      placeholder: 'In what way?'
    },
    {
      text: '3. Was I fearful or worrisome today?',
      flag: fearfulFlag,
      setFlag: setFearfulFlag,
      note: fearfulNote,
      setNote: setFearfulNote,
      placeholder: 'How so?'
    },
    {
      text: '4. Do I owe anyone an apology?',
      flag: apologyFlag,
      setFlag: setApologyFlag,
      note: apologyName,
      setNote: setApologyName,
      placeholder: 'Whom have you harmed?'
    },
    {
      text: '5. Was I loving and kind to others today?',
      flag: kindnessFlag,
      setFlag: setKindnessFlag,
      note: kindnessNote,
      setNote: setKindnessNote,
      placeholder: 'What did you do?'
    },
    {
      text: '6. Did I pray or meditate today?',
      flag: prayerMeditationFlag,
      setFlag: setPrayerMeditationFlag,
      note: '',
      setNote: () => {},
      placeholder: ''
    },
    {
      text: '7. How was my spiritual condition today?',
      flag: spiritualFlag,
      setFlag: setSpiritualFlag,
      note: spiritualNote,
      setNote: setSpiritualNote,
      placeholder: 'Were you on the beam?',
      inputOnly: true
    }
  ];



  const handleStartNew = () => {
    setResentfulFlag('');
    setResentfulNote('');
    setSelfishFlag('');
    setSelfishNote('');
    setFearfulFlag('');
    setFearfulNote('');
    setApologyFlag('');
    setApologyName('');
    setKindnessFlag('');
    setKindnessNote('');
    setSpiritualFlag('');
    setSpiritualNote('');
    setPrayerMeditationFlag('');
    setShowConfirmation(false);
  };

  const handleEditReview = () => {
    // Load saved data back into form if it exists
    const todayString = getTodayDateString();
    const savedEntry = eveningReviewStore.getSavedEntry(todayString);
    
    if (savedEntry) {
      const data = savedEntry.data;
      setResentfulFlag(data.resentfulFlag);
      setResentfulNote(data.resentfulNote);
      setSelfishFlag(data.selfishFlag);
      setSelfishNote(data.selfishNote);
      setFearfulFlag(data.fearfulFlag);
      setFearfulNote(data.fearfulNote);
      setApologyFlag(data.apologyFlag);
      setApologyName(data.apologyName);
      setKindnessFlag(data.kindnessFlag);
      setKindnessNote(data.kindnessNote);
      setSpiritualFlag(data.spiritualFlag);
      setSpiritualNote(data.spiritualNote);
      setPrayerMeditationFlag(data.prayerMeditationFlag);
    }
    
    // Uncomplete today to show the form
    uncompleteToday();
    setShowConfirmation(false);
  };
  


  const handleShare = async () => {
    console.log('Share button pressed');

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create a summary of the review
    const answeredQuestions = [];
    
    // Include all answered questions, regardless of yes/no
    if (resentfulFlag) {
      const answer = resentfulFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`1. Was I resentful today? ${answer}${resentfulFlag === 'yes' && resentfulNote ? ` - ${resentfulNote}` : ''}`);
    }
    if (selfishFlag) {
      const answer = selfishFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`2. Was I selfish and self-centered today? ${answer}${selfishFlag === 'yes' && selfishNote ? ` - ${selfishNote}` : ''}`);
    }
    if (fearfulFlag) {
      const answer = fearfulFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`3. Was I fearful or worrisome today? ${answer}${fearfulFlag === 'yes' && fearfulNote ? ` - ${fearfulNote}` : ''}`);
    }
    if (apologyFlag) {
      const answer = apologyFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`4. Do I owe anyone an apology? ${answer}${apologyFlag === 'yes' && apologyName ? ` - ${apologyName}` : ''}`);
    }
    if (kindnessFlag) {
      const answer = kindnessFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`5. Was I of service or kind to others today? ${answer}${kindnessFlag === 'yes' && kindnessNote ? ` - ${kindnessNote}` : ''}`);
    }
    if (prayerMeditationFlag) {
      const answer = prayerMeditationFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`6. Did I pray or meditate today? ${answer}`);
    }
    if (spiritualNote) {
      answeredQuestions.push(`7. How was my spiritual condition today? ${spiritualNote}`);
    }

    let shareMessage = `${today}\n\nEvening Review\n\n`;
    
    if (answeredQuestions.length > 0) {
      shareMessage += answeredQuestions.join('\n\n') + '\n\n';
    } else {
      shareMessage += 'Starting my nightly review...\n\n';
    }
    
    shareMessage += 'Working my program one day at a time.';

    try {
      console.log('Attempting to share:', Platform.OS);
      
      if (Platform.OS === 'web') {
        // For web, copy to clipboard since Share API doesn't work in iframes
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Your nightly review has been copied to the clipboard. You can now paste it in any messaging app or text field.',
          [{ text: 'OK' }]
        );
      } else {
        // For mobile, use native Share API
        const result = await Share.share({
          message: shareMessage,
          title: 'My Nightly Review'
        });
        console.log('Share result:', result);
      }
    } catch (error) {
      console.error('Error sharing nightly review:', error);
      
      // Fallback to clipboard for any platform if sharing fails
      try {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Sharing failed, but your nightly review has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
        Alert.alert(
          'Share Error',
          'Unable to share your nightly review. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Check if all questions are answered
  const getAnsweredCount = () => {
    const flags = [resentfulFlag, selfishFlag, fearfulFlag, apologyFlag, kindnessFlag, spiritualNote, prayerMeditationFlag];
    return flags.filter(flag => flag !== '').length;
  };

  const answeredCount = getAnsweredCount();

  const handleSaveEntry = () => {
    const detailedEntry = {
      resentfulFlag,
      resentfulNote,
      selfishFlag,
      selfishNote,
      fearfulFlag,
      fearfulNote,
      apologyFlag,
      apologyName,
      kindnessFlag,
      kindnessNote,
      spiritualFlag,
      spiritualNote,
      prayerMeditationFlag
    };

    // Save for today's date
    saveDetailedEntry(detailedEntry);
    
    Alert.alert(
      'Review Saved',
      'Your evening review has been saved successfully.',
      [{ text: 'OK' }]
    );
  };

  const canSave = () => {
    return answeredCount > 0;
  };

  // Show friendly message if no data found and not editing
  if (!isCompleted && answeredCount === 0) {
    // This is the initial state - show the form
  }
  
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
            <Text style={styles.title}>Review Complete</Text>
            <Text style={styles.subtitle}>{formatDateDisplay(today)}</Text>
            <Text style={styles.description}>
              Evening reflection helps us stay connected to our recovery
            </Text>
          </View>

          {/* Confirmation Message */}
          <View style={styles.card}>
            <Text style={styles.confirmationText}>
              Thanks for checking in. You&apos;re doing the work — one day at a time.
            </Text>
          </View>
          
          {/* Friendly message for first time users */}
          {!isCompleted && answeredCount === 0 && (
            <View style={styles.card}>
              <Text style={styles.confirmationText}>
                No review found for today. Start now to see your insights.
              </Text>
            </View>
          )}

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
            Your responses are saved only on your device. Nothing is uploaded or shared.
          </Text>



          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.outlineButton} onPress={handleEditReview}>
              <Text style={styles.outlineButtonText}>Edit Review</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
          <Text style={styles.title}>Evening Review</Text>
          <Text style={styles.description}>
            Nightly inventory based on AA&apos;s &apos;When We Retire at Night&apos; guidance
          </Text>
        </View>

        {/* Questions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{formatDateDisplay(today)}</Text>
          
          <View style={styles.questionsContainer}>
            {questions.map((question, index) => (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>{question.text}</Text>
                {question.inputOnly ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder={question.placeholder}
                    value={question.note}
                    onChangeText={question.setNote}
                    multiline
                    placeholderTextColor={Colors.light.muted}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    enablesReturnKeyAutomatically={true}
                  />
                ) : (
                  <>
                    <View style={styles.answerButtons}>
                      <TouchableOpacity
                        style={[
                          styles.answerButton,
                          question.flag === 'yes' && styles.answerButtonSelected
                        ]}
                        onPress={() => question.setFlag('yes')}
                      >
                        <Text style={[
                          styles.answerButtonText,
                          question.flag === 'yes' && styles.answerButtonTextSelected
                        ]}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.answerButton,
                          question.flag === 'no' && styles.answerButtonSelected
                        ]}
                        onPress={() => question.setFlag('no')}
                      >
                        <Text style={[
                          styles.answerButtonText,
                          question.flag === 'no' && styles.answerButtonTextSelected
                        ]}>No</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {question.flag === 'yes' && question.placeholder && (
                      <TextInput
                        style={styles.textInput}
                        placeholder={question.placeholder}
                        value={question.note}
                        onChangeText={question.setNote}
                        multiline
                        placeholderTextColor={Colors.light.muted}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        enablesReturnKeyAutomatically={true}
                      />
                    )}
                  </>
                )}
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
            style={styles.shareButton} 
            onPress={handleShare}
          >
            <ShareIcon size={20} color="white" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* View Saved Reviews Button */}
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => setShowSavedReviews(true)}
        >
          <Archive size={20} color={Colors.light.tint} />
          <Text style={styles.secondaryButtonText}>View Saved Reviews</Text>
        </TouchableOpacity>



          {/* Privacy Notice */}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('700', true),
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  alertDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCancelButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  alertConfirmButton: {
    flex: 1,
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
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
  questionsContainer: {
    marginTop: 16,
  },
  questionContainer: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  answerButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
  },
  answerButtonSelected: {
    backgroundColor: Colors.light.tint,
  },
  answerButtonText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('500'),
  },
  answerButtonTextSelected: {
    color: 'white',
  },
  textInput: {
    marginTop: 8,
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

  completeButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
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
  unsubmitButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 32,
  },
  unsubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
  },
  insightsContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  insightsSubtitle: {
    fontSize: 14,
    color: Colors.light.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  insightPercentage: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('600'),
    marginLeft: 12,
  },
  insightItem: {
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.text,
    marginBottom: 4,
  },
  insightNotes: {
    fontSize: 12,
    color: Colors.light.muted,
    fontStyle: 'italic',
    marginLeft: 12,
  },
  placeholderNote: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 32,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressText: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: Colors.light.muted,
    opacity: 0.6,
  },
  completeButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  shareButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
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
});