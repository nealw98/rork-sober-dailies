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
import { BookOpen, Check, Settings, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { colors, fontFamily, fontSize, spacing, radii, shadows, getSemanticColors } from '@/constants/designTokens';
import { ROW_TONES, resolveGlyph, resolveTone, resolveSubtitle } from '@/components/dailyTokens';
import { AddSheet, CreateSheet, SettingsSheet, type Template } from '@/components/today/DailiesEditSheets';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import SobrietyCounter from '@/components/SobrietyCounter';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

// Today is a to-do ledger. Completion is fully manual: every daily — including
// the Daily Reflection hero — is checked off with its "Done" button, never on
// open. Tapping a row opens its tool. Customisation happens in-place via the
// header Edit toggle (no separate page).

// action → route. undefined = no-tool action (just checks off). null = deferred.
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

// Prayer dailies open a specific prayer directly (deep link).
const PRAYER_PARAM: Record<string, string> = {
  prayerMorning: 'morning',
  prayerEvening: 'evening',
};

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// ─── Done button — the ledger's completion control (replaces press-and-hold) ──
function DoneButton({ done, tone, onPress }: { done: boolean; tone: { ink: string }; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={[
        styles.doneBtn,
        done
          ? { backgroundColor: tone.ink, borderColor: tone.ink }
          : { backgroundColor: 'transparent', borderColor: tone.ink + '99' },
      ]}
    >
      {done && <Check size={12} color="#fff" strokeWidth={3} />}
      <Text style={[styles.doneText, { color: done ? '#fff' : tone.ink }]}>Done</Text>
    </Pressable>
  );
}

// ─── Daily row — flat ledger line: accent bar · glyph · title · Done ──────────
function DailyRow({
  item, done, isLast, editing, onOpen, onToggle, onGear, onRemove,
}: {
  item: DailyItem; done: boolean; isLast: boolean; editing: boolean;
  onOpen: () => void; onToggle: () => void; onGear: () => void; onRemove: () => void;
}) {
  const tone = resolveTone(item.color);
  const Glyph = resolveGlyph(item.icon);
  const sub = resolveSubtitle(item.action);
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      {done && !editing && <View style={[styles.rowFill, { backgroundColor: tone.fill }]} />}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: tone.ink, opacity: done && !editing ? 1 : 0.5, top: done && !editing ? 4 : 0, bottom: done && !editing ? 4 : 0 },
        ]}
      />
      <Pressable style={styles.rowMain} onPress={onOpen} disabled={editing}>
        <View style={styles.glyphWrap}>
          <Glyph size={21} color={tone.ink} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </Pressable>
      {editing ? (
        <View style={styles.editControls}>
          <Pressable hitSlop={6} style={styles.gearBtn} onPress={onGear} accessibilityLabel={`Edit ${item.label}`}>
            <Settings size={15} color="#4A4A5E" strokeWidth={2} />
          </Pressable>
          <Pressable hitSlop={6} style={styles.removeBtn} onPress={onRemove} accessibilityLabel={`Remove ${item.label}`}>
            <Minus size={14} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>
      ) : (
        <DoneButton done={done} tone={tone} onPress={onToggle} />
      )}
    </View>
  );
}

// Bundled offline/loading placeholder for the hero.
const HERO_FALLBACK = require('@/assets/reflections_images/reflection_bg7.webp');

