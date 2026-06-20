import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import {
  redesignColors,
  redesignRadii,
  redesignShadows,
  redesignSpacing,
} from '@/constants/redesignTokens';
import { getTodaysReflection } from '@/constants/reflections';
import { useDailyReflectionImages } from '@/hooks/use-daily-reflection-images';
import { DailyAction, DailyItem, DailySection, DailyTone, useDailiesStore } from '@/hooks/use-dailies-store';
import { getMeditationSettings, getSelectedMeditationApp } from '@/hooks/use-meditation-settings';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { Reflection } from '@/types';

const REFLECTION_COMPLETION_ID = 'daily-reflection';
const SECTIONS: DailySection[] = ['Morning', 'Anytime', 'Evening'];
const MARK_DONE_ON_OPEN = new Set<DailyAction>([
  'prayerMorning',
  'prayerEvening',
  'prayer',
  'meeting',
  'lit',
  'speaker',
  'quick',
]);

async function openMeditationApp(appUrl: string, fallbackUrl: string) {
  try {
    await Linking.openURL(appUrl);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}

const toneColors: Record<DailyTone, { ink: string; soft: string }> = {
  teal: { ink: redesignColors.teal, soft: redesignColors.tealSoft },
  amber: { ink: redesignColors.amber, soft: redesignColors.amberSoft },
  blue: { ink: redesignColors.blue, soft: redesignColors.blueSoft },
  lavender: { ink: redesignColors.lavender, soft: redesignColors.lavenderSoft },
  coral: { ink: redesignColors.coral, soft: redesignColors.coralSoft },
  gray: { ink: redesignColors.inkMuted, soft: redesignColors.paperDeep },
};

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function toTitleCase(value: string | undefined) {
  if (!value) return 'Daily Reflection';
  return value
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase());
}

function getDateParts(dateString: string | null) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatSoberDate(dateString: string | null) {
  const date = getDateParts(dateString);
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getSoberBreakdown(dateString: string | null, now = new Date()) {
  const start = getDateParts(dateString);
  if (!start) return null;

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(years, 0), months: Math.max(months, 0), days: Math.max(days, 0) };
}

function IconMedallion({
  icon,
  tone,
  size = 19,
}: {
  icon: string;
  tone: DailyTone;
  size?: number;
}) {
  const toneColor = toneColors[tone];

  return (
    <View style={[styles.medallion, { backgroundColor: toneColor.ink }]}>
      <PrototypeIcon name={icon} size={size} color={redesignColors.white} stroke={2} />
    </View>
  );
}

function CompletionButton({
  done,
  color,
  onPress,
}: {
  done: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      hitSlop={10}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={[
        styles.checkButton,
        {
          borderColor: done ? color : `${color}70`,
          backgroundColor: done ? color : `${color}1A`,
        },
      ]}
    >
      <PrototypeIcon
        name="checkPlain"
        size={15}
        color={done ? redesignColors.white : `${color}66`}
        stroke={2.4}
      />
    </Pressable>
  );
}

