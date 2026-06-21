import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ChevronLeft, Play, Pause, Plus, Minus, X } from 'lucide-react-native';

import { fontFamily } from '@/constants/designTokens';
import { useMeditation, SOUNDS } from '@/hooks/use-meditation-store';
import { useMeditationScenes, type MeditationScene } from '@/hooks/useMeditationScenes';
import { useDailies } from '@/hooks/use-dailies-store';

// Bundled offline/loading fallback for the scene background.
const SCENE_FALLBACK = require('@/assets/images/meditation-hero1.webp');

// Immersive timer theme (prototype `imgPier`) — its own fixed dark environment;
// intentionally does NOT follow the app's Light/Dark setting.
const TH = {
  shell: '#0E1A33',
  ink: '#FFFFFF',
  ink2: 'rgba(255,255,255,0.76)',
  ringFrom: '#FFFFFF',
  ringTo: '#9FC4E8',
  ringTrack: 'rgba(255,255,255,0.20)',
  glow: 'rgba(207,224,242,0.30)',
  chipBg: 'rgba(255,255,255,0.12)',
  chipBorder: 'rgba(255,255,255,0.26)',
  chipSelBg: 'rgba(255,255,255,0.92)',
  chipSelText: '#16223C',
  soundSelBg: 'rgba(255,255,255,0.22)',
  soundSelBorder: 'rgba(255,255,255,0.55)',
  glassBg: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.26)',
  primaryBg: 'rgba(255,255,255,0.95)',
  primaryText: '#16223C',
  ghostBorder: 'rgba(255,255,255,0.30)',
};

const PRESETS = [5, 10, 15, 20];
const clampMin = (n: number) => Math.max(1, Math.min(90, n));
const pad = (n: number) => String(n).padStart(2, '0');
const fmtMMSS = (sec: number) => `${pad(Math.floor(Math.max(0, sec) / 60))}:${pad(Math.max(0, sec) % 60)}`;
const fmtMin = (m: number) => `${pad(m)}:00`;

