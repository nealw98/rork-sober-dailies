import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, Extrapolation, runOnJS, useAnimatedKeyboard, type SharedValue } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import { useRouter, type Href } from 'expo-router';
import { BookOpen, Check, Minus, Plus, GripVertical, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);
type Rect = { x: number; y: number; w: number; h: number };

import { fontFamily, fontSize, spacing, radii, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { getRowTones, resolveGlyph, resolveTone, resolveSubtitle } from '@/components/dailyTokens';
import { AddSheet, CreateSheet, type Template } from '@/components/today/DailiesEditSheets';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import SobrietyCounter from '@/components/SobrietyCounter';
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
// outline when undone, filled + check when done.
function DoneButton({ done, tone, onPress }: { done: boolean; tone: { ink: string }; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
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

// ─── Edit overlay — the row expands in place into an editable card ─────────────
// Long-pressing a row's label in edit mode measures its on-screen rect; this
// overlay blurs the rest of the page and the same card — anchored exactly where
// the row sits — grows downward to reveal the subtitle field. `progress` drives
// the morph (0 = collapsed on the row, 1 = expanded/in focus). It only slides up
// if the keyboard would otherwise cover it. Mounts fresh per item so the input
// state seeds correctly.
const SUBTITLE_BLOCK = 48; // subtitle input (40) + gap (8)

function EditOverlay({ item, rect, progress, screenH, onSave, onCancel }: {
  item: DailyItem; rect: Rect; progress: SharedValue<number>; screenH: number;
  onSave: (label: string, subtitle: string) => void; onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark, c } = useTokens();
  const defaultSub = item.subtitle !== undefined ? item.subtitle : (resolveSubtitle(item.action) ?? '');
  const [label, setLabel] = useState(item.label);
  const [subtitle, setSubtitle] = useState(defaultSub);
  const canSave = label.trim().length > 0;
  const commit = () => { if (canSave) onSave(label.trim(), subtitle.trim()); };

  const keyboard = useAnimatedKeyboard();
  const collapsedH = rect.h;
  const expandedH = rect.h + SUBTITLE_BLOCK;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const height = interpolate(p, [0, 1], [collapsedH, expandedH]);
    // Slide up only enough to sit above the keyboard, if it overlaps.
    const overlap = Math.max(0, rect.y + height + 16 - (screenH - keyboard.height.value));
    return {
      height,
      transform: [
        { translateY: interpolate(p, [0, 1], [0, -2]) - overlap },
        { scale: interpolate(p, [0, 1], [1, 1.02]) },
      ],
    };
  });
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.45, 1], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedBlur intensity={22} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss editor" />
      </AnimatedBlur>
      <Animated.View style={[styles.editCard, { left: rect.x, top: rect.y, width: rect.w }, cardStyle]}>
        <View style={styles.editHeaderRow}>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Title"
            placeholderTextColor={c.textMuted}
            style={styles.editInput}
            autoFocus
            returnKeyType="next"
          />
          <Pressable onPress={onCancel} style={[styles.editActionBtn, styles.editCancelBtn]} accessibilityLabel="Cancel edit">
            <X size={16} color={c.textMuted} strokeWidth={2.5} />
          </Pressable>
          <Pressable disabled={!canSave} onPress={commit} style={[styles.editActionBtn, styles.editSaveBtn, !canSave && styles.editSaveBtnOff]} accessibilityLabel="Save edit">
            <Check size={16} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>
        <Animated.View style={subtitleStyle}>
          <TextInput
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Subtitle"
            placeholderTextColor={c.textMuted}
            style={styles.editSubInput}
            returnKeyType="done"
            onSubmitEditing={commit}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Daily row — flat ledger line: accent bar · glyph · title · Done ──────────
// In edit mode the Done button is swapped for the remove control; the grip-handle
// medallion long-presses to reorder, and long-pressing the label lifts the row
// into the floating editor (rename title + subtitle). Outside edit mode: tap to
// open the tool.
function DailyRow({
  item, done, isLast, editing, hidden, onOpen, onToggle, onStartEdit, onRemove, onDragStart, dragging,
}: {
  item: DailyItem; done: boolean; isLast: boolean; editing: boolean; hidden?: boolean;
  onOpen: () => void; onToggle: () => void; onRemove: () => void;
  onStartEdit?: (rect: Rect) => void;
  onDragStart?: () => void; dragging?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const tone = resolveTone(item.color, mode);
  const Glyph = resolveGlyph(item.icon);
  const sub = item.subtitle !== undefined ? item.subtitle : resolveSubtitle(item.action);
  const rowRef = useRef<View>(null);

  const startEdit = () => {
    const node = rowRef.current;
    if (!node) { onStartEdit?.({ x: 0, y: 0, w: 0, h: 0 }); return; }
    node.measureInWindow((x, y, w, h) => onStartEdit?.({ x, y, w, h }));
  };

  if (editing) {
    // `hidden` = this is the row being edited; drop it out of sight so the
    // floating card isn't duplicated behind the blur (it still holds its slot).
    return (
      <View ref={rowRef} style={[styles.row, dragging && styles.rowDragging, hidden && styles.rowHidden]}>
        {/* Grip handle → long-press to drag/reorder. Label → long-press to edit. */}
        <Pressable style={[styles.med, { backgroundColor: tone.soft }]} onLongPress={onDragStart} delayLongPress={150} accessibilityLabel={`Drag ${item.label} to reorder`}>
          <GripVertical size={20} color={tone.ink} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.rowText} onLongPress={startEdit} delayLongPress={300} accessibilityLabel={`Edit ${item.label}`}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </Pressable>
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
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
        </View>
      </Pressable>
      {/* Meta band — white, with a teal medallion + teal Done button */}
      <View style={styles.heroMeta}>
        <Pressable style={styles.rowMain} onPress={onRead}>
          <View style={[styles.med, { backgroundColor: teal.soft }]}>
            <BookOpen size={20} color={teal.ink} />
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
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const dailies = useDailies();
  const heroImage = useReflectionHeroImage();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [editing, setEditing] = useState(false);
  const [addSection, setAddSection] = useState<WhenBucket | null>(null);
  const [createSection, setCreateSection] = useState<WhenBucket | null>(null);
  const [editTarget, setEditTarget] = useState<{ item: DailyItem; rect: Rect } | null>(null);
  const editP = useSharedValue(0);
  const { height: screenH } = useWindowDimensions();
  useScreenTimeTracking('Today');

  // Lift a row into the floating editor: blur in + rise, driven by editP 0→1.
  const openEditor = useCallback((item: DailyItem, rect: Rect) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTarget({ item, rect });
    editP.value = 0;
    editP.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [editP]);

  const closeEditor = useCallback(() => {
    Keyboard.dismiss();
    editP.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(setEditTarget)(null);
    });
  }, [editP]);

  const saveEditor = useCallback((label: string, subtitle: string) => {
    if (editTarget) dailies.editDaily(editTarget.item.id, { label, subtitle });
    closeEditor();
  }, [editTarget, dailies, closeEditor]);

  // Leaving edit mode dismisses any open editor immediately (no animation).
  const toggleEditing = useCallback(() => {
    setEditing((v) => !v);
    setEditTarget(null);
    editP.value = 0;
  }, [editP]);

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
          hidden={editTarget?.item.id === row.item.id}
          onOpen={() => {}}
          onToggle={() => {}}
          onStartEdit={(rect) => openEditor(row.item, rect)}
          onRemove={() => dailies.removeDaily(row.item.id)}
          onDragStart={drag}
          dragging={isActive}
        />
      </ScaleDecorator>
    );
  }, [c.text, dailies, editTarget, openEditor]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Today</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{dateLabel}</Text>
        </View>
        <Pressable hitSlop={10} onPress={toggleEditing} accessibilityRole="button">
          <Text style={styles.editToggle}>{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
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
          onCreate={(label, when) => {
            dailies.addDaily({ label, icon: 'circle', color: 'gray', action: 'custom', custom: true }, when);
            setCreateSection(null);
          }}
        />
      )}

    </SafeAreaView>

    {editTarget && (
      <EditOverlay
        key={editTarget.item.id}
        item={editTarget.item}
        rect={editTarget.rect}
        progress={editP}
        screenH={screenH}
        onSave={saveEditor}
        onCancel={closeEditor}
      />
    )}
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
  editToggle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.primaryDark, paddingTop: 6 },
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
  rowHidden: { opacity: 0 },
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

  // In-place editor card (long-press a row in edit mode → expands where it sits)
  editCard: {
    position: 'absolute',
    backgroundColor: isDark ? c.surfaceRaised : c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    overflow: 'hidden',
    ...darkCard,
  },
  editHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 },
  editInput: { flex: 1, height: 40, fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F6F4EF', borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 0 },
  editSubInput: { height: 40, marginTop: 8, fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textSecondary, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F6F4EF', borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 0 },
  editActionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  editCancelBtn: { borderWidth: 1, borderColor: c.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' },
  editSaveBtn: { backgroundColor: colors.primary },
  editSaveBtnOff: { opacity: 0.4 },

  // "+ Add to {section}" dashed button
  addPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
  },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },

  // Reflection hero
  hero: { borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden', marginBottom: 4, ...shadows.sm, ...darkCard },
  heroCover: { height: 150, justifyContent: 'flex-end', overflow: 'hidden' },
  heroTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 22,
    color: '#fff',
    lineHeight: 27,
    width: '66%',            // title sits in the left 2/3 — weight to the left
    paddingHorizontal: 14,
    paddingBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  });
};
