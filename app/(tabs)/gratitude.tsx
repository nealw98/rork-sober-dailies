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
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { Heart, Share as ShareIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGratitudeStore } from '@/hooks/useGratitudeStore';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import ScreenContainer from '@/components/ScreenContainer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)'
  },
  title: {
    fontSize: 24,
    fontWeight: adjustFontWeight('700', true),
    color: Colors.light.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 16
  },
  inputSection: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.light.background,
    color: Colors.light.text
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true)
  },
  listContainer: {
    flex: 1,
    padding: 20
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  listTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text
  },
  counter: {
    fontSize: 14,
    color: Colors.light.muted,
    backgroundColor: Colors.light.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  gratitudeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  gratitudeText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: 16
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  quoteSubtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'left',
    marginBottom: 8
  },
  buttonContainer: {
    padding: 20,
    gap: 12
  },
  shareButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  shareButtonDisabled: {
    backgroundColor: Colors.light.muted,
    opacity: 0.6
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true)
  },

});

export default function GratitudeListScreen() {
  const gratitudeStore = useGratitudeStore();
  const {
    getTodaysItems,
    addItemsToToday
  } = gratitudeStore;
  
  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  
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





  const handleShare = async () => {
    console.log('Share button pressed, items:', gratitudeItems.length);
    
    if (gratitudeItems.length === 0) {
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

    const gratitudeText = gratitudeItems
      .map((item) => `• ${item}`)
      .join('\n');

    const shareMessage = `${today}\n\nToday I'm grateful for:\n${gratitudeText}`;

    try {
      console.log('Attempting to share:', Platform.OS);
      
      if (Platform.OS === 'web') {
        // For web, copy to clipboard since Share API doesn't work in iframes
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert(
          'Copied to Clipboard',
          'Your gratitude list has been copied to the clipboard. You can now paste it in any messaging app or text field.',
          [{ text: 'OK' }]
        );
      } else {
        // For mobile, use native Share API
        const result = await Share.share({
          message: shareMessage,
          title: 'My Daily Gratitude List'
        });
        console.log('Share result:', result);
      }
    } catch (error) {
      console.error('Error sharing gratitude list:', error);
      
      // Fallback to clipboard for any platform if sharing fails
      try {
        await Clipboard.setStringAsync(shareMessage);
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
  };


  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddGratitude();
    }
  };

  const renderGratitudeItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.gratitudeItem}>
      <Text style={styles.gratitudeText}>{item}</Text>
    </View>
  );

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ title: 'Daily Gratitude' }} />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 1]}
        />
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Heart size={24} color={Colors.light.tint} />
            <Text style={styles.title}>Gratitude List</Text>
          </View>
          <Text style={styles.quoteSubtitle}>
            &ldquo;A full and thankful heart cannot entertain great conceits.&rdquo; — As Bill Sees It, p 37
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.subtitle}>
            Today I&apos;m grateful for:
          </Text>
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
              style={styles.addButton}
              onPress={handleAddGratitude}
              disabled={!inputValue.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listContainer}>
          {gratitudeItems.length > 0 && (
            <FlatList
              data={gratitudeItems}
              renderItem={renderGratitudeItem}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.shareButton,
            gratitudeItems.length === 0 && styles.shareButtonDisabled
          ]}
          onPress={handleShare}
          disabled={gratitudeItems.length === 0}
          activeOpacity={0.7}
        >
          <ShareIcon size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Gratitude List</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}