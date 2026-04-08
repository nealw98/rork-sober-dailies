import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Mic, BookOpen, Settings, ChevronRight, Sun, Heart, Moon, PenLine, CheckCircle, Library } from 'lucide-react-native';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';

import SobrietyCounter from '@/components/SobrietyCounter';
import { useTheme } from '@/hooks/useTheme';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';
import {
  colors,
  semanticColors,
  cardColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
  gradients,
} from '@/constants/designTokens';

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};


const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const [todaysReflection, setTodaysReflection] = useState<Reflection | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const lastDateRef = useRef<Date>(new Date());

  // Use new design token semantic colors (light mode for now)
  const sem = semanticColors.light;
  const cards = cardColors.light;
  const { open: openMenu } = useHamburgerMenu();

  // Fetch today's reflection
  const fetchReflection = useCallback(() => {
    getTodaysReflection().then(setTodaysReflection).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReflection();
  }, [fetchReflection]);

  // Update date and reflection when app comes to foreground on a new day
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const today = new Date();
        if (!isSameDay(lastDateRef.current, today)) {
          lastDateRef.current = today;
          setCurrentDate(today);
          fetchReflection();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchReflection]);

  return (
    <View style={[styles.container, { backgroundColor: sem.background }]}>
      {/* Everything scrolls together — header is just the top of the page */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentOuter}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header — gradient with watermark icon */}
        <LinearGradient
          colors={palette.gradients.header as [string, string, ...string[]]}
          style={[styles.headerGradient, { paddingTop: insets.top + 32 }]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        >
          {/* Top row — settings + menu */}
          <View style={styles.homeTopRow}>
            <TouchableOpacity
              onPress={() => router.push('/(main)/settings')}
              style={styles.homeIconBtn}
              activeOpacity={0.7}
            >
              <Settings size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Watermark icon — rotated -45deg, faded */}
          <View style={styles.watermarkContainer} pointerEvents="none">
            <Image
              source={require('@/assets/reflections_images/splash-android-icon.png')}
              style={styles.watermarkIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.sobrietyCounterContainer}>
            <SobrietyCounter />
          </View>
        </LinearGradient>

        {/* Cards area — reflection overlaps the gradient via negative margin */}
        <View style={styles.cardsContainer}>
          {/* ── Daily Reflection Card ── overlaps header gradient */}
          <TouchableOpacity
            onPress={() => router.push('/daily-reflections')}
            activeOpacity={0.85}
            style={styles.reflectionTouchable}
          >
            <ImageBackground
              source={require('@/assets/reflections_images/reflection_bg2.webp')}
              style={styles.reflectionCard}
              imageStyle={styles.reflectionImage}
              resizeMode="cover"
              blurRadius={4}
            >
              <View style={styles.reflectionOverlay}>
                <Text style={styles.categoryLabel}>TODAY'S FOCUS</Text>
                <Text style={styles.reflectionTitle}>Daily Reflection</Text>
                <Text style={styles.reflectionQuote} numberOfLines={4}>
                  {todaysReflection?.homeQuote
                    ? `"${todaysReflection.homeQuote}"`
                    : 'Loading...'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>Read More</Text>
                  <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

        {/* ── AI Sponsor Card ── */}
        <TouchableOpacity
          onPress={() => router.push('/(main)/chat')}
          activeOpacity={0.85}
          style={[styles.card, { backgroundColor: cards.sponsor }]}
        >
          <View style={styles.categoryRow}>
            <MessageCircle size={16} color="#3B7E7F" />
            <Text style={[styles.categoryLabelDark, { color: '#3B7E7F' }]}>
              AI COMPANION
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: '#256263' }]}>AI Sponsor</Text>
          <Text style={[styles.cardSubtitle, { color: '#3B7E7F' }]}>
            Always here to listen, guide, and support your step work in real-time.
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardFooterText, { color: colors.secondaryExtraDark }]}>Talk</Text>
            <ChevronRight size={18} color={colors.secondaryExtraDark} strokeWidth={1.5} />
          </View>
        </TouchableOpacity>

        {/* ── AA Speakers Card ── */}
        <TouchableOpacity
          onPress={() => router.push('/(main)/speakers')}
          activeOpacity={0.85}
          style={[styles.card, { backgroundColor: cards.speakers }]}
        >
          <View style={styles.categoryRow}>
            <Mic size={16} color={colors.tertiaryDark} />
            <Text style={[styles.categoryLabelDark, { color: colors.tertiaryDark }]}>
              FEATURED
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.tertiaryExtraDark }]}>AA Speakers</Text>
          <Text style={[styles.cardSubtitle, { color: colors.tertiaryDark }]}>
            Listen to inspiring stories of recovery from fellow members.
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardFooterText, { color: colors.tertiaryExtraDark }]}>Listen</Text>
            <ChevronRight size={18} color={colors.tertiaryExtraDark} strokeWidth={1.5} />
          </View>
        </TouchableOpacity>

        {/* ── Daily Habits Section ── */}
        <Text style={[styles.sectionLabel, { color: sem.textMuted }]}>DAILY HABITS</Text>

        {/* Row 1: Morning Prayer + Gratitude */}
        <View style={styles.ritualRow}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/prayers?prayer=morning')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <Sun size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Morning Prayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/gratitude')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <Heart size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Gratitude List</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Evening Prayer + Nightly Review */}
        <View style={styles.ritualRow}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/prayers?prayer=evening')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <Moon size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Evening Prayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/evening-review')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <PenLine size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Nightly Review</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: Prayers + Spot Check */}
        <View style={styles.ritualRow}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/prayers')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <BookOpen size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Prayers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/inventory')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <CheckCircle size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Spot Check</Text>
          </TouchableOpacity>
        </View>

        {/* Row 4: Literature */}
        <View style={styles.ritualRow}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/literature')}
            activeOpacity={0.85}
            style={[styles.ritualCard, { backgroundColor: cards.ritual, borderColor: colors.secondaryLight }]}
          >
            <View style={styles.ritualIcon}>
              <Library size={24} color={colors.secondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.ritualTitle, { color: sem.text }]}>Literature</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

          {/* Bottom padding */}
          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Home top row
  homeTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  homeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header — extra bottom padding so the reflection card can overlap into it
  headerGradient: {
    paddingBottom: 56, // extra space for the reflection card to pull up into
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermarkIcon: {
    width: 700,
    height: 700,
    opacity: 0.03,
    transform: [{ rotate: '-30deg' }],
  },
  sobrietyCounterContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  scrollView: {
    flex: 1,
  },
  scrollContentOuter: {
    // no padding here — the gradient fills edge-to-edge
  },
  cardsContainer: {
    marginTop: -40, // pull up to overlap the header gradient
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // ── Daily Reflection ──
  reflectionTouchable: {
    // overlap handled by cardsContainer marginTop
  },
  reflectionCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.softUI,
  },
  reflectionImage: {
    borderRadius: radii.lg,
  },
  reflectionOverlay: {
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: 'transparent',
  },
  reflectionTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize['3xl'],
    color: colors.white,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  reflectionQuote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.white,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },

  // ── Shared Card ──
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.softUI,
  },

  // ── Category Label ──
  categoryLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  categoryLabelDark: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginLeft: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  // ── Card Typography ──
  cardTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize['3xl'],
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // ── Card Footer ──
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  cardFooterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Featured Speaker ──
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tertiaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  featuredSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: 2,
  },


  // ── Section Label ──
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // ── Ritual Cards ──
  ritualRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ritualCard: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.softUI,
  },
  ritualIcon: {
    marginBottom: spacing.sm,
  },
  ritualTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
});

export default HomeScreen;
