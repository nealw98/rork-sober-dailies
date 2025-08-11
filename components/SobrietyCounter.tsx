import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Platform, TextInput, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X, Edit3 } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { formatStoredDateForDisplay, parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import Colors from '@/constants/colors';

// Custom iOS Date Picker Component
const CustomIOSDatePicker = ({ 
  selectedDate, 
  onDateChange, 
  maximumDate 
}: { 
  selectedDate: Date; 
  onDateChange: (date: Date) => void; 
  maximumDate: Date; 
}) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = maximumDate.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();
  const selectedYear = selectedDate.getFullYear();
  
  const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);
  
  const handleDateComponentChange = (component: 'month' | 'day' | 'year', value: number) => {
    let newMonth = selectedMonth;
    let newDay = selectedDay;
    let newYear = selectedYear;
    
    if (component === 'month') {
      newMonth = value;
    } else if (component === 'day') {
      newDay = value;
    } else if (component === 'year') {
      newYear = value;
    }
    
    // Adjust day if it's invalid for the new month/year
    const maxDaysInNewMonth = getDaysInMonth(newMonth, newYear);
    if (newDay > maxDaysInNewMonth) {
      newDay = maxDaysInNewMonth;
    }
    
    const newDate = new Date(newYear, newMonth, newDay);
    onDateChange(newDate);
  };
  
  const renderScrollableColumn = (
    items: (string | number)[], 
    selectedValue: string | number, 
    onSelect: (value: any) => void,
    keyPrefix: string
  ) => {
    return (
      <View style={styles.dateColumn}>
        <ScrollView 
          style={styles.dateScrollView}
          showsVerticalScrollIndicator={false}
          snapToInterval={40}
          decelerationRate="fast"
        >
          {items.map((item, index) => {
            const isSelected = item === selectedValue;
            return (
              <TouchableOpacity
                key={`${keyPrefix}-${index}`}
                style={[
                  styles.dateItem,
                  isSelected && styles.selectedDateItem
                ]}
                onPress={() => onSelect(typeof item === 'string' ? index : item)}
              >
                <Text style={[
                  styles.dateItemText,
                  isSelected && styles.selectedDateItemText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };
  
  return (
    <View style={styles.customDatePicker}>
      <View style={styles.datePickerColumns}>
        {renderScrollableColumn(
          months, 
          months[selectedMonth], 
          (monthIndex: number) => handleDateComponentChange('month', monthIndex),
          'month'
        )}
        {renderScrollableColumn(
          days, 
          selectedDay, 
          (day: number) => handleDateComponentChange('day', day),
          'day'
        )}
        {renderScrollableColumn(
          years, 
          selectedYear, 
          (year: number) => handleDateComponentChange('year', year),
          'year'
        )}
      </View>
    </View>
  );
};

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [webDateString, setWebDateString] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const formatDateInput = (text: string) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Format as MM/DD/YYYY for better user experience
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const handleWebDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setWebDateString(formatted);
  };

  const isValidDate = (dateString: string) => {
    if (Platform.OS === 'web' && dateString) {
      // Allow partial dates while typing
      if (dateString.length < 10) return true;
      
      const regex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!regex.test(dateString)) return false;
      
      const [month, day, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Check if date is valid and not in the future
      return date instanceof Date && 
             !isNaN(date.getTime()) && 
             date <= new Date() &&
             date.getFullYear() === year &&
             date.getMonth() === month - 1 &&
             date.getDate() === day &&
             month >= 1 && month <= 12 &&
             day >= 1 && day <= 31;
    }
    return true;
  };

  if (isLoading) {
    return null;
  }

  const daysSober = calculateDaysSober();

  // Ensure daysSober is a valid number
  const validDaysSober = typeof daysSober === 'number' && !isNaN(daysSober) ? daysSober : 0;

  const handleConfirmDate = () => {
    let dateString: string;
    if (Platform.OS === 'web') {
      if (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) {
        Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
        return;
      }
      // Convert MM/DD/YYYY to YYYY-MM-DD for storage
      const [month, day, year] = webDateString.split('/').map(Number);
      dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else {
      dateString = formatLocalDate(selectedDate);
    }
    setSobrietyDate(dateString);
    setShowDatePicker(false);
  };

  const handleNotNow = () => {
    dismissPrompt();
    setShowDatePicker(false);
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        // Directly save the date on Android
        const dateString = formatLocalDate(date);
        setSobrietyDate(dateString);
      } else if (event.type === 'dismissed') {
        // User cancelled - do nothing, modal will close automatically
      }
    } else if (date) {
      setSelectedDate(date);
    }
  };

  const handleAddDate = () => {
    if (Platform.OS === 'android') {
      // On Android, show date picker directly
      setShowDatePicker(true);
    } else {
      // On iOS/Web, show the date selection modal
      setShowDatePicker(true);
    }
  };

  const handleEditDate = () => {
    // Reset the date picker state
    if (sobrietyDate) {
      const currentDate = parseLocalDate(sobrietyDate);
      setSelectedDate(currentDate);
      // Format current date for web input
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const year = currentDate.getFullYear().toString();
      setWebDateString(`${month}/${day}/${year}`);
    }
    
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowEditModal(true);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setShowDatePicker(false);
  };

  const handleConfirmEditDate = () => {
    let dateString: string;
    if (Platform.OS === 'web') {
      if (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) {
        Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
        return;
      }
      // Convert MM/DD/YYYY to YYYY-MM-DD for storage
      const [month, day, year] = webDateString.split('/').map(Number);
      dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else {
      dateString = formatLocalDate(selectedDate);
    }
    setSobrietyDate(dateString);
    setShowEditModal(false);
    setShowDatePicker(false);
  };

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
        
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
        
        {showDatePicker && Platform.OS !== 'android' && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowDatePicker(false);
            }}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Select Your Sobriety Date</Text>
                
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateContainer}>
                    <TextInput
                      style={[
                        styles.webDateInput,
                        !isValidDate(webDateString) && webDateString.length === 10 && styles.webDateInputError
                      ]}
                      value={webDateString}
                      onChangeText={handleWebDateChange}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={Colors.light.muted}
                      maxLength={10}
                      keyboardType="numeric"
                      autoFocus={true}
                    />
                    {!isValidDate(webDateString) && webDateString.length === 10 && (
                      <Text style={styles.errorText}>Please enter a valid date</Text>
                    )}
                    <Text style={styles.helpText}>Enter your sobriety start date</Text>
                  </View>
                ) : (
                  <View style={styles.iosDatePickerContainer}>
                    <CustomIOSDatePicker
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      maximumDate={new Date()}
                    />
                  </View>
                )}
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.cancelButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.datePickerButton, 
                      styles.confirmDateButton,
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButton
                    ]}
                    onPress={handleConfirmDate}
                    disabled={Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString))}
                  >
                    <Text style={[
                      styles.confirmDateButtonText,
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButtonText
                    ]}>Confirm</Text>
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
        
        {/* Date picker modals for add date functionality */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
        
        {showDatePicker && Platform.OS !== 'android' && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowDatePicker(false);
            }}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Select Your Sobriety Date</Text>
                
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateContainer}>
                    <TextInput
                      style={[
                        styles.webDateInput,
                        !isValidDate(webDateString) && webDateString.length === 10 && styles.webDateInputError
                      ]}
                      value={webDateString}
                      onChangeText={handleWebDateChange}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={Colors.light.muted}
                      maxLength={10}
                      keyboardType="numeric"
                      autoFocus={true}
                    />
                    {!isValidDate(webDateString) && webDateString.length === 10 && (
                      <Text style={styles.errorText}>Please enter a valid date</Text>
                    )}
                    <Text style={styles.helpText}>Enter your sobriety start date</Text>
                  </View>
                ) : (
                  <View style={styles.iosDatePickerContainer}>
                    <CustomIOSDatePicker
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      maximumDate={new Date()}
                    />
                  </View>
                )}
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.cancelButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.datePickerButton, 
                      styles.confirmDateButton,
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButton
                    ]}
                    onPress={handleConfirmDate}
                    disabled={Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString))}
                  >
                    <Text style={[
                      styles.confirmDateButtonText,
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButtonText
                    ]}>Confirm</Text>
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
        
        {/* Edit Date Modal for Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
        
        {/* Edit Date Modal for iOS/Web */}
        {showEditModal && Platform.OS !== 'android' && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancelEdit}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Edit Your Sobriety Date</Text>
                
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateContainer}>
                    <TextInput
                      style={[
                        styles.webDateInput,
                        !isValidDate(webDateString) && webDateString.length === 10 && styles.webDateInputError
                      ]}
                      value={webDateString}
                      onChangeText={handleWebDateChange}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={Colors.light.muted}
                      maxLength={10}
                      keyboardType="numeric"
                      autoFocus={true}
                    />
                    {!isValidDate(webDateString) && webDateString.length === 10 && (
                      <Text style={styles.errorText}>Please enter a valid date</Text>
                    )}
                    <Text style={styles.helpText}>Enter your sobriety start date</Text>
                  </View>
                ) : (
                  <View style={styles.iosDatePickerContainer}>
                    <CustomIOSDatePicker
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      maximumDate={new Date()}
                    />
                  </View>
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
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButton
                    ]}
                    onPress={handleConfirmEditDate}
                    disabled={Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString))}
                  >
                    <Text style={[
                      styles.confirmDateButtonText,
                      Platform.OS === 'web' && (!webDateString || webDateString.length < 10 || !isValidDate(webDateString)) && styles.disabledButtonText
                    ]}>Save</Text>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    position: 'relative',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.light.tint,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notNowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.muted,
  },
  notNowButtonText: {
    color: Colors.light.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Date picker styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  datePicker: {
    width: '100%',
    marginBottom: 20,
  },
  iosDatePickerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  iosDatePicker: {
    width: 280,
    height: 120,
  },
  datePickerButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.muted,
  },
  cancelButtonText: {
    color: Colors.light.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  confirmDateButton: {
    backgroundColor: Colors.light.tint,
  },
  confirmDateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  editButton: {
    padding: 4,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  webDateContainer: {
    width: '100%',
    marginBottom: 20,
  },
  webDateInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.muted,
    borderRadius: 8,
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
  webDateInputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  helpText: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: Colors.light.muted,
    opacity: 0.5,
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Add Date Button styles
  addDateContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  addDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addDateMainTitle: {
    fontSize: 18,
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  addDateSubtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  addDateButton: {
    backgroundColor: 'transparent',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  addDateButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  
  // Custom date picker styles
  customDatePicker: {
    width: '100%',
    height: 200,
  },
  datePickerColumns: {
    flexDirection: 'row',
    height: '100%',
  },
  dateColumn: {
    flex: 1,
    height: '100%',
  },
  dateScrollView: {
    flex: 1,
  },
  dateItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  selectedDateItem: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  dateItemText: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  selectedDateItemText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default SobrietyCounter;