import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform, Share, AppState, AppStateStatus, ImageBackground, Animated, PanResponder } from "react-native";
import { ChevronLeft, ChevronRight, Upload, Menu } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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

const HERO_HEIGHT = 380;
const SCREEN_WIDTH = require('react-native').Dimensions.get('window').width;

export default function DailyReflection({ fontSize = 18, lineHeight, jumpToDate = null, onJumpApplied }: DailyReflectionProps) {
  const effectiveLineHeight = lineHeight ?? fontSize * 1.6;
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
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isToday = isSameDay(selectedDate, new Date());

  // Swipe left/right to navigate days with animated page-slide
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 50 && Math.abs(gestureState.dy) < 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 3;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          navigateDateAnimated('prev');
        } else if (gestureState.dx < -50) {
          navigateDateAnimated('next');
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
    if (direction === 'next' && isToday) return;
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

  const navigateDateAnimated = (direction: 'prev' | 'next') => {
    if (direction === 'next' && isToday) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Slide content out
    Animated.timing(slideAnim, {
      toValue: direction === 'prev' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigateDate(direction);
      // Reset to opposite side and slide in
      slideAnim.setValue(direction === 'prev' ? -SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.3);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNavPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateDateAnimated('prev');
  };

  const handleNavNext = () => {
    if (isToday) return;
    navigateDateAnimated('next');
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

  const renderCalendarView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthYear = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <View style={[styles.calendarContainer, { backgroundColor: palette.background }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeCalendarMonth('prev')} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <ChevronLeft size={24} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthYear, { color: sem.text }]}>{monthYear}</Text>
          <TouchableOpacity onPress={() => changeCalendarMonth('next')} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <ChevronRight size={24} color={colors.secondary} />
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
            const isCalToday = new Date().getDate() === item.date.getDate() && new Date().getMonth() === item.date.getMonth() && new Date().getFullYear() === item.date.getFullYear();
            const isTodayAndSelected = isCalToday && isSelected;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  !item.currentMonth && styles.otherMonthDay,
                  isSelected && !isCalToday && { backgroundColor: colors.tertiary, borderRadius: 20 },
                  isCalToday && !isSelected && { borderWidth: 2, borderColor: colors.secondary, borderRadius: 20 },
                  isTodayAndSelected && { backgroundColor: colors.secondary, borderRadius: 20 }
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
                  isCalToday && !isSelected && { color: colors.secondary, fontWeight: '600' }
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
            <Text style={[styles.todayButtonText, { color: colors.secondary }]}>Today</Text>
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
      <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]} showsVerticalScrollIndicator={false} {...panResponder.panHandlers}>

        {/* ── Full-Bleed Hero Image ── */}
        <ImageBackground
          source={require('@/assets/reflections_images/reflection_bg7.webp')}
          style={[styles.heroImage, { paddingTop: insets.top }]}
          resizeMode="cover"
        >
          {/* Nav icons overlaid on image */}
          <View style={styles.heroNavRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.heroNavBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="rgba(255,255,255,0.7)" style={styles.heroNavIcon} />
            </TouchableOpacity>
            <View style={styles.heroNavActions}>
              <TouchableOpacity onPress={shareReflection} activeOpacity={0.6} style={styles.heroNavBtn}>
                <Upload size={20} color="rgba(255,255,255,0.7)" style={styles.heroNavIcon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={openMenu} activeOpacity={0.6} style={styles.heroNavBtn}>
                <Menu size={20} color="rgba(255,255,255,0.7)" style={styles.heroNavIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom fade */}
          <LinearGradient
            colors={['transparent', 'transparent', sem.background]}
            locations={[0, 0.5, 1]}
            style={styles.heroFade}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </ImageBackground>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Date + Title on white background */}
          <View style={styles.dateTitleBlock}>
            <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>{monthDay.toUpperCase()}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{reflection.title}</Text>
          </View>

          {/* ── Content Card ── */}
          <View style={styles.contentCard}>
            <View style={[styles.divider, { backgroundColor: sem.border }]} />

            {/* Quote */}
            <View style={styles.quoteBlock}>
              <Text style={styles.decorativeQuoteMark}>{'\u201C'}</Text>
              <Text style={[styles.quoteText, { fontSize, lineHeight: effectiveLineHeight, color: sem.textSecondary }]}>
                {reflection.quote}
              </Text>
            </View>

            <Text style={[styles.source, { fontSize: fontSize * 0.75, color: sem.textMuted }]}>{reflection.source}</Text>

            {/* Reflection body */}
            <Text style={[styles.reflectionText, { fontSize, lineHeight: effectiveLineHeight, color: sem.text }]}>
              {reflection.reflection}
            </Text>

            <View style={[styles.divider, { backgroundColor: sem.border }]} />

            {/* Meditation */}
            <View style={styles.meditationTile}>
              <Text style={styles.thoughtTitle}>Meditation:</Text>
              <Text style={[styles.thought, { fontSize, lineHeight: effectiveLineHeight, color: sem.text }]}>
                {reflection.thought}
              </Text>
            </View>
          </View>

          <View style={styles.copyrightContainer}>
            <Text style={styles.copyrightText}>
              Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Floating Bottom Controller ── */}
      <View style={[styles.bottomBarWrapper, { paddingBottom: insets.bottom || spacing.sm }]}>
        <BlurView intensity={80} tint="light" style={styles.bottomBar}>
          <TouchableOpacity onPress={handleNavPrev} style={styles.bottomNavBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.secondaryExtraDark} strokeWidth={1.5} />
          </TouchableOpacity>

          <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7} style={styles.bottomDateBtn}>
            <Text style={styles.bottomDateText}>{monthDay}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNavNext} style={styles.bottomNavBtn} activeOpacity={0.7} disabled={isToday}>
            <ChevronRight size={22} color={colors.secondaryExtraDark} strokeWidth={1.5} style={{ opacity: isToday ? 0.2 : 1 }} />
          </TouchableOpacity>
        </BlurView>
      </View>

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

  // ── Full-Bleed Hero Image ──
  heroImage: {
    height: HERO_HEIGHT,
  },
  heroNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    zIndex: 10,
  },
  heroNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  heroNavIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.5,
  },

  // ── Date + Title ──
  dateTitleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dateLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(46, 122, 123, 0.6)',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: '#2E7A7B',
  },

  // ── Content ──
  contentCard: {
    paddingHorizontal: spacing.lg,
  },
  quoteBlock: {
    marginVertical: spacing.lg,
    paddingLeft: spacing.lg,
    position: 'relative',
  },
  decorativeQuoteMark: {
    position: 'absolute',
    top: -16,
    left: -4,
    fontSize: 80,
    fontFamily: fontFamily.serifBold,
    color: 'rgba(168, 222, 222, 0.2)',
    lineHeight: 80,
  },
  quoteText: {
    flex: 1,
    fontFamily: fontFamily.serif,
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
    backgroundColor: '#FDFCF8',
    borderRadius: radii.lg,
    padding: 20,
    marginTop: spacing.sm,
  },
  thoughtTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSizeTokens.lg,
    marginBottom: spacing.sm,
    color: '#2E7A7B',
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
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    lineHeight: 14,
  },

  // ── Floating Bottom Controller ──
  bottomBarWrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  bottomNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDateBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bottomDateText: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSizeTokens.lg,
    color: '#2E7A7B',
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
