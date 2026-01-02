import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform, Share } from "react-native";
import { ChevronLeft, ChevronRight, Calendar, Upload, Bookmark, BookmarkCheck, List, X, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from "@/constants/colors";
import TextSettingsButton from "@/components/TextSettingsButton";
import { getReflectionForDate } from "@/constants/reflections";
import { Reflection } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";
import { recordDailyReflectionDay } from "@/lib/reviewPrompt";
import { useDailyReflectionBookmarks } from "@/hooks/use-daily-reflection-bookmarks";

interface DailyReflectionProps {
  fontSize?: number;
  lineHeight?: number;
  jumpToDate?: Date | null;
  onJumpApplied?: () => void;
}

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

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

export default function DailyReflection({ fontSize = 18, lineHeight, jumpToDate = null, onJumpApplied }: DailyReflectionProps) {
  const effectiveLineHeight = lineHeight ?? fontSize * 1.375;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const { toggleBookmark, isBookmarked, bookmarks, removeBookmark } = useDailyReflectionBookmarks();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const dateKey = formatDateKey(selectedDate);
  const bookmarked = isBookmarked(dateKey);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [dateString, setDateString] = useState<string>("");
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Track the last date we showed when the component was focused
  const lastShownDateRef = useRef<Date>(new Date());

  // Preserve user's selection; do not reset to today on focus
  useFocusEffect(
    useCallback(() => {
      lastShownDateRef.current = selectedDate;
      return () => {};
    }, [])
  );

  useEffect(() => {
    updateReflection(selectedDate);
  }, [selectedDate]);

  // Apply external jump requests
  useEffect(() => {
    if (jumpToDate) {
      setSelectedDate(jumpToDate);
      onJumpApplied?.();
    }
  }, [jumpToDate, onJumpApplied]);

  useEffect(() => {
    recordDailyReflectionDay(selectedDate).catch((error) => {
      console.warn('[reviewPrompt] Failed to record daily reflection day', error);
    });
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
      

    } catch (error) {
      console.error('Error updating reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const shareReflection = async () => {
    if (!reflection) return;
    
    try {
      const shareContent = `${reflection.title}\n\n"${reflection.quote}"\n\n${reflection.source}\n\n${reflection.reflection}\n\nMeditation:\n${reflection.thought}`;
      
      await Share.share({
        message: shareContent,
        title: reflection.title
      });
    } catch (error) {
      console.error('Error sharing reflection:', error);
    }
  };

  const toggleBookmarkForDay = () => {
    if (!reflection || !dateString) return;
    toggleBookmark({
      id: dateKey,
      displayDate: dateString,
      title: reflection.title,
      quote: reflection.quote,
      source: reflection.source,
      reflection: reflection.reflection,
      thought: reflection.thought,
      timestamp: Date.now(),
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prevDate => {
      const updatedDate = new Date(prevDate);
      if (direction === 'prev') {
        updatedDate.setDate(updatedDate.getDate() - 1);
      } else {
        updatedDate.setDate(updatedDate.getDate() + 1);
      }
      lastShownDateRef.current = updatedDate; // Update the ref when user navigates
      return updatedDate;
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // Close regardless, but only apply when user confirms selection
      setShowDatePicker(false);
      if (event?.type !== 'set') return;
    }
    if (date) {
      setSelectedDate(date);
      lastShownDateRef.current = date; // Update the ref when date changes
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
    setCalendarDate(prevDate => {
      const updatedDate = new Date(prevDate);
      if (direction === 'prev') {
        updatedDate.setMonth(updatedDate.getMonth() - 1);
      } else {
        updatedDate.setMonth(updatedDate.getMonth() + 1);
      }
      return updatedDate;
    });
  };

  const selectCalendarDay = (date: Date) => {
    setSelectedDate(date);
    lastShownDateRef.current = date; // Update the ref when user picks a date
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

  // Format month and day for the calendar-style header
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const dayNumber = selectedDate.getDate();

  return (
    <View style={styles.container}>
      {/* Gradient header block */}
      <LinearGradient
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top row with back button and text settings */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TextSettingsButton compact light />
        </View>
        
        <Text style={styles.headerTitle}>Daily Reflections</Text>
      </LinearGradient>
      
      {/* Off-white content area */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Calendar-style date picker with navigation */}
        <View style={styles.datePickerRow}>
          <TouchableOpacity 
            onPress={() => navigateDate('prev')} 
            style={styles.navArrowButton}
            testID="prev-day-button"
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronLeft size={28} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={openDatePicker}
            style={styles.calendarBox}
            testID="calendar-button"
            activeOpacity={0.8}
          >
            <Text style={styles.calendarMonth}>{monthName}</Text>
            <View style={styles.calendarDayBox}>
              <Text style={styles.calendarDay}>{dayNumber}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigateDate('next')} 
            style={styles.navArrowButton}
            testID="next-day-button"
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronRight size={28} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Action buttons row */}
        <View style={styles.actionRow}>
          {/* Left side - bookmarks list */}
          <TouchableOpacity
            onPress={() => setShowBookmarks(true)}
            style={styles.actionButton}
            testID="bookmarks-list-button"
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <List size={22} color={Colors.light.muted} />
          </TouchableOpacity>
          
          {/* Right side - bookmark and share */}
          <View style={styles.rightActions}>
            <TouchableOpacity
              onPress={toggleBookmarkForDay}
              style={styles.actionButton}
              testID="bookmark-button"
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              {bookmarked ? (
                <BookmarkCheck size={22} color={Colors.light.muted} fill={Colors.light.muted} />
              ) : (
                <Bookmark size={22} color={Colors.light.muted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={shareReflection} 
              style={styles.actionButton} 
              testID="share-button"
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Upload size={22} color={Colors.light.muted} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.title}>{reflection.title}</Text>
          <Text style={[styles.quote, { fontSize, lineHeight: effectiveLineHeight }]}>"{reflection.quote}"</Text>
          <Text style={[styles.source, { fontSize: fontSize * 0.75 }]}>{reflection.source}</Text>
          
          <View style={styles.divider} />
          
          <Text style={[styles.reflectionText, { fontSize, lineHeight: effectiveLineHeight }]}>{reflection.reflection}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.thoughtTitle}>Meditation:</Text>
          <Text style={[styles.thought, { fontSize, lineHeight: effectiveLineHeight }]}>{reflection.thought}</Text>
        </View>

        <View style={styles.copyrightContainer}>
          <Text style={[styles.copyrightText, { fontSize: fontSize * 0.75 }]}>
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

      {/* Bookmarks List Modal */}
      <Modal
        visible={showBookmarks}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookmarks(false)}
      >
        <View style={styles.bookmarksModalOverlay}>
          <View style={styles.bookmarksModalContent}>
            <View style={styles.bookmarksModalHeader}>
              <Text style={styles.bookmarksModalTitle}>Saved Reflections</Text>
              <TouchableOpacity
                onPress={() => setShowBookmarks(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bookmarksList}>
              {bookmarks.length === 0 ? (
                <View style={styles.emptyBookmarks}>
                  <Bookmark size={40} color={Colors.light.muted} />
                  <Text style={styles.emptyBookmarksText}>No saved reflections yet</Text>
                  <Text style={styles.emptyBookmarksSubtext}>Tap the bookmark icon to save a reflection</Text>
                </View>
              ) : (
                bookmarks.map((bookmark) => (
                  <TouchableOpacity
                    key={bookmark.id}
                    style={styles.bookmarkItem}
                    onPress={() => {
                      const [year, month, day] = bookmark.id.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      setSelectedDate(date);
                      setShowBookmarks(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bookmarkItemContent}>
                      <Text style={styles.bookmarkItemDate}>{bookmark.displayDate}</Text>
                      <Text style={styles.bookmarkItemTitle} numberOfLines={1}>{bookmark.title}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeBookmark(bookmark.id)}
                      style={styles.bookmarkDeleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={18} color={Colors.light.muted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  navArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8e9eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBox: {
    alignItems: 'center',
  },
  calendarMonth: {
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
    color: '#666',
    letterSpacing: 1,
    marginBottom: 4,
  },
  calendarDayBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calendarDay: {
    fontSize: 28,
    fontWeight: adjustFontWeight('300'),
    color: Colors.light.tint,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  card: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: '#000',
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  quote: {
    fontSize: 16,
    fontStyle: "italic",
    color: '#000',
    marginBottom: 8,
    lineHeight: 22,
    textAlign: "center",
  },
  source: {
    fontSize: 12,
    color: '#555',
    textAlign: "right",
    marginBottom: 16,
    fontWeight: adjustFontWeight("500"),
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  reflectionText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  thoughtTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("bold", true),
    color: '#000',
    marginBottom: 8,
  },
  thought: {
    fontSize: 16,
    color: '#000',
    fontStyle: "italic",
    lineHeight: 22,
  },
  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: '#666',
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
  // Bookmarks Modal styles
  bookmarksModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bookmarksModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  bookmarksModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  bookmarksModalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#000',
  },
  bookmarksList: {
    paddingHorizontal: 16,
  },
  emptyBookmarks: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyBookmarksText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    marginTop: 16,
  },
  emptyBookmarksSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookmarkItemContent: {
    flex: 1,
  },
  bookmarkItemDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bookmarkItemTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
  },
  bookmarkDeleteButton: {
    padding: 8,
  },
});