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
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Share as ShareIcon, Trash2, X } from 'lucide-react-native';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface SavedGratitudeEntriesProps {
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

export default function SavedGratitudeEntries({ visible, onClose }: SavedGratitudeEntriesProps) {
  const { savedEntries, deleteSavedEntry } = useGratitudeStore();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Debug logging
  console.log('SavedGratitudeEntries - Total saved entries:', savedEntries.length);
  console.log('SavedGratitudeEntries - Entries:', savedEntries.map(e => ({ date: e.date, timestamp: e.timestamp })));
  
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
  console.log('SavedGratitudeEntries - Today\'s date string:', todayString);
  console.log('SavedGratitudeEntries - Today\'s entry exists:', !!todayEntry);
  if (todayEntry) {
    console.log('SavedGratitudeEntries - Today\'s entry:', { date: todayEntry.date, timestamp: todayEntry.timestamp });
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
      'Are you sure you want to delete this gratitude list entry?',
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
    console.log('=== SAVED ENTRY SHARE BUTTON PRESSED ===');
    console.log('Entry to share:', entry.date);
    console.log('Platform:', Platform.OS);
    console.log('Share function available:', typeof Share.share);
    
    const { date, items } = entry;
    const formattedDate = formatDateDisplay(date);

    const gratitudeText = items
      .map((item: string) => `${item}`)
      .join('\n');

    let shareMessage = `Today I'm grateful for:\n${gratitudeText}`;
    
    console.log('Share message prepared:', shareMessage.substring(0, 100) + '...');

    try {
      console.log('Attempting to share on platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        console.log('Web platform detected, using clipboard');
        await Clipboard.setStringAsync(shareMessage);
        console.log('Clipboard write successful');
        Alert.alert(
          'Copied to Clipboard',
          'Your gratitude list has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('Mobile platform detected, using native Share API');
        await Share.share({
          message: shareMessage,
          title: `Gratitude List - ${formattedDate}`
        });
        console.log('Share successful');
      }
    } catch (error) {
      console.error('Error sharing gratitude list:', error);
      try {
        console.log('Attempting clipboard fallback');
        await Clipboard.setStringAsync(shareMessage);
        console.log('Clipboard fallback successful');
        Alert.alert(
          'Copied to Clipboard',
          'Sharing failed, but your gratitude list has been copied to the clipboard.',
          [{ text: 'OK' }]
        );
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
        Alert.alert(
          'Share Error',
          'Unable to share your gratitude list. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
    console.log('=== SAVED ENTRY SHARE FUNCTION COMPLETE ===');
  };

  const renderEntryDetail = () => {
    if (!selectedEntry) return null;

    const { date, items } = selectedEntry;

    return (
      <View style={styles.entryDetailContainer}>
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
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
          <Text style={styles.modalTitle}>Gratitude List</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.entryDetailContent}>
          <Text style={styles.entryDate}>{formatDateDisplay(date)}</Text>
          
          <View style={styles.gratitudeContainer}>
            <Text style={styles.gratitudeTitle}>Today I was grateful for:</Text>
            {items.map((item: string, index: number) => (
              <View key={index} style={styles.gratitudeItemContainer}>
                <Text style={styles.gratitudeItemText}>{item}</Text>
              </View>
            ))}
          </View>
          
        </ScrollView>
      </View>
    );
  };

  // Log when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      console.log('SavedGratitudeEntries modal opened - Current entries:', savedEntries.length);
      console.log('SavedGratitudeEntries modal opened - Entry dates:', savedEntries.map(e => e.date));
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
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        {selectedEntry ? (
          renderEntryDetail()
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color={Colors.light.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.title}>Saved Gratitude Lists</Text>
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
                  <Text style={styles.emptyTitle}>No Saved Gratitude Lists</Text>
                  <Text style={styles.emptyDescription}>
                    Your saved gratitude lists will appear here.
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
                        testID={`saved-gratitude-${entry.date}`}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`View gratitude list for ${formatDateDisplay(entry.date)}`}
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
                        <TouchableOpacity
                          style={styles.entryDeleteButton}
                          onPress={(event) => handleDeleteEntry(entry.date, event)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityLabel="Delete saved gratitude list"
                          accessibilityRole="button"
                        >
                          <Trash2 color={Colors.light.muted} size={18} />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.entryPreview}>
                        <Text style={styles.previewText}>
                          {entry.items.length} {entry.items.length === 1 ? 'item' : 'items'} • Tap to view full list
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
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  entryDeleteButton: {
    padding: 4,
    marginLeft: 8,
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
  gratitudeContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
  },
  gratitudeTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    marginBottom: 16,
  },
  gratitudeItemContainer: {
    marginBottom: 12,
  },
  gratitudeItemText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
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