// TEMP: the rotating Supabase hero pool is still placeholder art, so the Today
// hero is pinned to the seedling photo. Flip ROTATE_HERO back to true once real
// images are loaded in Supabase.
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
      {/* Meta band — matches the ledger rows; fills edge-to-edge when done */}
      <View style={[styles.heroMeta, done && { backgroundColor: teal.fill }]}>
        <Pressable style={styles.rowMain} onPress={onRead}>
          <View style={styles.glyphWrap}>
            <BookOpen size={21} color={teal.ink} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Daily Reflection</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{resolveSubtitle('reflection')}</Text>
          </View>
        </Pressable>
        <DoneButton done={done} tone={teal} onPress={onToggle} />
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
  const [editing, setEditing] = useState(false);
  const [addSection, setAddSection] = useState<WhenBucket | null>(null);
  const [createSection, setCreateSection] = useState<WhenBucket | null>(null);
  const [settingsItem, setSettingsItem] = useState<DailyItem | null>(null);
  useScreenTimeTracking('Today');

  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[today] reflection', e));
  }, [dailies.dayKey]);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const openDaily = (item: DailyItem) => {
    const route = ACTION_ROUTE[item.action];
    if (route === undefined) {
      // No-tool action: tapping the row just checks it.
      dailies.toggleDone(item.id);
      return;
    }
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

  const toggleDaily = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dailies.toggleDone(id);
  };

  const openReflection = () => router.push('/daily-reflections');

  const addedActions = new Set(dailies.program.map((i) => i.action));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Today</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{dateLabel}</Text>
        </View>
        <Pressable hitSlop={10} onPress={() => setEditing((v) => !v)} accessibilityRole="button">
          <Text style={styles.editToggle}>{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SobrietyCounter />

        {SECTIONS.map((when) => {
          const items = dailies.section(when);
          const isMorning = when === 'Morning';
          // Normal mode hides empty non-Morning sections; edit mode shows all
          // three so you can add to any bucket.
          if (!isMorning && items.length === 0 && !editing) return null;
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
              {items.length > 0 && (
                <View style={styles.ledger}>
                  {items.map((item, idx) => (
                    <DailyRow
                      key={item.id}
                      item={item}
                      done={dailies.isDone(item.id)}
                      isLast={idx === items.length - 1}
                      editing={editing}
                      onOpen={() => openDaily(item)}
                      onToggle={() => toggleDaily(item.id)}
                      onGear={() => setSettingsItem(item)}
                      onRemove={() => dailies.removeDaily(item.id)}
                    />
                  ))}
                </View>
              )}
              {editing && (
                <Pressable style={styles.addPill} onPress={() => setAddSection(when)}>
                  <Plus size={16} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.addPillText}>Add to {when}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {addSection && (
        <AddSheet
          section={addSection}
          added={addedActions}
          onClose={() => setAddSection(null)}
          onAdd={(t: Template) => {
            dailies.addDaily(t, addSection);
            setAddSection(null);
          }}
          onCreate={() => {
            const s = addSection;
            setAddSection(null);
            setCreateSection(s);
          }}
        />
      )}

      {createSection && (
        <CreateSheet
          section={createSection}
          onClose={() => setCreateSection(null)}
          onCreate={(label, when) => {
            dailies.addDaily({ label, icon: 'circle', color: 'gray', action: 'custom', custom: true }, when);
            setCreateSection(null);
          }}
        />
      )}

      {settingsItem && (
        <SettingsSheet
          item={settingsItem}
          onClose={() => setSettingsItem(null)}
          onSave={(label, when) => {
            if (label !== settingsItem.label) dailies.renameDaily(settingsItem.id, label);
            if (when !== settingsItem.when) dailies.setWhen(settingsItem.id, when);
            setSettingsItem(null);
          }}
          onRemove={() => {
            dailies.removeDaily(settingsItem.id);
            setSettingsItem(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.4 },
  date: { fontFamily: fontFamily.regular, fontSize: fontSize.md, marginTop: 2 },
  editToggle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.primaryDark, paddingTop: 6 },
  scroll: { paddingHorizontal: 22, paddingBottom: 120 },

  section: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, marginBottom: 12 },

  // Ledger: a card-less stack of flat rows
  ledger: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 13,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2DED4' },
  // Completed-row inset wash: squared left (flush with accent bar), rounded right.
  rowFill: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  accentBar: { position: 'absolute', left: 0, width: 3 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyphWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20, color: '#2B2A30' },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: '#8A8A9A', marginTop: 2 },

  // Done button
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1.25,
  },
  doneText: { fontFamily: fontFamily.semiBold, fontSize: 11.5 },

  // Edit-mode controls
  editControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gearBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#D8D3C7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D8584E', alignItems: 'center', justifyContent: 'center' },

  // "+ Add to {section}" dashed button
  addPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
  },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },

  // Reflection hero
  hero: { borderRadius: 16, borderWidth: 1, backgroundColor: colors.white, overflow: 'hidden', marginBottom: 4, ...shadows.sm },
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
});
