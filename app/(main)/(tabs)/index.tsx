import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import { useRouter, type Href } from 'expo-router';
import { Check, Minus, Plus, GripVertical } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { fontFamily, fontSize, spacing, radii, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { getRowTones, resolveGlyph, resolveTone, resolveSubtitle } from '@/components/dailyTokens';
import { AddSheet, CreateSheet, type Template } from '@/components/today/DailiesEditSheets';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import SobrietyCounter from '@/components/SobrietyCounter';
import SettingsGear from '@/components/navigation/SettingsGear';
import { getTodaysReflection } from '@/constants/reflections';
import { titleCase } from '@/lib/titleCase';
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
  lit: '/(main)/(tabs)/literature',
  meeting: '/(main)/meetings',
};

// Prayer dailies open a specific prayer directly (deep link).
const PRAYER_PARAM: Record<string, string> = {
  prayerMorning: 'morning',
  prayerEvening: 'evening',
};

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// Flattened rows for the edit-mode drag list: a section header, its dailies, and
// a "+ Add" row, per bucket. Dropping a daily under a different header re-buckets it.
type EditRow =
  | { type: 'header'; key: string; when: WhenBucket }
  | { type: 'daily'; key: string; item: DailyItem; isLast: boolean }
  | { type: 'add'; key: string; when: WhenBucket };

// ─── Done button — the completion control, in the row's accent (tool) color:
// outline when undone, filled + check when done. `onDark` is a white treatment
// for use over a photo (the reflection hero): the button stays transparent with
// a white outline + white text in both states; a white check is added when done.
function DoneButton({ done, tone, onPress, onDark }: { done: boolean; tone: { ink: string }; onPress: () => void; onDark?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={[
        styles.doneBtn,
        onDark
          ? { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.85)' }
          : done
            ? { backgroundColor: tone.ink, borderColor: tone.ink }
            : { backgroundColor: 'transparent', borderColor: tone.ink + '99' },
      ]}
    >
      {done && <Check size={12} color="#fff" strokeWidth={3} />}
      <Text style={[styles.doneText, { color: onDark ? '#fff' : done ? '#fff' : tone.ink }]}>Done</Text>
    </Pressable>
  );
}