function TimerRing({ progress, big, label, pulsing }: { progress: number; big: string; label?: string; pulsing?: boolean }) {
  const R = 128;
  const C = 2 * Math.PI * R;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulsing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={styles.ringWrap}>
      {pulsing && <Animated.View style={[styles.glow, { transform: [{ scale }], opacity }]} />}
      <Svg width={296} height={296} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="medRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={TH.ringFrom} />
            <Stop offset="1" stopColor={TH.ringTo} />
          </SvgGradient>
        </Defs>
        <Circle cx={148} cy={148} r={R} fill="none" stroke={TH.ringTrack} strokeWidth={9} />
        <Circle
          cx={148}
          cy={148}
          r={R}
          fill="none"
          stroke="url(#medRing)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringBig}>{big}</Text>
        {label ? <Text style={styles.ringLabel}>{label}</Text> : null}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress, wide }: { label: string; on: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        wide && { paddingHorizontal: 16 },
        { backgroundColor: on ? TH.chipSelBg : TH.chipBg, borderColor: on ? TH.chipSelBg : TH.chipBorder },
      ]}
    >
      <Text style={[styles.chipText, { color: on ? TH.chipSelText : TH.ink }]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(clampMin(value - 1))}>
        <Minus size={17} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepNum}>{value}</Text>
      </View>
      <Pressable style={styles.stepBtn} onPress={() => onChange(clampMin(value + 1))}>
        <Plus size={17} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function TopBar({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable style={styles.topBtn} onPress={onClose} accessibilityLabel="Close">
        <ChevronLeft size={20} color={TH.ink} />
      </Pressable>
      <Text style={styles.topTitle}>Meditation</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

// Horizontal snap carousel of scenes — swipe (or tap a neighbour) to select.
// Centered item is the selection; the screen background follows it. Scales to
// any number of scenes without crowding (replaces the soundtrack chip row).
function SceneCarousel({ scenes, selectedKey, onSelect }: { scenes: MeditationScene[]; selectedKey: string; onSelect: (key: string) => void }) {
  const { width } = useWindowDimensions();
  const ITEM_W = Math.round(width * 0.5);
  const listRef = useRef<FlatList<MeditationScene>>(null);
  const selectedIndex = Math.max(0, scenes.findIndex((s) => s.key === selectedKey));

  return (
    <View>
      <FlatList
        ref={listRef}
        data={scenes}
        keyExtractor={(s) => s.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - ITEM_W) / 2 }}
        getItemLayout={(_, i) => ({ length: ITEM_W, offset: ITEM_W * i, index: i })}
        initialScrollIndex={selectedIndex}
        onScrollToIndexFailed={() => {}}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
          const scene = scenes[idx];
          if (scene && scene.key !== selectedKey) onSelect(scene.key);
        }}
        renderItem={({ item, index }) => {
          const active = item.key === selectedKey;
          return (
            <Pressable
              onPress={() => {
                listRef.current?.scrollToIndex({ index, animated: true });
                onSelect(item.key);
              }}
              style={[styles.sceneItem, { width: ITEM_W }]}
            >
              <Text style={[styles.sceneName, { color: active ? TH.ink : TH.ink2, opacity: active ? 1 : 0.5, fontSize: active ? 20 : 15 }]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />
      <View style={styles.dots}>
        {scenes.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === selectedIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

type Phase = 'ready' | 'active' | 'complete';

export default function MeditationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dailyId?: string }>();
  const med = useMeditation();
  const dailies = useDailies();

  const cfg = med.settings.timer;
  const firstTime = med.settings.source === null && !med.settings.hintSeen;

  const [phase, setPhase] = useState<Phase>('ready');
  const [minutes, setMinutes] = useState(cfg.minutes);
  const [sound, setSound] = useState<string>(cfg.sound);
  const [remaining, setRemaining] = useState(cfg.minutes * 60);
  const [paused, setPaused] = useState(false);
  const [doneMin, setDoneMin] = useState(cfg.minutes);
  const [hintDismissed, setHintDismissed] = useState(false);
  const isCustom = !PRESETS.includes(minutes);

  // Scenes — from Supabase when loaded, else the bundled defaults so the carousel
  // is never empty. The selected scene drives the background still.
  const scenes = useMeditationScenes();
  const sceneList = Object.values(scenes);
  const carouselScenes: MeditationScene[] =
    sceneList.length > 0
      ? sceneList
      : SOUNDS.map((s) => ({ key: s.id, name: s.label, stillUri: null, animatedUri: null, audioUri: null }));
  const sceneStill = scenes[sound]?.stillUri ?? null;
  const sceneAnimated = scenes[sound]?.animatedUri ?? null; // animated webp/video, if any
  const currentScene = carouselScenes.find((s) => s.key === sound);

  // Ken Burns — slow continuous pan/zoom that gives the still life.
  const kb = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(kb, { toValue: 1, duration: 22000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(kb, { toValue: 0, duration: 22000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [kb]);
  const kbStyle = {
    transform: [
      { scale: kb.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.18] }) },
      { translateX: kb.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
      { translateY: kb.interpolate({ inputRange: [0, 1], outputRange: [8, -8] }) },
    ],
  };

  const markMeditationDone = () => {
    const id = params.dailyId || dailies.program.find((d) => d.action === 'meditation')?.id;
    if (id) dailies.markDone(id);
  };

  // countdown
  useEffect(() => {
    if (phase !== 'active' || paused) return;
    if (remaining <= 0) {
      setDoneMin(minutes);
      setPhase('complete');
      markMeditationDone();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, remaining]);

  const begin = () => {
    med.setTimer({ minutes, sound });
    if (firstTime) med.markHintSeen();
    setRemaining(minutes * 60);
    setPaused(false);
    setPhase('active');
  };
  const endEarly = () => {
    setDoneMin(minutes);
    setPhase('complete');
    markMeditationDone();
  };
  const sitLonger = () => {
    setMinutes(5);
    setRemaining(5 * 60);
    setDoneMin(5);
    setPaused(false);
    setPhase('active');
  };

  const pickMinutes = (n: number) => {
    setMinutes(n);
    setRemaining(n * 60);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {sceneAnimated ? (
        // Real motion already baked in — play it, no Ken Burns.
        <Image
          source={{ uri: sceneAnimated }}
          placeholder={SCENE_FALLBACK}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        // Still image — give it life with a slow Ken Burns pan/zoom.
        <Animated.View style={[StyleSheet.absoluteFill, kbStyle]}>
          <Image
            source={sceneStill ? { uri: sceneStill } : SCENE_FALLBACK}
            placeholder={SCENE_FALLBACK}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        </Animated.View>
      )}
      <LinearGradient
        colors={['rgba(8,14,32,0.28)', 'rgba(8,14,32,0)', 'rgba(8,14,32,0.42)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar onClose={() => router.back()} />

        {phase === 'ready' && (
          <>
            {firstTime && !hintDismissed && (
              <View style={styles.hint}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hintTitle}>Using the built-in timer</Text>
                  <Text style={styles.hintBody}>A calm photo timer with placeholder soundtracks. More options later.</Text>
                </View>
                <Pressable onPress={() => setHintDismissed(true)} hitSlop={8}>
                  <X size={15} color={TH.ink2} />
                </Pressable>
              </View>
            )}
            <View style={styles.center}>
              <TimerRing progress={1} big={fmtMin(minutes)} label="MINUTES" />
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>LENGTH</Text>
                <View style={styles.chipRow}>
                  {PRESETS.map((n) => (
                    <Chip key={n} label={String(n)} on={n === minutes} onPress={() => pickMinutes(n)} />
                  ))}
                  <Chip label={isCustom ? String(minutes) : 'Custom'} on={isCustom} wide onPress={() => pickMinutes(isCustom ? minutes : 25)} />
                </View>
                {isCustom && (
                  <View style={{ marginTop: 14 }}>
                    <Stepper value={minutes} onChange={pickMinutes} />
                  </View>
                )}
              </View>
              <View style={styles.sceneSection}>
                <Text style={styles.sectionLabel}>SCENE</Text>
                <SceneCarousel scenes={carouselScenes} selectedKey={sound} onSelect={setSound} />
              </View>
            </View>
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={begin}>
                <Play size={17} color={TH.primaryText} />
                <Text style={styles.primaryText}>Begin</Text>
              </Pressable>
            </View>
          </>
        )}

        {phase === 'active' && (
          <>
            <View style={styles.center}>
              <Text style={styles.breatheLabel}>{paused ? 'PAUSED' : 'BREATHE'}</Text>
              <TimerRing progress={minutes ? remaining / (minutes * 60) : 0} big={fmtMMSS(remaining)} pulsing={!paused} />
              {sound !== 'silence' ? (
                <View style={styles.soundPill}>
                  <Text style={styles.soundPillText}>{currentScene?.name ?? sound}</Text>
                </View>
              ) : (
                <View style={{ height: 35 }} />
              )}
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.endBtn} onPress={endEarly} accessibilityLabel="End">
                <View style={styles.stopSquare} />
              </Pressable>
              <Pressable style={styles.playBtn} onPress={() => setPaused((p) => !p)} accessibilityLabel={paused ? 'Resume' : 'Pause'}>
                {paused ? <Play size={30} color={TH.primaryText} /> : <Pause size={30} color={TH.primaryText} />}
              </Pressable>
              <View style={{ width: 60 }} />
            </View>
          </>
        )}

        {phase === 'complete' && (
          <>
            <View style={[styles.center, { paddingHorizontal: 30 }]}>
              <View style={styles.completeBadgeWrap}>
                <View style={styles.completeGlow} />
                <View style={styles.completeBadge}>
                  <Text style={styles.completeCheck}>✓</Text>
                </View>
              </View>
              <Text style={styles.completeTitle}>Nicely done</Text>
              <Text style={styles.completeBody}>
                {doneMin} minute{doneMin === 1 ? '' : 's'} of stillness.{'\n'}Marked complete on Today.
              </Text>
            </View>
            <View style={[styles.footer, { gap: 11 }]}>
              <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={sitLonger}>
                <Text style={styles.ghostText}>Sit a little longer</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TH.shell },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  footer: { paddingHorizontal: 22, paddingBottom: 24 },

  topBar: { paddingHorizontal: 14, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: TH.glassBorder, backgroundColor: TH.glassBg, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fontFamily.semiBold, fontSize: 13, letterSpacing: 0.3, color: TH.ink2 },

  hint: { marginHorizontal: 18, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: TH.soundSelBg, borderWidth: 1, borderColor: TH.soundSelBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  hintTitle: { fontFamily: fontFamily.semiBold, fontSize: 13, color: TH.ink },
  hintBody: { fontFamily: fontFamily.regular, fontSize: 12, color: TH.ink2, marginTop: 2, lineHeight: 17 },

  ringWrap: { width: 296, height: 296, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 236, height: 236, borderRadius: 118, backgroundColor: TH.glow },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringBig: { fontFamily: fontFamily.display, fontSize: 64, color: TH.ink, letterSpacing: -1, lineHeight: 66, fontVariant: ['tabular-nums'] },
  ringLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, letterSpacing: 2.5, color: TH.ink2, marginTop: 10 },

  section: { width: '100%', paddingHorizontal: 22 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8, color: TH.ink2, textAlign: 'center', marginBottom: 13 },
  chipRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  chip: { minWidth: 50, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  chipText: { fontFamily: fontFamily.bold, fontSize: 14 },

  sceneSection: { width: '100%' },
  sceneItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  sceneName: { fontFamily: fontFamily.display, textAlign: 'center', letterSpacing: -0.2 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.30)' },
  dotActive: { width: 18, backgroundColor: 'rgba(255,255,255,0.9)' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: TH.glassBorder, backgroundColor: TH.glassBg, alignItems: 'center', justifyContent: 'center' },
  stepValue: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  stepNum: { fontFamily: fontFamily.display, fontSize: 26, color: TH.ink, fontVariant: ['tabular-nums'] },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 17, borderRadius: 999, backgroundColor: TH.primaryBg },
  primaryText: { fontFamily: fontFamily.bold, fontSize: 16, color: TH.primaryText, letterSpacing: 0.2 },
  ghostBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: TH.ghostBorder },
  ghostText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: TH.ink2 },

  breatheLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, letterSpacing: 2.5, color: TH.ink2 },
  soundPill: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: TH.soundSelBg, borderWidth: 1, borderColor: TH.soundSelBorder },
  soundPillText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: TH.ink },

  controls: { paddingHorizontal: 22, paddingBottom: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  endBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: TH.ghostBorder, backgroundColor: TH.glassBg, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 16, height: 16, borderRadius: 3, backgroundColor: TH.ink },
  playBtn: { width: 86, height: 86, borderRadius: 43, backgroundColor: TH.primaryBg, alignItems: 'center', justifyContent: 'center' },

  completeBadgeWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  completeGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: TH.glow },
  completeBadge: { width: 92, height: 92, borderRadius: 46, backgroundColor: TH.primaryBg, alignItems: 'center', justifyContent: 'center' },
  completeCheck: { fontSize: 44, color: TH.primaryText, lineHeight: 50, marginTop: -2 },
  completeTitle: { fontFamily: fontFamily.display, fontSize: 30, color: TH.ink, letterSpacing: -0.4 },
  completeBody: { fontFamily: fontFamily.regular, fontSize: 14.5, color: TH.ink2, marginTop: 8, lineHeight: 22, textAlign: 'center' },
});
