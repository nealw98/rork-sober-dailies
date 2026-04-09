import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Platform, Share, AppState, AppStateStatus, ImageBackground, Dimensions, PanResponder } from "react-native";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

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

const HERO_HEIGHT = 400;

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

  const isToday = isSameDay(selectedDate, new Date());

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 50 && Math.abs(gestureState.dy) < 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 3;
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
      {/* ── Floating Pill Nav — sticky at top ── */}
      <View style={[styles.pillWrapper, { top: insets.top + 8 }]}>
        <BlurView intensity={40} tint="extraLight" style={styles.pillBar}>
          {/* Jewel edge catch light */}
          <View style={styles.pillBorderOverlay} />

          {/* Left: Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.pillBtn} activeOpacity={0.7}>
            <ChevronLeft size={20} color={sem.text} strokeWidth={2} />
          </TouchableOpacity>

          {/* Center: Nav cluster */}
          <View style={styles.pillNavCluster}>
            <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.pillNavArrow} activeOpacity={0.7}>
              <ChevronLeft size={16} color={sem.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7} style={styles.pillDateBtn}>
              <Text style={[styles.pillDateText, { color: sem.text }]}>{monthDay}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateDate('next')} style={styles.pillNavArrow} activeOpacity={0.7}>
              <ChevronRight size={16} color={sem.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Right: Share */}
          <TouchableOpacity onPress={shareReflection} style={styles.pillBtn} activeOpacity={0.7}>
            <Upload size={18} color={sem.text} strokeWidth={2} />
          </TouchableOpacity>
        </BlurView>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} {...panResponder.panHandlers}>

        {/* ── Full-Bleed Hero Image ── */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={require('@/assets/reflections_images/reflection_bg7.webp')}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'transparent', sem.background]}
              locations={[0, 0.6, 1]}
              style={styles.heroFade}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </ImageBackground>
        </View>

        {/* Title — first element on white background */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{reflection.title.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())}</Text>
        </View>

        {/* Decorative separator */}
        <View style={styles.titleSeparator}>
          <View style={styles.titleSeparatorLine} />
        </View>

        {/* ── Content ── */}
        <View style={styles.contentCard}>
          {/* Quote */}
          <View style={styles.quoteBlock}>
            <View style={styles.quoteBorder} />
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

  // ── Floating Pill Nav ──
  pillWrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 9999,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    overflow: 'hidden',
  },
  pillBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  pillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNavCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillNavArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDateBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillDateText: {
    fontFamily: 'WixMadeforDisplay_500Medium',
    fontSize: fontSizeTokens.base,
    color: semanticColors.light.text,
  },

  // ── Full-Bleed Hero ──
  heroContainer: {
    height: HERO_HEIGHT,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    height: HERO_HEIGHT,
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.5,
  },

  // ── Title ──
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: 32,
    paddingBottom: 0,
  },
  title: {
    fontFamily: 'WixMadeforDisplay_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    color: '#1A5254',
  },
  titleSeparator: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  titleSeparatorLine: {
    width: 40,
    height: 1,
    backgroundColor: '#E5E2D9',
  },

  // ── Content ──
  contentCard: {
    paddingHorizontal: spacing.lg,
  },
  quoteBlock: {
    flexDirection: 'row',
    paddingLeft: spacing.sm,
    marginBottom: 0,
  },
  quoteBorder: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#2E7A7B',
    marginRight: spacing.md,
  },
  quoteText: {
    flex: 1,
    fontFamily: 'WixMadeforText_400Regular_Italic',
  },
  source: {
    textAlign: 'left',
    paddingLeft: spacing.sm + 3 + spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontFamily: 'WixMadeforText_500Medium',
  },
  divider: {
    height: 1,
  },
  reflectionText: {
    marginVertical: spacing.lg,
    fontFamily: 'WixMadeforText_400Regular',
  },
  meditationTile: {
    backgroundColor: '#FDFCF8',
    borderRadius: radii.lg,
    padding: 20,
    marginTop: spacing.sm,
  },
  thoughtTitle: {
    fontFamily: 'WixMadeforDisplay_500Medium',
    fontSize: fontSizeTokens.lg,
    marginBottom: spacing.sm,
    color: '#2E7A7B',
  },
  thought: {
    fontFamily: 'WixMadeforText_400Regular_Italic',
  },
  copyrightContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'WixMadeforText_400Regular',
    color: 'rgba(0, 0, 0, 0.4)',
    lineHeight: 14,
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
