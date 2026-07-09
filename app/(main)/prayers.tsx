// Prayers — library list → read view (redesign 3.0). Tapping a prayer morphs
// the tapped list card into a full-size white container that takes over the
// page (a shared-element-style expand), with the body revealing as it grows.
// Content is the existing constants/prayers.ts (unchanged). Custom prayers are
// a separate net-new feature — not built here.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, BookOpen, X, Plus, Pencil } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useUserPrayers, type UserPrayer } from '@/hooks/use-user-prayers-store';
import { PrayerEditSheet } from '@/components/PrayerEditSheet';
import { useTheme } from '@/hooks/useTheme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useReadingSize } from '@/hooks/use-reading-size';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { logEvent } from '@/lib/analytics';
import { aaPrayers } from '@/constants/prayers';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const TOP_GAP = 8; // small inset above the read container (the X close sits inside it)
const SIDE = 20; // horizontal page margin = the read container's left/right inset
const DUR = 340;

type Rect = { x: number; y: number; w: number; h: number };
type Mode = 'list' | 'opening' | 'read' | 'closing';

// The prayer body — shared by the morph overlay (it IS the read view once open).
const MORNING_INTRO = 'As I begin this day, I ask my Higher Power:';

type ReadPrayer = { title: string; content: string; source?: string };

function PrayerBody({ prayer }: { prayer: ReadPrayer }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  // Prayer body = the shared "Aa" reading size, layered on the OS text-size.
  const { readingSize, readingLineHeight } = useReadingSize();
  const bodyType = { fontSize: readingSize, lineHeight: readingLineHeight };
  const paras = prayer.content.split(/\n\s*\n/);
  // Morning Prayer: pull the opening line out as its own italic intro with a
  // gap below it (in the data it sits on the first line of the first block).
  let intro: string | null = null;
  if (prayer.title === 'Morning Prayer' && paras[0]?.startsWith(MORNING_INTRO)) {
    intro = MORNING_INTRO;
    paras[0] = paras[0].slice(MORNING_INTRO.length).trim();
  }
  return (
    <>
      <View style={styles.readDivider} />
      {intro && <Text style={[styles.prayerPara, styles.prayerIntro, bodyType]}>{intro}</Text>}
      {paras.map((para, i) => (
        <Text key={i} style={[styles.prayerPara, bodyType]}>{para.trim()}</Text>
      ))}
      {prayer.source && (
        <View style={styles.sourceRow}>
          <BookOpen size={13} color={c.textMuted} strokeWidth={1.9} />
          <Text style={styles.sourceText}>{prayer.source}</Text>
        </View>
      )}
    </>
  );
}

