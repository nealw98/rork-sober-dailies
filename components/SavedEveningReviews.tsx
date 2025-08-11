import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Calendar, Share as ShareIcon, Trash2, X } from 'lucide-react-native';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface SavedEveningReviewsProps {
  visible: boolean;
  onClose: () => void;
}

const formatDateDisplay = (dateString: string): string => {
  // Parse date string as local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (dateString: string): string => {
  // Parse date string as local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export default function SavedEveningReviews({ visible, onClose }: SavedEveningReviewsProps) {
  const { savedEntries, deleteSavedEntry } = useEveningReviewStore();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Debug logging
  console.log('SavedEveningReviews - Total saved entries:', savedEntries.length);
  console.log('SavedEveningReviews - Entries:', savedEntries.map(e => ({ date: e.date, timestamp: e.timestamp })));
  
  // Check for today's entry specifically
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayString = getTodayDateString();
  const todayEntry = savedEntries.find(entry => entry.date === todayString);
  console.log('SavedEveningReviews - Today\'s date string:', todayString);
  console.log('SavedEveningReviews - Today\'s entry exists:', !!todayEntry);
  if (todayEntry) {
    console.log('SavedEveningReviews - Today\'s entry:', { date: todayEntry.date, timestamp: todayEntry.timestamp });
  }

  const handleEntryPress = (entry: any) => {
    console.log('=== ENTRY PRESS DEBUG ===');
    console.log('handleEntryPress called for entry:', entry.date);
    console.log('Platform:', Platform.OS);
    console.log('Touch event registered successfully');
    console.log('Entry data:', JSON.stringify(entry, null, 2));
    console.log('Current selectedEntry:', selectedEntry?.date || 'none');
    
    // Direct state update - no nested modal needed
    setSelectedEntry(entry);
    console.log('After setState - selectedEntry should be:', entry.date);
    
    console.log('=== END ENTRY PRESS DEBUG ===');
  };

  const handleDeleteEntry = (dateString: string, event?: any) => {
    console.log('handleDeleteEntry called for:', dateString);
    if (event) {
      event.stopPropagation();
    }
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this evening review entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Deleting entry:', dateString);
            deleteSavedEntry(dateString);
          }
        }
      ]
    );
  };

  const handleShareEntry = async (entry: any) => {
    const { date, data } = entry;
    const formattedDate = formatDateDisplay(date);

    const answeredQuestions = [];
    
    if (data.resentfulFlag) {
      const answer = data.resentfulFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`1. Was I resentful today? ${answer}${data.resentfulFlag === 'yes' && data.resentfulNote ? ` - ${data.resentfulNote}` : ''}`);
    }
    if (data.selfishFlag) {
      const answer = data.selfishFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`2. Was I selfish and self-centered today? ${answer}${data.selfishFlag === 'yes' && data.selfishNote ? ` - ${data.selfishNote}` : ''}`);
    }
    if (data.fearfulFlag) {
      const answer = data.fearfulFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`3. Was I fearful or worrisome today? ${answer}${data.fearfulFlag === 'yes' && data.fearfulNote ? ` - ${data.fearfulNote}` : ''}`);
    }
    if (data.apologyFlag) {
      const answer = data.apologyFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`4. Do I owe anyone an apology? ${answer}${data.apologyFlag === 'yes' && data.apologyName ? ` - ${data.apologyName}` : ''}`);
    }
    if (data.kindnessFlag) {
      const answer = data.kindnessFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`5. Was I of service or kind to others today? ${answer}${data.kindnessFlag === 'yes' && data.kindnessNote ? ` - ${data.kindnessNote}` : ''}`);
    }
    if (data.prayerMeditationFlag) {
      const answer = data.prayerMeditationFlag === 'yes' ? 'Yes' : 'No';
      answeredQuestions.push(`6. Did I pray or meditate today? ${answer}`);
    }
    if (data.spiritualNote) {
      answeredQuestions.push(`7. How was my spiritual condition today? ${data.spiritualNote}`);
    }

    let shareMessage = `${formattedDate}\n\nEvening Review\n\n`;
    
    if (answeredQuestions.length > 0) {
      shareMessage += answeredQuestions.join('\n\n') + '\n\n';
    }
    
    shareMessage += 'Working my program one day at a time.';

    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Your evening review has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } else {
        await Share.share({
          message: shareMessage,
          title: 'My Evening Review'
        });
      }
    } catch (error) {
      console.error('Error sharing evening review:', error);
      try {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Sharing failed, but your evening review has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } catch {
        Alert.alert(
          'Share Error',
          'Unable to share your evening review. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const renderEntryDetail = () => {
    if (!selectedEntry) return null;

    const { date, data } = selectedEntry;
    const questions = [
      {
        text: '1. Was I resentful today?',
        flag: data.resentfulFlag,
        note: data.resentfulNote,
      },
      {
        text: '2. Was I selfish and self-centered today?',
        flag: data.selfishFlag,
        note: data.selfishNote,
      },
      {
        text: '3. Was I fearful or worrisome today?',
        flag: data.fearfulFlag,
        note: data.fearfulNote,
      },
      {
        text: '4. Do I owe anyone an apology?',
        flag: data.apologyFlag,
        note: data.apologyName,
      },
      {
        text: '5. Was I loving and kind to others today?',
        flag: data.kindnessFlag,
        note: data.kindnessNote,
      },
      {
        text: '6. Did I pray or meditate today?',
        flag: data.prayerMeditationFlag,
        note: '',
      },
      {
        text: '7. How was my spiritual condition today?',
        flag: data.spiritualFlag,
        note: data.spiritualNote,
        inputOnly: true
      }
    ];

    return (
      <View style={styles.entryDetailContainer}>
        <View style={styles.entryDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('Going back to list');
              setSelectedEntry(null);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X color={Colors.light.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Evening Review</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.entryDetailContent}>
          <Text style={styles.entryDate}>{formatDateDisplay(date)}</Text>
          
          <View style={styles.questionsContainer}>
            {questions.map((question, index) => (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>{question.text}</Text>
                {question.inputOnly ? (
                  question.note ? (
                    <Text style={styles.answerText}>{question.note}</Text>
                  ) : (
                    <Text style={styles.noAnswerText}>No response</Text>
                  )
                ) : (
                  <>
                    {question.flag ? (
                      <Text style={[
                        styles.answerText,
                        question.flag === 'yes' ? styles.yesAnswer : styles.noAnswer
                      ]}>
                        {question.flag === 'yes' ? 'Yes' : 'No'}
                      </Text>
                    ) : (
                      <Text style={styles.noAnswerText}>No response</Text>
                    )}
                    {question.flag === 'yes' && question.note && (
                      <Text style={styles.noteText}>{question.note}</Text>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setSelectedEntry(null);
                handleDeleteEntry(selectedEntry.date);
              }}
            >
              <Trash2 color="white" size={20} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.shareEntryButton}
              onPress={() => handleShareEntry(selectedEntry)}
            >
              <ShareIcon color="white" size={20} />
              <Text style={styles.shareEntryButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Log when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      console.log('SavedEveningReviews modal opened - Current entries:', savedEntries.length);
      console.log('SavedEveningReviews modal opened - Entry dates:', savedEntries.map(e => e.date));
    }
  }, [visible, savedEntries]);

  // Debug state changes
  React.useEffect(() => {
    console.log('selectedEntry changed to:', selectedEntry?.date || 'null');
  }, [selectedEntry]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={() => {
        if (selectedEntry) {
          setSelectedEntry(null);
        } else {
          onClose();
        }
      }}
    >
      <View style={styles.container}>
        {selectedEntry ? (
          renderEntryDetail()
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color={Colors.light.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.title}>Saved Reviews</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.content}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ flexGrow: 1 }}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {savedEntries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Calendar color={Colors.light.muted} size={48} />
                  <Text style={styles.emptyTitle}>No Saved Reviews</Text>
                  <Text style={styles.emptyDescription}>
                    Your saved evening reviews will appear here.
                  </Text>
                </View>
              ) : (
                <View style={styles.entriesList}>
                  {savedEntries.map((entry, index) => {
                    console.log(`Rendering entry ${index}:`, entry.date);
                    return (
                      <TouchableOpacity
                        key={entry.date}
                        style={styles.entryCard}
                        onPress={() => {
                          console.log('=== TOUCHABLE ONPRESS FIRED ===');
                          console.log('Entry pressed:', entry.date);
                          console.log('Platform:', Platform.OS);
                          console.log('Touch event registered successfully');
                          console.log('Entry index:', index);
                          console.log('Entry object:', JSON.stringify(entry, null, 2));
                          handleEntryPress(entry);
                        }}
                        activeOpacity={0.6}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        testID={`saved-entry-${entry.date}`}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`View review for ${formatDateDisplay(entry.date)}`}
                      >
                      <View style={styles.entryHeader}>
                        <View style={styles.entryDateContainer}>
                          <Text style={styles.entryDateText}>
                            {formatDateShort(entry.date)}
                          </Text>
                          <Text style={styles.entryFullDate}>
                            {formatDateDisplay(entry.date)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.entryPreview}>
                        <Text style={styles.previewText}>
                          Tap to view full review
                        </Text>
                      </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  entriesList: {
    paddingVertical: 16,
  },
  entryCard: {
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
    padding: 16,
    minHeight: 80,
  },

  entryHeader: {
    marginBottom: 8,
  },
  entryDateContainer: {
    flex: 1,
  },
  entryDateText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
  },
  entryFullDate: {
    fontSize: 14,
    color: Colors.light.muted,
    marginTop: 2,
  },

  entryPreview: {
    marginTop: 8,
  },
  previewText: {
    fontSize: 14,
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  entryDetailContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  entryDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 40,
  },
  entryDetailContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  entryDate: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 24,
  },
  questionsContainer: {
    gap: 16,
  },
  questionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  questionText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  answerText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    marginBottom: 4,
  },
  yesAnswer: {
    color: '#dc3545',
  },
  noAnswer: {
    color: Colors.light.tint,
  },
  noAnswerText: {
    fontSize: 14,
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  noteText: {
    fontSize: 14,
    color: Colors.light.text,
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingBottom: 24,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  shareEntryButton: {
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
  shareEntryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
});