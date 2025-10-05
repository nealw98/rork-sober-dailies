import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { MOOD_COLORS, MOOD_EMOJIS } from '@/constants/achievements';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type Mood = 'great' | 'good' | 'okay' | 'struggling' | 'difficult';

export default function CheckInScreen() {
  const router = useRouter();
  const { addDailyCheckIn, getTodaysCheckIn } = useSobriety();
  
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [reflection, setReflection] = useState('');
  const [gratitudeItems, setGratitudeItems] = useState<string[]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todaysCheckIn = getTodaysCheckIn();

  if (todaysCheckIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>✅</Text>
          <Text style={styles.completedTitle}>Already Checked In Today!</Text>
          <Text style={styles.completedText}>
            You&apos;ve already completed your daily check-in. Come back tomorrow!
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGratitudeChange = (index: number, value: string) => {
    const newItems = [...gratitudeItems];
    newItems[index] = value;
    setGratitudeItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedMood) {
      Alert.alert('Missing Information', 'Please select how you&apos;re feeling today');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const filteredGratitude = gratitudeItems.filter(item => item.trim() !== '');
      
      await addDailyCheckIn({
        date: new Date().toISOString(),
        mood: selectedMood,
        reflection: reflection.trim(),
        gratitude: filteredGratitude,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: '',
        headerBackTitle: '',
        headerBackTitleVisible: false
      }} />
      <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <View style={styles.moodGrid}>
            {(['great', 'good', 'okay', 'struggling', 'difficult'] as Mood[]).map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodButton,
                  selectedMood === mood && styles.moodButtonSelected,
                  selectedMood === mood && { borderColor: MOOD_COLORS[mood] }
                ]}
                onPress={() => handleMoodSelect(mood)}
              >
                <Text style={styles.moodEmoji}>{MOOD_EMOJIS[mood]}</Text>
                <Text style={[
                  styles.moodText,
                  selectedMood === mood && styles.moodTextSelected
                ]}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reflection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Reflection (Optional)</Text>
          <TextInput
            style={styles.reflectionInput}
            placeholder="How was your day? Any challenges or victories?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={reflection}
            onChangeText={setReflection}
            textAlignVertical="top"
          />
        </View>

        {/* Gratitude */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are you grateful for? (Optional)</Text>
          {gratitudeItems.map((item, index) => (
            <View key={index} style={styles.gratitudeItem}>
              <Text style={styles.gratitudeNumber}>{index + 1}.</Text>
              <TextInput
                style={styles.gratitudeInput}
                placeholder="Add something you're grateful for..."
                placeholderTextColor="#9CA3AF"
                value={item}
                onChangeText={(value) => handleGratitudeChange(index, value)}
              />
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Saving...' : 'Complete Check-In'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  completedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  moodButton: {
    width: '20%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  moodButtonSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodText: {
    fontSize: 11,
    color: '#6B7280',
  },
  moodTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  reflectionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  gratitudeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gratitudeNumber: {
    fontSize: 16,
    color: '#6B46C1',
    marginRight: 12,
    width: 20,
  },
  gratitudeInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});