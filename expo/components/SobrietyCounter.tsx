import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Alert, Keyboard, useWindowDimensions } from 'react-native';
import { Calendar, X, Edit3 } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { formatStoredDateForDisplay, parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import Colors from '@/constants/colors';

const SobrietyCounter = () => {
  const { width } = useWindowDimensions();
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
  const [showTotalDays, setShowTotalDays] = useState<boolean>(false);


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
    
    // Dismiss keyboard first
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
    
    // Dismiss keyboard first
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

  // Calculate years, months, and remaining days using proper date arithmetic
  const calculateBreakdown = (startDateString: string | null) => {
    if (!startDateString) {
      return { years: 0, months: 0, days: 0 };
    }
    
    const startDate = parseLocalDate(startDateString);
    const today = new Date();
    
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();
    
    // Adjust if days are negative
    if (days < 0) {
      months -= 1;
      // Get the last day of the previous month
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    // Adjust if months are negative
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    return { years, months, days };
  };

  const breakdown = calculateBreakdown(sobrietyDate);

  // Calculate responsive font size based on content length and screen width
  const getResponsiveFontSize = () => {
    if (!sobrietyDate) return 32;
    
    // Build the full text string to measure
    let fullText = '';
    if (breakdown.years > 0) {
      fullText = `${breakdown.years} ${breakdown.years === 1 ? 'year' : 'years'}`;
      if (breakdown.months > 0) {
        fullText += ` • ${breakdown.months} ${breakdown.months === 1 ? 'month' : 'months'}`;
      }
      if (breakdown.days > 0) {
        fullText += ` • ${breakdown.days} ${breakdown.days === 1 ? 'day' : 'days'}`;
      }
    } else if (breakdown.months > 0) {
      fullText = `${breakdown.months} ${breakdown.months === 1 ? 'month' : 'months'}`;
      if (breakdown.days > 0) {
        fullText += ` • ${breakdown.days} ${breakdown.days === 1 ? 'day' : 'days'}`;
      }
    } else {
      fullText = `${breakdown.days} ${breakdown.days === 1 ? 'day' : 'days'}`;
    }
    
    // More accurate character width estimation for bold text (0.55 works better)
    const availableWidth = width - 60; // Less conservative padding
    const textLength = fullText.length;
    
    // Start with 32px and scale down if needed
    let fontSize = 32;
    let estimatedWidth = textLength * fontSize * 0.55;
    
    if (estimatedWidth > availableWidth) {
      fontSize = Math.floor(availableWidth / (textLength * 0.55));
      fontSize = Math.max(fontSize, 20); // Don't go below 20px
    }
    
    return fontSize;
  };

  const dynamicFontSize = getResponsiveFontSize();

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
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Enter your sobriety date</Text>
                
                <TextInput
                  style={[
                    styles.dateInput,
                    !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                  ]}
                  value={dateInput}
                  onChangeText={handleDateInputChange}
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
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Enter your sobriety date</Text>
                
                <TextInput
                  style={[
                    styles.dateInput,
                    !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                  ]}
                  value={dateInput}
                  onChangeText={handleDateInputChange}
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
          </Modal>
        )}
      </View>
    );
  }

  // Show sobriety counter if date is set
  if (sobrietyDate) {
    return (
      <>
        <View style={styles.counterWrapper}>
          {/* Top: Sober since date with edit */}
          <View style={styles.dateRow}>
            <Text style={styles.sobrietyDateText}>
              Sober since {formatStoredDateForDisplay(sobrietyDate)}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditDate}
            >
              <Edit3 size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          
          {/* Tappable counter to toggle between breakdown and total days */}
          <TouchableOpacity 
            onPress={() => setShowTotalDays(!showTotalDays)}
            activeOpacity={0.7}
            style={styles.counterTouchable}
          >
            <View style={styles.counterBox}>
              {showTotalDays ? (
                // Total days display - stacked
                <View style={styles.totalDaysContainer}>
                  <Text style={styles.totalDaysNumber}>
                    {validDaysSober.toLocaleString()}
                  </Text>
                  <Text style={styles.totalDaysLabel}>
                    {validDaysSober === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              ) : (
                // Breakdown display - stacked with dynamic font sizes
                // Largest visible unit gets largest font, scaling down from there
                <View style={styles.stackedCounter}>
                  {breakdown.years > 0 && (
                    <Text style={styles.stackedLarge}>
                      {breakdown.years} {breakdown.years === 1 ? 'year' : 'years'}
                    </Text>
                  )}
                  {breakdown.months > 0 && (
                    <Text style={breakdown.years > 0 ? styles.stackedMedium : styles.stackedLarge}>
                      {breakdown.months} {breakdown.months === 1 ? 'month' : 'months'}
                    </Text>
                  )}
                  <Text style={
                    breakdown.years > 0 
                      ? styles.stackedSmall 
                      : breakdown.months > 0 
                        ? styles.stackedMedium 
                        : styles.stackedLarge
                  }>
                    {breakdown.days} {breakdown.days === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Edit Date Modal */}
        {showEditModal && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancelEdit}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Edit your sobriety date</Text>
                
                <TextInput
                  style={[
                    styles.dateInput,
                    !isValidDate(dateInput) && dateInput.length === 10 && styles.dateInputError
                  ]}
                  value={dateInput}
                  onChangeText={handleDateInputChange}
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
  counterWrapper: {
    alignItems: 'center',
    marginHorizontal: 20,
    height: 140,
    flexDirection: 'column',
  },
  headerLabel: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  counterTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 28,
    width: 220,
    height: 110,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pointerIcon: {
    position: 'absolute',
    top: 6,
    right: 8,
  },
  totalDaysContainer: {
    alignItems: 'center',
  },
  totalDaysNumber: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  totalDaysLabel: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  stackedCounter: {
    alignItems: 'center',
  },
  stackedLarge: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  stackedMedium: {
    fontSize: 21,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  stackedSmall: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  headerText: {
    fontSize: 16,
    color: Colors.light.muted,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
  },
  yearsText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 34,
  },
  monthsDaysText: {
    fontSize: 22,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  totalDaysText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  largeDaysText: {
    fontSize: 56,
    color: Colors.light.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 64,
  },
  daysLabelText: {
    fontSize: 24,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sobrietyText: {
    fontSize: 48,
    color: Colors.light.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 56,
  },
  dayLabel: {
    fontSize: 20,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 0,
    marginBottom: 0,
  },
  sobrietyDateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
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