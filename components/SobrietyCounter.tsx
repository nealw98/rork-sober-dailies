import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Calendar, X, Edit3 } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { formatStoredDateForDisplay, parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import Colors from '@/constants/colors';

const SobrietyCounter = () => {
  const { 
    sobrietyDate, 
    shouldShowPrompt, 
    shouldShowAddButton,
    setSobrietyDate, 
    dismissPrompt, 
    calculateDaysSober,
    isLoading 
  } = useSobriety();
  
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dateInput, setDateInput] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const dateInputRef = React.useRef<TextInput>(null);

  // Auto-format input as user types: mm/dd/yyyy
  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const handleDateInputChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDateInput(formatted);
  };

  // Validate date: must be real date, not in future, in mm/dd/yyyy format
  const isValidDate = (dateString: string): boolean => {
    if (!dateString || dateString.length < 10) return false;
    
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const [month, day, year] = dateString.split('/').map(Number);
    
    // Check month and day ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    
    // Check if date actually exists (handles leap years, etc.)
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return false;
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) return false;
    
    return true;
  };

  const handleConfirmDate = () => {
    if (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format that is not in the future.');
      return;
    }

    // Dismiss keyboard using Keyboard API (more reliable than blur)
    Keyboard.dismiss();

    const [month, day, year] = dateInput.split('/').map(Number);
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    setSobrietyDate(dateString);
    setShowDatePicker(false);
    setDateInput('');
  };

  const handleCancel = () => {
    setShowDatePicker(false);
    setDateInput('');
  };

  const handleNotNow = () => {
    dismissPrompt();
    setShowDatePicker(false);
  };

  const handleAddDate = () => {
    setDateInput('');
    setShowDatePicker(true);
  };

  const handleEditDate = () => {
    if (sobrietyDate) {
      const currentDate = parseLocalDate(sobrietyDate);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const year = currentDate.getFullYear().toString();
      setDateInput(`${month}/${day}/${year}`);
    }
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setDateInput('');
  };

  const handleConfirmEditDate = () => {
    if (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format that is not in the future.');
      return;
    }

    // Dismiss keyboard using Keyboard API
    Keyboard.dismiss();

    const [month, day, year] = dateInput.split('/').map(Number);
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    setSobrietyDate(dateString);
    setShowEditModal(false);
    setDateInput('');
  };

  if (isLoading) {
    return null;
  }

  const daysSober = calculateDaysSober();
  const validDaysSober = typeof daysSober === 'number' && !isNaN(daysSober) ? daysSober : 0;

  // Show prompt modal for first-time users
  if (shouldShowPrompt()) {
    return (
      <>
        <Modal
          visible={!showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={handleNotNow}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleNotNow}
              >
                <X size={24} color={Colors.light.muted} />
              </TouchableOpacity>
              
              <Calendar size={48} color={Colors.light.tint} style={styles.modalIcon} />
              
              <Text style={styles.modalTitle}>Track Your Sobriety</Text>
              <Text style={styles.modalDescription}>
                Would you like to add your sobriety date to track your progress?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddDate}
                >
                  <Text style={styles.confirmButtonText}>Add Date</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.notNowButton]}
                  onPress={handleNotNow}
                >
                  <Text style={styles.notNowButtonText}>Not Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Unified Date Input Modal */}
        {showDatePicker && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancel}
          >
            <TouchableWithoutFeedback>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                  <Text style={styles.datePickerTitle}>Enter your sobriety date</Text>
                  
                  <TextInput
                    ref={dateInputRef}
                    style={[
                      styles.dateInput,
                      !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                    ]}
                    value={dateInput}
                    onChangeText={handleDateInputChange}
                    onSubmitEditing={handleConfirmDate}
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor={Colors.light.muted}
                    maxLength={10}
                    keyboardType="numeric"
                    autoFocus={true}
                  />
                  
                  {!isValidDate(dateInput) && dateInput.length === 10 && (
                    <Text style={styles.errorText}>Please enter a valid date</Text>
                  )}
                  
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={handleCancel}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.datePickerButton, 
                        styles.confirmDateButton,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButton
                      ]}
                      onPress={handleConfirmDate}
                      disabled={!dateInput || dateInput.length < 10 || !isValidDate(dateInput)}
                    >
                      <Text style={[
                        styles.confirmDateButtonText,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButtonText
                      ]}>OK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </>
    );
  }

  // Show "Add Date" button if user previously selected "Not Now"
  if (shouldShowAddButton()) {
    return (
      <View style={styles.addDateContainer}>
        <View style={styles.addDateRow}>
          <Text style={styles.addDateMainTitle}>Track your sobriety</Text>
          <TouchableOpacity 
            style={styles.addDateButton}
            onPress={handleAddDate}
          >
            <Text style={styles.addDateButtonText}>Add Date</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.addDateSubtitle}>
          See how many days you've been sober.
        </Text>
        
        {/* Unified Date Input Modal */}
        {showDatePicker && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancel}
          >
            <TouchableWithoutFeedback>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                  <Text style={styles.datePickerTitle}>Enter your sobriety date</Text>
                  
                  <TextInput
                    ref={dateInputRef}
                    style={[
                      styles.dateInput,
                      !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                    ]}
                    value={dateInput}
                    onChangeText={handleDateInputChange}
                    onSubmitEditing={handleConfirmDate}
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor={Colors.light.muted}
                    maxLength={10}
                    keyboardType="numeric"
                    autoFocus={true}
                  />
                  
                  {!isValidDate(dateInput) && dateInput.length === 10 && (
                    <Text style={styles.errorText}>Please enter a valid date</Text>
                  )}
                  
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={handleCancel}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.datePickerButton, 
                        styles.confirmDateButton,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButton
                      ]}
                      onPress={handleConfirmDate}
                      disabled={!dateInput || dateInput.length < 10 || !isValidDate(dateInput)}
                    >
                      <Text style={[
                        styles.confirmDateButtonText,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButtonText
                      ]}>OK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    );
  }

  // Show sobriety counter if date is set
  if (sobrietyDate) {
    return (
      <>
        <View style={styles.counterContainer}>
          <Text style={styles.sobrietyText}>
            {`You've been sober ${validDaysSober} ${validDaysSober === 1 ? 'day' : 'days'}`}
          </Text>
          <View style={styles.dateRow}>
            <Text style={styles.sobrietyDateText}>
              Since {formatStoredDateForDisplay(sobrietyDate)}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditDate}
            >
              <Edit3 size={14} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Edit Date Modal */}
        {showEditModal && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancelEdit}
          >
            <TouchableWithoutFeedback>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                  <Text style={styles.datePickerTitle}>Edit your sobriety date</Text>
                  
                  <TextInput
                    ref={dateInputRef}
                    style={[
                      styles.dateInput,
                      !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                    ]}
                    value={dateInput}
                    onChangeText={handleDateInputChange}
                    onSubmitEditing={handleConfirmEditDate}
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor={Colors.light.muted}
                    maxLength={10}
                    keyboardType="numeric"
                    autoFocus={true}
                  />
                  
                  {!isValidDate(dateInput) && dateInput.length === 10 && (
                    <Text style={styles.errorText}>Please enter a valid date</Text>
                  )}
                  
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.datePickerButton, 
                        styles.confirmDateButton,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButton
                      ]}
                      onPress={handleConfirmEditDate}
                      disabled={!dateInput || dateInput.length < 10 || !isValidDate(dateInput)}
                    >
                      <Text style={[
                        styles.confirmDateButtonText,
                        (!dateInput || dateInput.length < 10 || !isValidDate(dateInput)) && styles.disabledButtonText
                      ]}>OK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </>
    );
  }

  return null;
};

const styles = StyleSheet.create({

  editButton: {
    padding: 4,
  },
  addDateContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addDateMainTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addDateButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addDateSubtitle: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  // Counter display styles
  counterContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  sobrietyText: {
    fontSize: 18,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sobrietyDateText: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
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
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.light.tint,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notNowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  notNowButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 300,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    textAlign: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  dateInputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDateButton: {
    backgroundColor: Colors.light.tint,
  },
  confirmDateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.light.border,
  },
  disabledButtonText: {
    color: Colors.light.muted,
  },
});

export default SobrietyCounter;