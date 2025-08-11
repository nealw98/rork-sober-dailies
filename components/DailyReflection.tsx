import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform, Share } from "react-native";
import { BookmarkIcon, ChevronLeft, ChevronRight, Calendar, Upload } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from "@/constants/colors";
import { getReflectionForDate } from "@/constants/reflections";
import { Reflection } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";

// Helper to generate calendar grid
const generateCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDay.getDay();
  
  // Calculate how many days to show from the previous month
  const daysFromPrevMonth = firstDayOfWeek;
  
  // Calculate total days in the current month
  const daysInMonth = lastDay.getDate();
  
  // Calculate how many rows we need (including days from prev/next months)
  const totalDays = daysFromPrevMonth + daysInMonth;
  const rows = Math.ceil(totalDays / 7);
  const totalCells = rows * 7;
  
  // Generate calendar days array
  const days = [];
  
  // Previous month days
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  
  for (let i = 0; i < daysFromPrevMonth; i++) {
    const day = prevMonthDays - daysFromPrevMonth + i + 1;
    days.push({
      date: new Date(year, month - 1, day),
      day,
      currentMonth: false,
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      day: i,
      currentMonth: true,
    });
  }
  
  // Next month days
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      day: i,
      currentMonth: false,
    });
  }
  
  return days;
};

