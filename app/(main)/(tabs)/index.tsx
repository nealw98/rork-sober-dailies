import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { BookOpen, Check, SlidersHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, Easing } from 'react-native-reanimated';

import { colors, fontFamily, fontSize, spacing, radii, shadows, getSemanticColors } from '@/constants/designTokens';
import { ROW_TONES, resolveGlyph, resolveTone, resolveSubtitle } from '@/components/dailyTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import SobrietyCounter from '@/components/SobrietyCounter';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

// Completion is fully manual: every daily — including the notebook tools and the
// Daily Reflection — is checked off by the user via the row's checkbox, as a
// deliberate end-of-day review. Tapping a daily only opens its tool.

// action → route. null = net-new / deferred (graceful notice, no auto-complete).
const ACTION_ROUTE: Record<string, Href | null> = {
  prayerMorning: '/(main)/prayers',
  prayerEvening: '/(main)/prayers',
  gratitude: '/(main)/gratitude',
  journal: '/(main)/journal' as Href,
  spotcheck: '/(main)/inventory',
  nightly: '/(main)/evening-review',
  speaker: '/(main)/speakers',
  meditation: '/(main)/meditation',
  callAnother: '/(main)/reach-out' as Href,
  lit: '/(main)/literature',
  meeting: '/(main)/meetings',
};

// Prayer dailies open a specific prayer directly (deep link); the generic
// `prayer` action opens the library list.
const PRAYER_PARAM: Record<string, string> = {
  prayerMorning: 'morning',
  prayerEvening: 'evening',
};

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// Press-and-HOLD to COMPLETE an unchecked daily — deliberate, like a physical
// button: it depresses as you press, the hold "clicks" (haptic + pop) and
// commits, then you lift. A completed daily is un-checked with a simple TAP.
const HOLD_MS = 240;

function RightCheck({ done, color, onPress }: { done: boolean; color: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animated = useRef(false);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    animated.current = false;
    // Checked → quick tap-off depress; unchecked → arm the hold (ramp down).
    scale.value = withTiming(done ? 0.9 : 0.86, { duration: done ? 80 : HOLD_MS, easing: Easing.out(Easing.quad) });
  };

  // Hold completes an unchecked daily — the satisfying pop.
  const onHold = () => {
    if (done) return;
    animated.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withTiming(1.3, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 7, stiffness: 220, mass: 0.5 }),
    );
    onPress();
  };

  // Quick tap un-checks a completed daily.
  const onTap = () => {
    if (!done) return;
    animated.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.78, { duration: 70 }),
      withSpring(1, { damping: 9, stiffness: 220 }),
    );
    onPress();
  };

  const onPressOut = () => {
    // Nothing committed (early release / hold on a done item) — spring back.
    if (!animated.current) scale.value = withSpring(1, { damping: 13, stiffness: 240 });
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onTap}
      onLongPress={onHold}
      onPressOut={onPressOut}
      delayLongPress={HOLD_MS}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      <Animated.View
        style={[styles.check, { borderColor: done ? color : color + '70', backgroundColor: done ? color : color + '1A' }, animStyle]}
      >
        {done ? (
          <Check size={15} color="#fff" strokeWidth={3} />
        ) : (
          <View style={{ opacity: 0.4 }}>
            <Check size={14} color={color} strokeWidth={2.5} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function DailyRow({ item, done, onOpen, onToggle }: { item: DailyItem; done: boolean; onOpen: () => void; onToggle: () => void }) {
  const tone = resolveTone(item.color);
  const Glyph = resolveGlyph(item.icon);
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: done ? tone.soft : colors.white, borderColor: done ? tone.ink + '55' : '#EDEAE2' },
      ]}
    >
      <Pressable style={styles.rowMain} onPress={onOpen}>
        <View style={[styles.medallion, { backgroundColor: tone.ink, shadowColor: tone.ink }]}>
          <Glyph size={20} color="#fff" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {resolveSubtitle(item.action) ? (
            <Text style={styles.rowSub} numberOfLines={1}>{resolveSubtitle(item.action)}</Text>
          ) : null}
        </View>
      </Pressable>
      <RightCheck done={done} color={tone.ink} onPress={onToggle} />
    </View>
  );
}

// Bundled offline/loading placeholder for the hero (also the source until the
// rotating Supabase image resolves, and if it fails).
const HERO_FALLBACK = require('@/assets/reflections_images/reflection_bg7.webp');

// TEMP: the rotating Supabase hero pool is still placeholder art, so the Today
// hero is pinned to the seedling photo (the same image the Daily Reflection page
// uses). Flip ROTATE_HERO back to true once real images are loaded in Supabase.
const ROTATE_HERO = false;
const STATIC_HERO = require('@/assets/images/reflection_bg2.webp');

