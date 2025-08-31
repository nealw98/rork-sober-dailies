import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface PageNumberInputProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pageNumber: string) => void;
}

export default function PageNumberInput({ visible, onClose, onSubmit }: PageNumberInputProps) {
  const [pageNumber, setPageNumber] = useState('');

  const handleSubmit = () => {
    onSubmit(pageNumber);
    setPageNumber('');
  };

  const handleClose = () => {
    setPageNumber('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Go to Page</Text>
          <Text style={styles.subtitle}>Enter page number (1-164 or 567-568)</Text>
          
          <TextInput
            style={styles.input}
            value={pageNumber}
            onChangeText={setPageNumber}
            keyboardType="number-pad"
            placeholder="Enter page number"
            placeholderTextColor={Colors.light.muted}
            autoFocus={true}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.goButton]}
              onPress={handleSubmit}
            >
              <Text style={[styles.buttonText, styles.goButtonText]}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.divider,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  cancelButton: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  cancelButtonText: {
    color: Colors.light.text,
  },
  goButton: {
    backgroundColor: Colors.light.tint,
  },
  goButtonText: {
    color: 'white',
  },
});