export default function PrayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string }>();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [source, setSource] = useState<Rect | null>(null);
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const cardRefs = useRef<Array<View | null>>([]);

  useScreenTimeTracking('Prayers');

  const { palette } = useTheme();
  const { prayers: userPrayers, addPrayer, updatePrayer, removePrayer } = useUserPrayers();
  const allPrayers = useMemo<ReadPrayer[]>(
    () => [...aaPrayers, ...userPrayers.map((p) => ({ title: p.title, content: p.content }))],
    [userPrayers],
  );
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; prayer: UserPrayer } | null>(null);

  // 0 = sitting on the source list card · 1 = the full-size read container.
  const progress = useSharedValue(0);

  const target = useMemo<Rect>(() => ({
    x: SIDE,
    y: insets.top + TOP_GAP,
    w: screenW - SIDE * 2,
    h: screenH - (insets.top + TOP_GAP) - (insets.bottom + SIDE),
  }), [screenW, screenH, insets.top, insets.bottom]);

  const finishOpen = () => setMode('read');
  const finishClose = () => { setMode('list'); setSelected(null); setSource(null); };

  const openFromCard = (i: number) => {
    const opened = allPrayers[i];
    if (opened) logEvent('prayer_viewed', { prayer: opened.title, custom: i >= aaPrayers.length });
    const node = cardRefs.current[i];
    if (!node) { setSelected(i); setMode('read'); progress.value = 1; return; }
    node.measureInWindow((x, y, w, h) => {
      setSource({ x, y, w, h });
      setSelected(i);
      setMode('opening');
      progress.value = 0;
      progress.value = withTiming(1, { duration: DUR, easing: Easing.inOut(Easing.cubic) }, (done) => {
        if (done) runOnJS(finishOpen)();
      });
    });
  };

  const closeRead = () => {
    if (source) {
      setMode('closing');
      progress.value = withTiming(0, { duration: DUR, easing: Easing.inOut(Easing.cubic) }, (done) => {
        if (done) runOnJS(finishClose)();
      });
    } else {
      router.back(); // deep-linked: no source card to morph back to
    }
  };

  // Deep link (e.g. ?prayer=morning) opens that prayer directly, no morph.
  useEffect(() => {
    if (!params.prayer) return;
    const q = params.prayer.toLowerCase();
    const i = aaPrayers.findIndex((p) => {
      const t = p.title.toLowerCase();
      if (q === 'morning') return t.includes('morning');
      if (q === 'evening') return t.includes('evening');
      return t.includes(q);
    });
    if (i >= 0) { setSource(null); setSelected(i); setMode('read'); progress.value = 1; }
  }, [params.prayer]);

  // Android back: tile-opened → morph back to the list; deep-link-opened → pop.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode !== 'list') {
        if (source) { closeRead(); return true; }
        return false;
      }
      return false;
    });
    return () => sub.remove();
  }, [mode, source]);

  const prayer = selected !== null ? allPrayers[selected] : null;

  const overlayStyle = useAnimatedStyle(() => {
    const s = source ?? target;
    const p = source ? progress.value : 1;
    return {
      left: interpolate(p, [0, 1], [s.x, target.x]),
      top: interpolate(p, [0, 1], [s.y, target.y]),
      width: interpolate(p, [0, 1], [s.w, target.w]),
      height: interpolate(p, [0, 1], [s.h, target.h]),
      borderRadius: interpolate(p, [0, 1], [16, 22]),
    };
  });
  // Two layers crossfade inside the morphing card (same approach as Journey):
  // the collapsed-card preview fades OUT while the full read sheet fades IN.
  const rowFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP) }));
  const sheetFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.1, 0.65], [0, 1], Extrapolation.CLAMP) }));
  const listFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.85], [1, 0], Extrapolation.CLAMP) }));

  const isList = mode === 'list';
  const showOverlay = mode !== 'list' && !!prayer;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.screen} edges={['top']}>
        {/* Library list — kept mounted (scroll preserved); fades out as a prayer opens. */}
        <Animated.View style={[styles.flex, listFade]} pointerEvents={isList ? 'auto' : 'none'}>
          <View style={styles.header}>
            <BackButton onPress={() => router.back()} style={styles.headerBack} />
            <Text style={styles.bigTitle}>Prayers</Text>
            <Text style={styles.bigSub}>Tap any prayer to read it.</Text>
          </View>
          <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>MY PRAYERS</Text>
            </View>
            {userPrayers.length > 0 && (
              <View style={[styles.list, { marginBottom: 10 }]}>
                {userPrayers.map((p, j) => {
                  const idx = aaPrayers.length + j;
                  return (
                    <Pressable
                      key={p.id}
                      ref={(r) => { cardRefs.current[idx] = r; }}
                      onPress={() => openFromCard(idx)}
                      style={styles.card}
                      accessibilityRole="button"
                    >
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                        <Pressable onPress={() => setSheet({ mode: 'edit', prayer: p })} hitSlop={10} style={styles.editBtn} accessibilityLabel="Edit prayer">
                          <Pencil size={16} color={c.textMuted} />
                        </Pressable>
                      </View>
                      <Text style={styles.preview} numberOfLines={3}>{p.content}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable style={styles.addBtn} onPress={() => setSheet({ mode: 'add' })} accessibilityRole="button">
              <Plus size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.addBtnText}>Add a prayer</Text>
            </Pressable>

            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <Text style={styles.sectionLabel}>ALL PRAYERS</Text>
              <Text style={styles.sectionHint}>{aaPrayers.length} prayers</Text>
            </View>
            <View style={styles.list}>
              {aaPrayers.map((p, i) => (
                <Pressable
                  key={i}
                  ref={(r) => { cardRefs.current[i] = r; }}
                  onPress={() => openFromCard(i)}
                  style={styles.card}
                  accessibilityRole="button"
                >
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                  </View>
                  <Text style={styles.preview} numberOfLines={3}>{p.content}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

      </SafeAreaView>

      {/* The morphing card — grows from the tapped tile into the full container.
          Inside it, the collapsed preview and the full read sheet crossfade. */}
      {showOverlay && prayer && (
        <Animated.View style={[styles.overlayCard, overlayStyle]}>
          {/* collapsed-card preview (matches the list tile) — fades out as it opens */}
          <Animated.View style={[styles.overlayRow, { width: source?.w ?? target.w }, rowFade]} pointerEvents="none">
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{prayer.title}</Text>
              <ChevronRight size={16} color={c.textMuted} />
            </View>
            <Text style={styles.preview} numberOfLines={3}>{prayer.content}</Text>
          </Animated.View>

          {/* full read sheet — fades in; the X close lives inside its header */}
          <Animated.View style={[StyleSheet.absoluteFill, sheetFade]}>
            <View style={styles.flex}>
              <View style={styles.readHead}>
                <Text style={styles.readCardTitle} numberOfLines={2}>{prayer.title}</Text>
                <View style={styles.readActions}>
                  <Pressable onPress={() => setSizeSheetOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Text size" style={styles.aaBtn}>
                    <Text style={styles.aaLabel}>aA</Text>
                  </Pressable>
                  <Pressable onPress={closeRead} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close prayer" style={styles.closeBtn}>
                    <X size={18} color={c.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
              <ScrollView scrollEnabled={mode === 'read'} showsVerticalScrollIndicator={mode === 'read'} contentContainerStyle={styles.overlayScroll}>
                <PrayerBody prayer={prayer} />
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {sheet?.mode === 'add' && (
        <PrayerEditSheet
          palette={palette}
          onSave={(title, content) => { addPrayer(title, content); logEvent('prayer_created'); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.mode === 'edit' && (
        <PrayerEditSheet
          palette={palette}
          initialTitle={sheet.prayer.title}
          initialContent={sheet.prayer.content}
          canDelete
          onSave={(title, content) => { updatePrayer(sheet.prayer.id, title, content); setSheet(null); }}
          onDelete={() => { removePrayer(sheet.prayer.id); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  screen: { flex: 1 },
  flex: { flex: 1 },

  // library header
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  headerBack: { marginBottom: 10 },
  bigTitle: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
  bigSub: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 3 },

  listBody: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
  sectionHint: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },
  editBtn: { padding: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary + '77', borderStyle: 'dashed' },
  addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },

  list: { gap: 10 },
  card: { backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: isDark ? 1 : 0, borderColor: 'transparent', ...shadows.sm, ...darkCard },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  preview: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textSecondary, lineHeight: 20, marginTop: 6 },

  // read view (morph overlay is the read container)
  overlayCard: { position: 'absolute', backgroundColor: c.surface, overflow: 'hidden', borderWidth: isDark ? 1 : 0, borderColor: 'transparent', ...shadows.md, ...darkCard },
  overlayRow: { position: 'absolute', top: 0, left: 0, padding: 16 },
  readHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  readActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aaBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  aaLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  overlayScroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 28 },
  readCardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 18, letterSpacing: -0.3, color: c.text },
  readDivider: { height: 1, backgroundColor: c.divider, marginTop: 14, marginBottom: 16 },
  prayerPara: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26, color: c.text, marginBottom: 14 },
  prayerIntro: { fontFamily: fontFamily.regularItalic, marginBottom: 18 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border },
  sourceText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: c.textMuted },
  });
};
