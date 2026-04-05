import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform, Share, AppState, AppStateStatus, ImageBackground, Dimensions, PanResponder } from "react-native";
import { Home, ChevronLeft, ChevronRight, Upload, X, Menu } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from "@/constants/colors";
import { getReflectionForDate } from "@/constants/reflections";
import { Reflection } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";
import { recordDailyReflectionDay } from "@/lib/reviewPrompt";
import { useTheme } from "@/hooks/useTheme";
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize as fontSizeTokens,
  shadows,
} from '@/constants/designTokens';

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
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysFromPrevMonth = firstDayOfWeek;
  const daysInMonth = lastDay.getDate();
  const totalDays = daysFromPrevMonth + daysInMonth;
  const rows = Math.ceil(totalDays / 7);
  const totalCells = rows * 7;
  const days = [];

  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();

  for (let i = 0; i < daysFromPrevMonth; i++) {
    const day = prevMonthDays - daysFromPrevMonth + i + 1;
    days.push({ date: new Date(year, month - 1, day), day, currentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), day: i, currentMonth: true });
  }
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({ date: new Date(year, month + 1, i), day: i, currentMonth: false });
  }
  return days;
};

const HERO_HEIGHT = 340;

export default function DailyReflection({ fontSize = 18, lineHeight, jumpToDate = null, onJumpApplied }: DailyReflectionProps) {
  const effectiveLineHeight = lineHeight ?? fontSize * 1.5;
  const { palette } = useTheme();
  const sem = semanticColors.light;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dateString, setDateString] = useState<string>("");
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastShownDateRef = useRef<Date>(new Date());
  const { open: openMenu } = useHamburgerMenu();

  // Swipe left/right to navigate days
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          navigateDate('prev');
        } else if (gestureState.dx < -50) {
          navigateDate('next');
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      lastShownDateRef.current = selectedDate;
      return () => {};
    }, [])
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const today = new Date();
        if (!isSameDay(selectedDate, today)) {
          setSelectedDate(today);
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
  }, [selectedDate]);

  useEffect(() => { updateReflection(selectedDate); }, [selectedDate]);

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
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
      await Share.share({ message: shareContent, title: reflection.title });
    } catch (error) {
      console.error('Error sharing reflection:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prevDate => {
      const updatedDate = new Date(prevDate);
      if (direction === 'prev') {
        updatedDate.setDate(updatedDate.getDate() - 1);
      } else {
        updatedDate.setDate(updatedDate.getDate() + 1);
      }
      lastShownDateRef.current = updatedDate;
      return updatedDate;
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type !== 'set') return;
    }
    if (date) {
      setSelectedDate(date);
      lastShownDateRef.current = date;
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const openDatePicker = () => {
    setCalendarDate(new Date(selectedDate));
    setShowDatePicker(true);
  };

  const closeDatePicker = () => { setShowDatePicker(false); };

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
    lastShownDateRef.current = date;
    closeDatePicker();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: palette.muted }]}>Loading reflection...</Text>
      </View>
    );
  }

  if (!reflection) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: palette.muted }]}>Unable to load reflection</Text>
      </View>
    );
  }

  // Format display values
  const monthDay = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const dayNumber = selectedDate.getDate();

  const renderCalendarView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthYear = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <View style={[styles.calendarContainer, { backgroundColor: palette.background }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeCalendarMonth('prev')} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <ChevronLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthYear, { color: sem.text }]}>{monthYear}</Text>
          <TouchableOpacity onPress={() => changeCalendarMonth('next')} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <ChevronRight size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => (
            <Text key={index} style={[styles.weekDayText, { color: sem.textMuted }]}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysContainer}>
          {calendarDays.map((item, index) => {
            const isSelected = selectedDate.getDate() === item.date.getDate() && selectedDate.getMonth() === item.date.getMonth() && selectedDate.getFullYear() === item.date.getFullYear();
            const isToday = new Date().getDate() === item.date.getDate() && new Date().getMonth() === item.date.getMonth() && new Date().getFullYear() === item.date.getFullYear();
            const isTodayAndSelected = isToday && isSelected;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  !item.currentMonth && styles.otherMonthDay,
                  isSelected && !isToday && { backgroundColor: colors.primary, borderRadius: 20 },
                  isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary, borderRadius: 20 },
                  isTodayAndSelected && { backgroundColor: colors.primary, borderRadius: 20, borderWidth: 2, borderColor: 'white' }
                ]}
                onPress={() => selectCalendarDay(item.date)}
                activeOpacity={0.7}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={[
                  styles.dayText,
                  { color: sem.text },
                  !item.currentMonth && { color: sem.textMuted, opacity: 0.4 },
                  (isSelected || isTodayAndSelected) && { color: 'white', fontWeight: '600' },
                  isToday && !isSelected && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.calendarFooter}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: sem.surface }]}
            onPress={() => { const today = new Date(); setSelectedDate(today); setCalendarDate(today); closeDatePicker(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.todayButtonText, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: sem.surface }]}
            onPress={closeDatePicker}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: sem.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: sem.background }]}>
      {/* Fixed header bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.push('/(main)/')} style={styles.headerBtn} activeOpacity={0.7}>
          <Home size={20} color={sem.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareReflection} activeOpacity={0.6} style={styles.headerBtn}>
            <Upload size={20} color={sem.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMenu} activeOpacity={0.6} style={styles.headerBtn}>
            <Menu size={20} color={sem.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} {...panResponder.panHandlers}>

        {/* ── Hero Image ── */}
        <ImageBackground
          source={require('@/assets/reflections_images/reflection_bg2.webp')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          {/* Bottom fade + title overlaid on image */}
          <LinearGradient
            colors={['transparent', 'transparent', sem.background]}
            locations={[0, 0.6, 1]}
            style={styles.heroFade}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View style={styles.metaRow}>
              <Text style={styles.title}>{reflection.title}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Date + calendar picker */}
        <TouchableOpacity onPress={openDatePicker} style={styles.dateRow} activeOpacity={0.7}>
          <Text style={[styles.dateLabel, { color: sem.textSecondary }]}>{monthDay.toUpperCase()}</Text>
          <ChevronRight size={14} color={sem.textMuted} />
        </TouchableOpacity>

        {/* ── Content Card ── */}
        <View style={styles.contentCard}>
          <View style={[styles.divider, { backgroundColor: sem.border }]} />

          {/* Quote */}
          <View style={styles.quoteBlock}>
            <View style={[styles.quoteBorder, { backgroundColor: colors.primary }]} />
            <Text style={[styles.quoteText, { fontSize, lineHeight: effectiveLineHeight, color: sem.textSecondary }]}>
              "{reflection.quote}"
            </Text>
          </View>

          <Text style={[styles.source, { fontSize: fontSize * 0.75, color: sem.textMuted }]}>{reflection.source}</Text>

          {/* Reflection body */}
          <Text style={[styles.reflectionText, { fontSize, lineHeight: effectiveLineHeight, color: sem.text }]}>
            {reflection.reflection}
          </Text>

          <View style={[styles.divider, { backgroundColor: sem.border }]} />

          {/* Meditation */}
          <View style={[styles.meditationTile, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.thoughtTitle, { color: sem.text }]}>Meditation:</Text>
            <Text style={[styles.thought, { fontSize, lineHeight: effectiveLineHeight, color: sem.text }]}>
              {reflection.thought}
            </Text>
          </View>
        </View>

        <View style={styles.copyrightContainer}>
          <Text style={[styles.copyrightText, { fontSize: fontSize * 0.75, color: sem.textMuted }]}>
            Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={closeDatePicker}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDatePicker}>
          <View style={[styles.modalContent, { backgroundColor: sem.background }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalInnerContent}>
              {Platform.OS === 'ios' ? renderCalendarView() : (
                showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={handleDateChange} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // ── Hero Image ──
  heroImage: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },

  // ── Meta / Date + Title ── overlaid on the fade
  metaRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  dateLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSizeTokens.xs,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizeTokens['4xl'],
    letterSpacing: -0.5,
    marginBottom: spacing.md,
    color: colors.white,
  },

  // ── Content ──
  contentCard: {
    paddingHorizontal: spacing.lg,
  },
  quoteBlock: {
    flexDirection: 'row',
    marginVertical: spacing.lg,
  },
  quoteBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  quoteText: {
    flex: 1,
    fontStyle: 'italic',
  },
  source: {
    textAlign: 'right',
    marginBottom: spacing.lg,
    fontFamily: fontFamily.medium,
  },
  divider: {
    height: 1,
  },
  reflectionText: {
    marginVertical: spacing.lg,
  },
  meditationTile: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  thoughtTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizeTokens.lg,
    marginBottom: spacing.sm,
  },
  thought: {
    fontStyle: 'italic',
  },
  copyrightContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  copyrightText: {
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },

  // ── Calendar Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalInnerContent: {
    width: '100%',
  },
  calendarContainer: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 16,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  todayButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
  },
  cancelButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },

  // ── Bookmarks Modal ──
  bookmarksModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bookmarksModalContent: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  bookmarksModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  bookmarksModalTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
  },
  bookmarksList: {
    paddingHorizontal: spacing.md,
  },
  emptyBookmarks: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyBookmarksText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    marginTop: spacing.md,
  },
  emptyBookmarksSubtext: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  bookmarkItemContent: {
    flex: 1,
  },
  bookmarkItemDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  bookmarkItemTitle: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
  },
  bookmarkDeleteButton: {
    padding: spacing.sm,
  },
});