export default function DailyReflection() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dateString, setDateString] = useState<string>("");
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    updateReflection(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (showDatePicker) {
      setCalendarDays(generateCalendarDays(calendarDate));
    }
  }, [showDatePicker, calendarDate]);

  const updateReflection = async (date: Date) => {
    setIsLoading(true);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setDateString(date.toLocaleDateString(undefined, options));
    
    try {
      const dateReflection = await getReflectionForDate(date);
      setReflection(dateReflection);
      
      // Check if this reflection is a favorite
      checkIfFavorite(dateReflection.title);
    } catch (error) {
      console.error('Error updating reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfFavorite = async (title: string) => {
    try {
      const favorites = await AsyncStorage.getItem('aa-favorites');
      if (favorites) {
        const favoritesArray = JSON.parse(favorites) as string[];
        setIsFavorite(favoritesArray.includes(title));
      }
    } catch (error) {
      console.error("Error checking favorites:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!reflection) return;
    
    try {
      const favorites = await AsyncStorage.getItem('aa-favorites');
      let favoritesArray: string[] = [];
      
      if (favorites) {
        favoritesArray = JSON.parse(favorites);
      }
      
      if (isFavorite) {
        // Remove from favorites
        favoritesArray = favoritesArray.filter(title => title !== reflection.title);
      } else {
        // Add to favorites
        favoritesArray.push(reflection.title);
      }
      
      await AsyncStorage.setItem('aa-favorites', JSON.stringify(favoritesArray));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const shareReflection = async () => {
    if (!reflection) return;
    
    try {
      const shareContent = `${reflection.title}\n\n"${reflection.quote}"\n${reflection.source}\n\n${reflection.reflection}\n\nMeditation:\n${reflection.thought}`;
      
      await Share.share({
        message: shareContent,
        title: reflection.title,
      });
    } catch (error) {
      console.error('Error sharing reflection:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const openDatePicker = () => {
    setCalendarDate(new Date(selectedDate));
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const changeCalendarMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  const selectCalendarDay = (date: Date) => {
    setSelectedDate(date);
    closeDatePicker();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reflection...</Text>
      </View>
    );
  }

  if (!reflection) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Unable to load reflection</Text>
      </View>
    );
  }

  const renderCalendarView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthYear = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            onPress={() => changeCalendarMonth('prev')} 
            testID="prev-month"
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronLeft size={24} color={Colors.light.tint} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthYear}>{monthYear}</Text>
          <TouchableOpacity 
            onPress={() => changeCalendarMonth('next')} 
            testID="next-month"
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronRight size={24} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.daysContainer}>
          {calendarDays.map((item, index) => {
            const isSelected = 
              selectedDate.getDate() === item.date.getDate() && 
              selectedDate.getMonth() === item.date.getMonth() && 
              selectedDate.getFullYear() === item.date.getFullYear();
            
            const isToday = 
              new Date().getDate() === item.date.getDate() && 
              new Date().getMonth() === item.date.getMonth() && 
              new Date().getFullYear() === item.date.getFullYear();
            
            const isTodayAndSelected = isToday && isSelected;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  !item.currentMonth && styles.otherMonthDay,
                  isSelected && !isToday && styles.selectedDay,
                  isToday && !isSelected && styles.todayDay,
                  isTodayAndSelected && styles.todaySelectedDay
                ]}
                onPress={() => selectCalendarDay(item.date)}
                testID={`calendar-day-${item.day}`}
                activeOpacity={0.7}
                // Add hitSlop to improve touch target area
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text 
                  style={[
                    styles.dayText,
                    !item.currentMonth && styles.otherMonthDayText,
                    isSelected && !isToday && styles.selectedDayText,
                    isToday && !isSelected && styles.todayText,
                    isTodayAndSelected && styles.todaySelectedText
                  ]}
                >
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.calendarFooter}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => {
              const today = new Date();
              setSelectedDate(today);
              setCalendarDate(today);
              closeDatePicker();
            }}
            testID="today-button"
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={closeDatePicker}
            testID="cancel-button"
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>{dateString}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={shareReflection} 
              style={styles.actionButton} 
              testID="share-button"
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Upload size={22} color={Colors.light.muted} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={toggleFavorite} 
              style={styles.actionButton} 
              testID="favorite-button"
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <BookmarkIcon size={24} color={isFavorite ? Colors.light.accent : Colors.light.muted} fill={isFavorite ? Colors.light.accent : "transparent"} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.card}>
          {/* Navigation at top of card */}
          <View style={styles.cardNavigationContainer}>
            <TouchableOpacity 
              onPress={() => navigateDate('prev')} 
              style={styles.cardNavButton}
              testID="prev-day-button"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={18} color={Colors.light.tint} />
              <Text style={styles.cardNavText}>Yesterday</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={openDatePicker}
              style={styles.cardDateButton}
              testID="calendar-button"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Calendar size={16} color={Colors.light.tint} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigateDate('next')} 
              style={styles.cardNavButton}
              testID="next-day-button"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.cardNavText}>Tomorrow</Text>
              <ChevronRight size={18} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardHeader}>
            <View style={styles.headerDecoration} />
          </View>
          
          <Text style={styles.title}>{reflection.title}</Text>
          <Text style={styles.quote}>"{reflection.quote}"</Text>
          <Text style={styles.source}>{reflection.source}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.reflectionText}>{reflection.reflection}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.thoughtTitle}>Meditation:</Text>
          <Text style={styles.thought}>{reflection.thought}</Text>
        </View>

        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>
            Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>



      {/* Calendar Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDatePicker}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeDatePicker}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={styles.modalInnerContent}
            >
              {Platform.OS === 'ios' ? (
                renderCalendarView()
              ) : (
                <>
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.muted,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  date: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: adjustFontWeight("500"),
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Changed from 0.4 to 0.6 (60% opacity)
    borderRadius: 16,
    padding: 24,
    paddingTop: 8, // Reduced top padding for navigation
    // Shadow removed
    marginBottom: 16,
  },
  cardNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardNavButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardNavText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight("500"),
    marginHorizontal: 2,
  },
  cardDateButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerDecoration: {
    width: 40,
    height: 3,
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: adjustFontWeight("bold", true),
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  quote: {
    fontSize: 18,
    fontStyle: "italic",
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 26,
    textAlign: "center",
  },
  source: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: "right",
    marginBottom: 16,
    fontWeight: adjustFontWeight("500"),
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    marginVertical: 16,
    opacity: 0.5,
  },
  reflectionText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
  },
  thoughtTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("bold", true),
    color: Colors.light.text,
    marginBottom: 8,
  },
  thought: {
    fontSize: 16,
    color: Colors.light.text,
    fontStyle: "italic",
    lineHeight: 24,
  },
  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  copyrightText: {
    fontSize: 11,
    color: Colors.light.muted,
    textAlign: "center",
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalInnerContent: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
  },
  modalButton: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('500'),
  },
  datePicker: {
    height: 200,
  },
  // Calendar styles
  calendarContainer: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.muted,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayButton: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  otherMonthDayText: {
    color: Colors.light.muted,
  },
  selectedDay: {
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: adjustFontWeight('600'),
  },
  todayDay: {
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderRadius: 20,
  },
  todayText: {
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('600'),
  },
  todaySelectedDay: {
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  todaySelectedText: {
    color: 'white',
    fontWeight: adjustFontWeight('600'),
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  todayButtonText: {
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('600'),
    fontSize: 16,
  },
  cancelButtonText: {
    color: Colors.light.muted,
    fontWeight: adjustFontWeight('500'),
    fontSize: 16,
  },
});