function SobrietyCounter({
  totalDays,
  soberDate,
  dismissed,
  onAddDate,
  onNotNow,
}: {
  totalDays: number | null;
  soberDate: string | null;
  dismissed: boolean;
  onAddDate: () => void;
  onNotNow: () => void;
}) {
  const breakdown = getSoberBreakdown(soberDate);
  const formattedDate = formatSoberDate(soberDate);

  if (totalDays === null || !breakdown) {
    if (dismissed) {
      return (
        <Pressable style={styles.soberDismissed} onPress={onAddDate}>
          <View style={styles.soberDismissedCoin}>
            <View style={styles.counterMedallionRing} />
            <PrototypeIcon name="sunrise" size={38} color={redesignColors.white} stroke={2} />
          </View>
          <View style={styles.soberDismissedText}>
            <AppText voice="reader" weight="medium" italic size={22} color={redesignColors.teal} style={styles.soberPromptTitle}>
              One day at a time.
            </AppText>
            <PrototypeIcon name="pen" size={13} color={redesignColors.inkMuted} stroke={2} />
          </View>
        </Pressable>
      );
    }

    return (
      <View style={styles.soberPrompt}>
        <AppText voice="reader" weight="medium" italic size={22} color={redesignColors.teal} style={styles.soberPromptTitle}>
          One day at a time.
        </AppText>
        <AppText typeRole="sub" color={redesignColors.inkMuted} style={styles.soberPromptText}>
          Counting days helps some people. Add your sober date whenever you&apos;re ready — no pressure.
        </AppText>
        <View style={styles.soberPromptActions}>
          <Pressable style={styles.addDateButton} onPress={onAddDate}>
            <AppText typeRole="ui" color={redesignColors.white}>
              Add date
            </AppText>
          </Pressable>
          <Pressable style={styles.notNowButton} onPress={onNotNow}>
            <AppText typeRole="ui" color={redesignColors.inkSecondary}>
              Not now
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.counterCard} onPress={onAddDate}>
      <View style={styles.counterMedallion}>
        <View style={styles.counterMedallionRing} />
        <AppText voice="display" weight="bold" size={28} color={redesignColors.white}>
          {totalDays}
        </AppText>
      </View>
      <View style={styles.counterBody}>
        <View style={styles.daysSoberRow}>
          <AppText typeRole="section" color={redesignColors.teal}>
            days sober
          </AppText>
          <PrototypeIcon name="pen" size={13} color={redesignColors.inkMuted} stroke={2} />
        </View>
        <AppText typeRole="sub" color={redesignColors.inkMuted}>
          {breakdown.years} years · {breakdown.months} months · {breakdown.days} days
        </AppText>
        {formattedDate ? (
          <AppText typeRole="sub" color={redesignColors.inkMuted}>
            since {formattedDate}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function DailyRow({
  item,
  done,
  onToggle,
  onOpen,
}: {
  item: DailyItem;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const tone = toneColors[item.tone];

  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.dailyRow,
        done && {
          backgroundColor: tone.soft,
          borderColor: `${tone.ink}66`,
        },
      ]}
    >
      <IconMedallion icon={item.icon} tone={item.tone} />
      <View style={styles.dailyText}>
        <AppText typeRole="ui" color={redesignColors.ink} numberOfLines={1}>
          {item.label}
        </AppText>
        {item.subtitle ? (
          <AppText typeRole="sub" color={redesignColors.inkMuted} numberOfLines={1}>
            {item.subtitle}
          </AppText>
        ) : null}
      </View>
      <CompletionButton done={done} color={tone.ink} onPress={onToggle} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    calculateDaysSober,
    dismissPrompt,
    emergencyContacts,
    hasSeenPrompt,
    isLoading: sobrietyLoading,
    sobrietyDate,
  } = useSobriety();
  const {
    sectionItems,
    isDoneToday,
    toggleDoneToday,
    setDoneForDate,
  } = useDailiesStore();
  const { todaysImage } = useDailyReflectionImages();

  const [todaysReflection, setTodaysReflection] = useState<Reflection | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const lastDateRef = useRef(new Date());

  const fetchReflection = useCallback(() => {
    getTodaysReflection().then(setTodaysReflection).catch(error => {
      console.error('[Today] Failed to load reflection', error);
    });
  }, []);

  useEffect(() => {
    fetchReflection();
  }, [fetchReflection]);

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
    return () => subscription.remove();
  }, [fetchReflection]);

  const daysSober = useMemo(() => {
    if (sobrietyLoading) return null;
    return calculateDaysSober();
  }, [calculateDaysSober, sobrietyLoading]);

  const reflectionDone = isDoneToday(REFLECTION_COMPLETION_ID);

  const openReflection = useCallback(async () => {
    await setDoneForDate(REFLECTION_COMPLETION_ID, true);
    router.push('/(main)/daily-reflections');
  }, [router, setDoneForDate]);

  const openDaily = useCallback(async (item: DailyItem) => {
    if (item.action === 'meditation') {
      const meditationSettings = await getMeditationSettings();
      if (!meditationSettings.source) {
        router.push(`/(main)/meditation-timer?dailyId=${encodeURIComponent(item.id)}` as any);
        return;
      }
      if (meditationSettings.source === 'app') {
        const selectedApp = getSelectedMeditationApp(meditationSettings);
        await openMeditationApp(selectedApp.appUrl, selectedApp.appStoreUrl);
        await setDoneForDate(item.id, true);
        return;
      }
      if (meditationSettings.source === 'youtube') {
        router.push(`/(main)/meditation-youtube?dailyId=${encodeURIComponent(item.id)}` as any);
        return;
      }
      if (meditationSettings.source === 'timer') {
        router.push(`/(main)/meditation-timer?dailyId=${encodeURIComponent(item.id)}` as any);
        return;
      }
    }
    if (item.action === 'call' && emergencyContacts.length === 0) {
      router.push('/(main)/add-from-contacts');
      return;
    }
    if (MARK_DONE_ON_OPEN.has(item.action)) {
      await setDoneForDate(item.id, true);
    }
    if (item.route) {
      router.push(item.route as any);
    } else {
      toggleDoneToday(item.id);
    }
  }, [emergencyContacts.length, router, setDoneForDate, toggleDoneToday]);

  const reflectionImageSource = todaysImage?.publicUrl
    ? { uri: todaysImage.publicUrl }
    : require('@/assets/reflections_images/reflection_bg7.webp');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top - 6, 52) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText typeRole="displayM" color={redesignColors.ink} style={styles.headerTitle}>
            Today
          </AppText>
          <AppText typeRole="sub" color={redesignColors.inkMuted}>
            {formatDate(currentDate)}
          </AppText>
        </View>

        <SobrietyCounter
          totalDays={daysSober}
          soberDate={sobrietyDate}
          dismissed={hasSeenPrompt}
          onAddDate={() => router.push('/sobriety-date')}
          onNotNow={dismissPrompt}
        />

        <SectionHeader
          title="Morning"
        />

        <View style={[
          styles.heroCard,
          reflectionDone && styles.heroCardDone,
        ]}>
          <Pressable onPress={openReflection}>
            <ImageBackground
              source={reflectionImageSource}
              style={styles.heroImage}
              imageStyle={styles.heroImageRadius}
              resizeMode="cover"
            >
              <View style={styles.heroShade} />
              <View style={styles.heroPill}>
                <AppText typeRole="eyebrow" color={redesignColors.ink} style={styles.heroPillText}>
                  DAILY REFLECTION
                </AppText>
              </View>
              <AppText typeRole="displayS" color={redesignColors.white} style={styles.heroTitle} numberOfLines={2}>
                {toTitleCase(todaysReflection?.title)}
              </AppText>
            </ImageBackground>
          </Pressable>
          <Pressable style={[
            styles.heroMetaRow,
            reflectionDone && styles.heroMetaRowDone,
          ]} onPress={openReflection}>
            <IconMedallion icon="book" tone="teal" />
            <View style={styles.heroMetaText}>
              <AppText typeRole="ui" color={redesignColors.ink}>
                Daily Reflection
              </AppText>
            </View>
            <CompletionButton
              done={reflectionDone}
              color={redesignColors.teal}
              onPress={() => toggleDoneToday(REFLECTION_COMPLETION_ID)}
            />
          </Pressable>
        </View>

        {sectionItems('Morning').map(item => (
          <DailyRow
            key={item.id}
            item={item}
            done={isDoneToday(item.id)}
            onOpen={() => openDaily(item)}
            onToggle={() => toggleDoneToday(item.id)}
          />
        ))}

        {SECTIONS.filter(section => section !== 'Morning').map(section => (
          <View key={section}>
            <SectionHeader
              title={section}
            />
            {sectionItems(section).map(item => (
              <DailyRow
                key={item.id}
                item={item}
                done={isDoneToday(item.id)}
                onOpen={() => openDaily(item)}
                onToggle={() => toggleDoneToday(item.id)}
              />
            ))}
          </View>
        ))}

        <Pressable style={styles.customizeButton} onPress={() => router.push('/(main)/my-dailies')}>
          <PrototypeIcon name="sliders" size={16} color={redesignColors.teal} stroke={2} />
          <AppText typeRole="ui" color={redesignColors.teal}>
            Customize my dailies
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
}: {
  title: DailySection;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText typeRole="section" color={redesignColors.ink}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: redesignColors.warmWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 134,
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  soberPrompt: {
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  soberPromptTitle: {
    fontStyle: 'italic',
    lineHeight: 28,
  },
  soberPromptText: {
    lineHeight: 19,
    marginTop: 6,
  },
  soberPromptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  addDateButton: {
    backgroundColor: redesignColors.teal,
    borderRadius: redesignRadii.pill,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  notNowButton: {
    backgroundColor: 'transparent',
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  soberDismissed: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  soberDismissedCoin: {
    alignItems: 'center',
    backgroundColor: redesignColors.teal,
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    shadowColor: redesignColors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    width: 84,
  },
  soberDismissedText: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  counterCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  counterMedallion: {
    alignItems: 'center',
    backgroundColor: redesignColors.teal,
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    shadowColor: redesignColors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    width: 84,
  },
  counterMedallionRing: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 36,
    borderWidth: 1.5,
    bottom: 6,
    left: 6,
    right: 6,
    top: 6,
  },
  counterBody: {
    flex: 1,
    gap: 5,
  },
  daysSoberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 18,
  },
  heroCard: {
    backgroundColor: redesignColors.surface,
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 0,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  heroCardDone: {
    borderColor: `${redesignColors.teal}55`,
    borderWidth: 1,
  },
  heroImage: {
    height: 140,
    justifyContent: 'flex-end',
  },
  heroImageRadius: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: redesignRadii.pill,
    left: redesignSpacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    top: redesignSpacing.md,
  },
  heroPillText: {
    letterSpacing: 0.8,
  },
  heroTitle: {
    lineHeight: 26,
    paddingBottom: 12,
    paddingHorizontal: 14,
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroMetaRow: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroMetaRowDone: {
    backgroundColor: redesignColors.tealSoft,
  },
  heroMetaText: {
    flex: 1,
    gap: 1,
  },
  dailyRow: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: 'rgba(43,42,48,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  medallion: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dailyText: {
    flex: 1,
    gap: 1,
  },
  checkButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  customizeButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: redesignColors.tealSoft,
    borderColor: `${redesignColors.teal}55`,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
    padding: 12,
    width: '100%',
    justifyContent: 'center',
  },
});
