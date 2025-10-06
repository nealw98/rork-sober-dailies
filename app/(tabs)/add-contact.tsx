import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function AddContactScreen() {
  const router = useRouter();
  const { addEmergencyContact } = useSobriety();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addEmergencyContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to add contact. Please try again.');
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
        <View style={styles.iconContainer}>
          <UserPlus size={48} color="#6B46C1" />
        </View>
        
        <Text style={styles.description}>
          Add someone you can reach out to when you need support
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="Sponsor, Friend, Family..."
              placeholderTextColor="#9CA3AF"
              value={relationship}
              onChangeText={setRelationship}
              autoCapitalize="words"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : 'Add Contact'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 18,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});