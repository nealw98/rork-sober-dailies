import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import ScreenContainer from "@/components/ScreenContainer";
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Plus, Check } from 'lucide-react-native';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

export default function GratitudeList() {
  const {
    isCompletedToday,
    getTodaysItems,
    completeToday,
    uncompleteToday,
    addItemsToToday
  } = useGratitudeStore();

  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const isCompleted = isCompletedToday();

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
    }
  };

  const handleComplete = () => {
    if (gratitudeItems.length === 0) {
      return;
    }
    setShowAlert(true);
  };

  const handleConfirmSubmit = () => {
    completeToday(gratitudeItems);
    setShowAlert(false);
    router.push('/insights');
  };

  const handleAddMore = () => {
    uncompleteToday();
    const todaysItems = getTodaysItems();
    setGratitudeItems(todaysItems);
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddGratitude();
    }
  };

  if (isCompleted) {
    return (
      <ScreenContainer style={styles.container}>
        <LinearGradient
          colors={['#E0F7FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Heart color={Colors.light.tint} size={32} />
            <Text style={styles.title}>Gratitude Complete</Text>
            <Text style={styles.description}>
              Thank you for taking time to reflect on gratitude. These moments of appreciation strengthen your recovery.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today&apos;s Gratitude</Text>
            {gratitudeItems.map((item, index) => (
              <View key={index} style={styles.gratitudeItemDisplay}>
                <Text style={styles.gratitudeItemText}>• {item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.addMoreButton} onPress={handleAddMore}>
            <Text style={styles.addMoreButtonText}>Add More Items</Text>
          </TouchableOpacity>

          <Text style={styles.privacyText}>
            Your gratitude list is stored locally on your device for privacy.
          </Text>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <LinearGradient
        colors={['#E0F7FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      <Modal
        visible={showAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>Complete Today&apos;s Gratitude List?</Text>
            <Text style={styles.alertDescription}>
              Mark today&apos;s gratitude practice as complete and view your weekly insights and progress.
            </Text>
            <View style={styles.alertButtonsContainer}>
              <TouchableOpacity 
                style={styles.alertCancelButton} 
                onPress={() => setShowAlert(false)}
              >
                <Text style={styles.alertCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.alertConfirmButton} 
                onPress={handleConfirmSubmit}
              >
                <Text style={styles.alertConfirmButtonText}>Save & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Heart color={Colors.light.tint} size={32} />
          <Text style={styles.title}>Gratitude List</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today I&apos;m grateful for:</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              onKeyPress={handleKeyPress}
              placeholder="e.g., My sobriety"
              style={styles.textInput}
              placeholderTextColor="#6c757d"
            />
            <TouchableOpacity 
              onPress={handleAddGratitude}
              disabled={!inputValue.trim()}
              style={[
                styles.addButton,
                !inputValue.trim() && styles.addButtonDisabled
              ]}
            >
              <Plus color={!inputValue.trim() ? '#6c757d' : 'white'} size={16} />
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

          {gratitudeItems.length > 0 && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Check color="white" size={16} />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.privacyText}>
          Your gratitude list is stored locally on your device for privacy.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    color: '#6c757d',
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
    color: '#6c757d',
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
  cardTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.tint,
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  gratitudeContainer: {
    marginTop: 8,
  },
  gratitudeItemContainer: {
    marginBottom: 16,
  },
  gratitudeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  gratitudeNumber: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.tint,
    marginTop: 12,
    minWidth: 20,
  },
  gratitudeInput: {
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
  removeButton: {
    padding: 8,
    marginTop: 4,
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
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#6c757d',
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
  gratitudeItemDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  gratitudeItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 8,
  },
  addMoreButton: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  addMoreButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
  },
  completeButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  completeButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: '#6c757d',
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
});