// ─── Daily row — flat ledger line: accent bar · glyph · title · Done ──────────
// In edit mode the Done button is swapped for the remove control and the
// grip-handle medallion long-presses to reorder. Outside edit mode: tap to
// open the tool.
function DailyRow({
  item, done, isLast, editing, onOpen, onToggle, onRemove, onDragStart, dragging,
}: {
  item: DailyItem; done: boolean; isLast: boolean; editing: boolean;
  onOpen: () => void; onToggle: () => void; onRemove: () => void;
  onDragStart?: () => void; dragging?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const tone = resolveTone(item.color, mode);
  const Glyph = resolveGlyph(item.icon);
  const sub = item.subtitle !== undefined ? item.subtitle : resolveSubtitle(item.action);

  if (editing) {
    return (
      <View style={[styles.row, dragging && styles.rowDragging]}>
        {/* Grip handle → long-press to drag/reorder. */}
        <Pressable style={[styles.med, { backgroundColor: tone.soft }]} onLongPress={onDragStart} delayLongPress={150} accessibilityLabel={`Drag ${item.label} to reorder`}>
          <GripVertical size={20} color={tone.ink} strokeWidth={2} />
        </Pressable>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        <View style={styles.editControls}>
          <Pressable hitSlop={6} style={styles.removeBtn} onPress={onRemove} accessibilityLabel={`Remove ${item.label}`}>
            <Minus size={14} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onOpen}>
        <View style={[styles.med, { backgroundColor: tone.soft }]}>
          <Glyph size={20} color={tone.ink} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </Pressable>
      <DoneButton done={done} tone={tone} onPress={onToggle} />
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
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const teal = getRowTones(mode).teal;
  const fallback = staticSource ?? HERO_FALLBACK;
  return (
    <View style={styles.hero}>
      {/* The card IS the image now — no meta band. Eyebrow + title bottom-left. */}
      <Pressable style={styles.heroCover} onPress={onRead}>
        <Image
          source={imageUri ? { uri: imageUri } : fallback}
          placeholder={fallback}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          accessibilityLabel={alt}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroEyebrow}>Daily Reflections</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
        </View>
      </Pressable>
      {/* Done ON the image, bottom-right — aligned with the ledger rows' buttons.
          White "on-dark" treatment so it reads on the photo's gradient. */}
      <View style={styles.heroDone}>
        <DoneButton done={done} tone={teal} onPress={onToggle} onDark />
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const dailies = useDailies();
  const heroImage = useReflectionHeroImage();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [editing, setEditing] = useState(false);
  const [addSection, setAddSection] = useState<WhenBucket | null>(null);
  const [createSection, setCreateSection] = useState<WhenBucket | null>(null);
  useScreenTimeTracking('Today');

  const toggleEditing = useCallback(() => setEditing((v) => !v), []);

  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[today] reflection', e));
  }, [dailies.dayKey]);

  // Review trigger: the "I finished my program today" moment. Fire once when the
  // last daily is checked off (resets if they uncheck, or on a new day). Gated
  // inside maybeAskForReview, so it silently no-ops unless the user is eligible.
  const allDoneFiredRef = useRef(false);
  useEffect(() => { allDoneFiredRef.current = false; }, [dailies.dayKey]);
  useEffect(() => {
    const allDone = dailies.totalCount > 0 && dailies.doneCount >= dailies.totalCount;
    if (allDone && !allDoneFiredRef.current) {
      allDoneFiredRef.current = true;
      maybeAskForReview('allDailies').catch(() => {});
    } else if (!allDone) {
      allDoneFiredRef.current = false;
    }
  }, [dailies.doneCount, dailies.totalCount]);

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

  // Counter + Daily Reflection hero — shown above the list in both modes.
  const topContent = (
    <>
      <SobrietyCounter />
      <View style={styles.heroTop}>
        <ReflectionHero
          title={reflection?.title ? titleCase(reflection.title) : 'Daily Reflection'}
          imageUri={ROTATE_HERO ? heroImage?.uri : undefined}
          alt={ROTATE_HERO ? heroImage?.alt : 'A seedling reaching toward the light'}
          staticSource={ROTATE_HERO ? undefined : STATIC_HERO}
          done={dailies.reflectionDone}
          onRead={openReflection}
          onToggle={dailies.toggleReflection}
        />
      </View>
    </>
  );

  // Edit mode: one flat drag list across all three sections. The FIRST section's
  // header (Morning) is pinned in the list header instead of the data, so a row
  // can never be dragged above it.
  const editData = useMemo<EditRow[]>(() => {
    const rows: EditRow[] = [];
    SECTIONS.forEach((when, si) => {
      if (si > 0) rows.push({ type: 'header', key: `h-${when}`, when });
      dailies.program
        .filter((d) => d.when === when)
        .forEach((item, idx, arr) => rows.push({ type: 'daily', key: `d-${item.id}`, item, isLast: idx === arr.length - 1 }));
      rows.push({ type: 'add', key: `a-${when}`, when });
    });
    return rows;
  }, [dailies.program]);

  // Counter + hero + the pinned Morning header (rows can't go above this).
  const editListHeader = (
    <>
      {topContent}
      <View style={styles.dragHeader}>
        <Text style={[styles.sectionTitle, styles.dragHeaderText, { color: c.text }]}>{SECTIONS[0]}</Text>
      </View>
    </>
  );

  // Rebuild the program from the dropped order; a daily's bucket = the section
  // header above it in the list.
  const handleDragEnd = useCallback(({ data }: { data: EditRow[] }) => {
    const next: DailyItem[] = [];
    let when: WhenBucket = SECTIONS[0];
    data.forEach((row) => {
      if (row.type === 'header') when = row.when;
      else if (row.type === 'daily') next.push({ ...row.item, when });
    });
    dailies.setAll(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dailies]);

  const renderEditRow = useCallback(({ item: row, drag, isActive }: RenderItemParams<EditRow>) => {
    // Cell spacing must be PADDING, not margin — draggable-flatlist measures cell
    // height via onLayout, which excludes margins, so margins desync the list.
    if (row.type === 'header') {
      return (
        <View style={styles.dragHeader}>
          <Text style={[styles.sectionTitle, styles.dragHeaderText, { color: c.text }]}>{row.when}</Text>
        </View>
      );
    }
    if (row.type === 'add') {
      return (
        <View style={styles.dragAdd}>
          <Pressable style={[styles.addPill, styles.addPillFlush]} onPress={() => setAddSection(row.when)}>
            <Plus size={16} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.addPillText}>Add to {row.when}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <ScaleDecorator activeScale={1.03}>
        <DailyRow
          item={row.item}
          done={false}
          isLast={row.isLast}
          editing
          onOpen={() => {}}
          onToggle={() => {}}
          onRemove={() => dailies.removeDaily(row.item.id)}
          onDragStart={drag}
          dragging={isActive}
        />
      </ScaleDecorator>
    );
  }, [c.text, dailies]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Today</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{dateLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={10} onPress={toggleEditing} accessibilityRole="button">
            <Text style={styles.editToggle}>{editing ? 'Done' : 'Edit'}</Text>
          </Pressable>
          <SettingsGear />
        </View>
      </View>

      {editing ? (
        <DraggableFlatList
          data={editData}
          keyExtractor={(row) => row.key}
          renderItem={renderEditRow}
          onDragEnd={handleDragEnd}
          onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          ListHeaderComponent={editListHeader}
          containerStyle={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {topContent}
          {SECTIONS.map((when) => {
            const items = dailies.section(when);
            if (items.length === 0) return null;
            return (
              <View key={when} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>{when}</Text>
                <View style={styles.ledger}>
                  {items.map((item, idx) => (
                    <DailyRow
                      key={item.id}
                      item={item}
                      done={dailies.isDone(item.id)}
                      isLast={idx === items.length - 1}
                      editing={false}
                      onOpen={() => openDaily(item)}
                      onToggle={() => toggleDaily(item.id)}
                      onRemove={() => {}}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

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
          onCreate={(label, when, notes) => {
            dailies.addDaily({ label, subtitle: notes || undefined, icon: 'circle', color: 'gray', action: 'custom', custom: true }, when);
            setCreateSection(null);
          }}
        />
      )}

    </SafeAreaView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Dark card chrome — the "cheap" variant of the handoff's card treatment for
  // the many small ledger rows: lit top hairline + soft drop into the black.
  // (The big surfaces use the full ThemedCard treatment.)
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.4 },
  date: { fontFamily: fontFamily.regular, fontSize: fontSize.md, marginTop: 2 },
  // Edit + the settings gear share the top-right; the gear is the outermost
  // (far-corner) control (handoff-tab-nav).
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 6 },
  editToggle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.primaryDark },
  scroll: { paddingHorizontal: 22, paddingBottom: 120 },

  heroTop: { marginTop: spacing.xl },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, marginBottom: 12 },
  // Drag-list cells use padding (not margin) so onLayout heights stay correct.
  dragHeader: { paddingTop: spacing.xl, paddingBottom: 12 },
  dragHeaderText: { marginBottom: 0 },
  dragAdd: { paddingTop: 12 },
  addPillFlush: { marginTop: 0 },

  // Ledger: a card-less stack of flat rows
  ledger: {},
  // White tile per daily — the accent (tool) color lives in the icon medallion
  // and the Done button.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    ...shadows.sm,
    ...darkCard,
  },
  rowDragging: { ...shadows.md },
  med: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },

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
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D8584E', alignItems: 'center', justifyContent: 'center' },

  // "+ Add to {section}" dashed button
  addPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
  },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },

  // Reflection hero
  // Photo jewel — no card-treatment hairline on dark (it reads as a white
  // outline around the image); the photo edge + meta band define the card.
  hero: { borderRadius: 16, borderWidth: isDark ? 0 : 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden', marginBottom: 4, ...shadows.sm },
  heroCover: { height: 168, justifyContent: 'flex-end', overflow: 'hidden' },
  // Eyebrow + title block, bottom-left, kept in the left ~2/3 clear of the Done button.
  heroTextBlock: { maxWidth: '72%', paddingHorizontal: 14, paddingBottom: 14 },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 22,
    color: '#fff',
    lineHeight: 27,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  // Done button overlaid on the image, aligned to the ledger rows' right inset
  // (13). The button uses the white on-dark treatment (see DoneButton onDark).
  heroDone: { position: 'absolute', right: 13, bottom: 13 },
  });
};