function ReflectionHero({ title, imageUri, alt, staticSource, done, onRead, onToggle }: { title: string; imageUri?: string; alt?: string; staticSource?: number; done: boolean; onRead: () => void; onToggle: () => void }) {
  const teal = ROW_TONES.teal;
  const fallback = staticSource ?? HERO_FALLBACK;
  return (
    <View style={[styles.hero, { borderColor: done ? teal.ink + '55' : '#EDEAE2' }]}>
      <Pressable onPress={onRead}>
        <View style={styles.heroCover}>
          <Image
            source={imageUri ? { uri: imageUri } : fallback}
            placeholder={fallback}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
            accessibilityLabel={alt}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>DAILY REFLECTION</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
        </View>
      </Pressable>
      <View style={[styles.heroMeta, done && { backgroundColor: teal.soft }]}>
        <Pressable style={styles.rowMain} onPress={onRead}>
          <View style={[styles.medallion, { backgroundColor: teal.ink, shadowColor: teal.ink }]}>
            <BookOpen size={20} color="#fff" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Daily Reflection</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{resolveSubtitle('reflection')}</Text>
          </View>
        </Pressable>
        <RightCheck done={done} color={teal.ink} onPress={onToggle} />
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const c = getSemanticColors('light');
  const dailies = useDailies();
  const heroImage = useReflectionHeroImage();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  useScreenTimeTracking('Today');

  // Refetch the reflection whenever the local day rolls over (dailies.dayKey
  // updates on app-foreground + each minute), so Today shows the new day's
  // reflection without a relaunch. The date label + hero image recompute on the
  // same re-render.
  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[today] reflection', e));
  }, [dailies.dayKey]);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const openDaily = (item: DailyItem) => {
    const route = ACTION_ROUTE[item.action];
    // No-tool action (custom, make-bed, exercise, …): tapping the row just checks it.
    if (route === undefined) {
      dailies.toggleDone(item.id);
      return;
    }
    // Net-new tool not built yet (graceful notice for any future deferred action).
    if (route === null) {
      Alert.alert('Coming soon', `${item.label} is on the way in the redesign.`);
      return;
    }
    const prayerTarget = PRAYER_PARAM[item.action];
    if (prayerTarget) {
      router.push({ pathname: route as any, params: { prayer: prayerTarget } });
      return;
    }
    router.push(route);
  };

  const openReflection = () => {
    // No auto-check — the Daily Reflection is checked off manually via its hero checkbox.
    router.push('/daily-reflections');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Today</Text>
        <Text style={[styles.date, { color: c.textMuted }]}>{dateLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SobrietyCounter />

        {SECTIONS.map((when) => {
          const items = dailies.section(when);
          const isMorning = when === 'Morning';
          if (!isMorning && items.length === 0) return null;
          return (
            <View key={when} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>{when}</Text>
              {isMorning && (
                <ReflectionHero
                  title={reflection?.title || 'Daily Reflection'}
                  imageUri={ROTATE_HERO ? heroImage?.uri : undefined}
                  alt={ROTATE_HERO ? heroImage?.alt : 'A seedling reaching toward the light'}
                  staticSource={ROTATE_HERO ? undefined : STATIC_HERO}
                  done={dailies.reflectionDone}
                  onRead={openReflection}
                  onToggle={dailies.toggleReflection}
                />
              )}
              {items.map((item) => (
                <DailyRow
                  key={item.id}
                  item={item}
                  done={dailies.isDone(item.id)}
                  onOpen={() => openDaily(item)}
                  onToggle={() => dailies.toggleDone(item.id)}
                />
              ))}
            </View>
          );
        })}

        {/* Footer — utility button, NOT a daily row (entry to the My Dailies editor) */}
        <Pressable
          style={({ pressed }) => [styles.customize, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(main)/my-dailies')}
        >
          <SlidersHorizontal size={16} color={colors.primaryDark} strokeWidth={2} />
          <Text style={styles.customizeText}>Customize my dailies</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.4 },
  date: { fontFamily: fontFamily.regular, fontSize: fontSize.md, marginTop: 2 },
  scroll: { paddingHorizontal: 22, paddingBottom: 120 },

  section: { marginTop: spacing.lg },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, marginBottom: spacing.sm },

  // standard daily row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 12,
    ...shadows.sm,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  medallion: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20 },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: '#8A8A9A', marginTop: 2 },

  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // reflection hero
  hero: { borderRadius: 16, borderWidth: 1, backgroundColor: colors.white, overflow: 'hidden', marginBottom: 12, ...shadows.sm },
  heroCover: { height: 150, justifyContent: 'flex-end', overflow: 'hidden' },
  heroPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  heroPillText: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.5, color: '#2B2A30' },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 19,
    color: '#fff',
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },

  // footer
  customize: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
  },
  customizeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.primaryDark },
});
