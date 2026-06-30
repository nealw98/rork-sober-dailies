// Prayers — library list → read view (redesign 3.0). Tapping a prayer morphs
// the tapped list card into a full-size white container that takes over the
// page (a shared-element-style expand), with the body revealing as it grows.
// Content is the existing constants/prayers.ts (unchanged). Custom prayers are
// a separate net-new feature — not built here.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, BookOpen, X } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { aaPrayers } from '@/constants/prayers';
import { fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const TOP_GAP = 8; // small inset above the read container (the X close sits inside it)
const SIDE = 20; // horizontal page margin = the read container's left/right inset
const DUR = 340;

type Rect = { x: number; y: number; w: number; h: number };
type Mode = 'list' | 'opening' | 'read' | 'closing';

// The prayer body — shared by the morph overlay (it IS the read view once open).
const MORNING_INTRO = 'As I begin this day, I ask my Higher Power:';

function PrayerBody({ prayer }: { prayer: (typeof aaPrayers)[number] }) {
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
      {intro && <Text style={[styles.prayerPara, styles.prayerIntro]}>{intro}</Text>}
      {paras.map((para, i) => (
        <Text key={i} style={styles.prayerPara}>{para.trim()}</Text>
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
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [source, setSource] = useState<Rect | null>(null);
  const cardRefs = useRef<Array<View | null>>([]);

  useScreenTimeTracking('Prayers');

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

  const prayer = selected !== null ? aaPrayers[selected] : null;

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
                <Pressable onPress={closeRead} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close prayer" style={styles.closeBtn}>
                  <X size={18} color={c.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
              <ScrollView scrollEnabled={mode === 'read'} showsVerticalScrollIndicator={mode === 'read'} contentContainerStyle={styles.overlayScroll}>
                <PrayerBody prayer={prayer} />
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  screen: { flex: 1 },
  flex: { flex: 1 },

  // library header
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerBack: { marginBottom: 10 },
  bigTitle: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
  bigSub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },

  listBody: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
  sectionHint: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },

  list: { gap: 10 },
  card: { backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, ...shadows.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  preview: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textSecondary, lineHeight: 20, marginTop: 6 },

  // read view (morph overlay is the read container)
  overlayCard: { position: 'absolute', backgroundColor: c.surface, overflow: 'hidden', ...shadows.md },
  overlayRow: { position: 'absolute', top: 0, left: 0, padding: 16 },
  readHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  overlayScroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 28 },
  readCardTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 18, letterSpacing: -0.3, color: c.text },
  readDivider: { height: 1, backgroundColor: c.divider, marginTop: 14, marginBottom: 16 },
  prayerPara: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26, color: c.text, marginBottom: 14 },
  prayerIntro: { fontFamily: fontFamily.regularItalic, marginBottom: 18 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border },
  sourceText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: c.textMuted },
});
