import React, { useEffect, useState } from 'react';
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

import { colors, fontFamily, fontSize, spacing, radii, shadows, getSemanticColors } from '@/constants/designTokens';
import { ROW_TONES, resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import SobrietyCounter from '@/components/SobrietyCounter';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

// Writing tools + meditation check off on SAVE / timer-completion, never on open.
// Everything else (prayers, literature, meeting, speaker) checks off on open.
const MARK_ON_SAVE = new Set(['gratitude', 'journal', 'spotcheck', 'nightly', 'meditation']);

// action → route. null = net-new / deferred (graceful notice, no auto-complete).
const ACTION_ROUTE: Record<string, Href | null> = {
  prayerMorning: '/(main)/prayers',
  prayerEvening: '/(main)/prayers',
  prayer: '/(main)/prayers',
  gratitude: '/(main)/gratitude',
  journal: null,
  spotcheck: '/(main)/inventory',
  nightly: '/(main)/evening-review',
  speaker: '/(main)/speakers',
  meditation: '/(main)/meditation',
  callAnother: null,
  lit: '/(main)/literature',
  meeting: '/(main)/meeting-pocket',
};

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

function RightCheck({ done, color, onPress }: { done: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={[styles.check, { borderColor: done ? color : color + '70', backgroundColor: done ? color : color + '1A' }]}
    >
      {done ? (
        <Check size={15} color="#fff" strokeWidth={3} />
      ) : (
        <View style={{ opacity: 0.4 }}>
          <Check size={14} color={color} strokeWidth={2.5} />
        </View>
      )}
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
        <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
      </Pressable>
      <RightCheck done={done} color={tone.ink} onPress={onToggle} />
    </View>
  );
}

// Bundled offline/loading placeholder for the hero (also the source until the
// rotating Supabase image resolves, and if it fails).
const HERO_FALLBACK = require('@/assets/reflections_images/reflection_bg7.webp');

function ReflectionHero({ title, imageUri, alt, done, onRead, onToggle }: { title: string; imageUri?: string; alt?: string; done: boolean; onRead: () => void; onToggle: () => void }) {
  const teal = ROW_TONES.teal;
  return (
    <View style={[styles.hero, { borderColor: done ? teal.ink + '55' : '#EDEAE2' }]}>
      <Pressable onPress={onRead}>
        <View style={styles.heroCover}>
          <Image
            source={imageUri ? { uri: imageUri } : HERO_FALLBACK}
            placeholder={HERO_FALLBACK}
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
          <Text style={styles.rowLabel}>Daily Reflection</Text>
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

  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[today] reflection', e));
  }, []);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const openDaily = (item: DailyItem) => {
    const route = ACTION_ROUTE[item.action];
    // No-tool action (custom, make-bed, exercise, …): tapping the row just checks it.
    if (route === undefined) {
      dailies.toggleDone(item.id);
      return;
    }
    // Net-new tool not built yet (journal, call-another).
    if (route === null) {
      Alert.alert('Coming soon', `${item.label} is on the way in the redesign.`);
      return;
    }
    // Meditation marks done on timer completion — pass the daily id through.
    if (item.action === 'meditation') {
      router.push({ pathname: '/(main)/meditation', params: { dailyId: item.id } });
      return;
    }
    // Writing tools (gratitude, spotcheck, nightly) check off only once the
    // entry is saved — pass the daily id so the editor can mark it done.
    if (MARK_ON_SAVE.has(item.action)) {
      router.push({ pathname: route as any, params: { dailyId: item.id } });
      return;
    }
    dailies.markDone(item.id);
    router.push(route);
  };

  const openReflection = () => {
    dailies.setReflectionDone(true);
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
                  imageUri={heroImage?.uri}
                  alt={heroImage?.alt}
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
    marginBottom: 8,
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
  rowLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20 },

  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // reflection hero
  hero: { borderRadius: 16, borderWidth: 1, backgroundColor: colors.white, overflow: 'hidden', marginBottom: 8, ...shadows.sm },
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
