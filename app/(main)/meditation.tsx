import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, Easing, PanResponder, Switch, Keyboard, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ChevronLeft, Play, Pause, Plus, Minus, X, SlidersHorizontal } from 'lucide-react-native';

import { fontFamily } from '@/constants/designTokens';
import { useMeditation, SOUNDS } from '@/hooks/use-meditation-store';
import { useMeditationSession } from '@/hooks/use-meditation-session';
import { useMeditationScenes, type MeditationScene } from '@/hooks/useMeditationScenes';

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
  // Top-bar chrome sits over arbitrary scene photos — bright skies included —
  // where a 12%-white glass pill leaves a white glyph invisible. Solid white
  // with the dark glyph, same as Begin and the selected chips.
  topBtnBg: 'rgba(255,255,255,0.95)',
  topBtnBorder: 'rgba(255,255,255,0.95)',
  topBtnInk: '#16223C',
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

// Custom length: type a value in the field OR nudge it with +/-. Both paths clamp
// to 1–90. The field keeps its own text while editing (so it can be briefly empty)
// and commits a clamped number on blur/submit.
function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    const n = parseInt(text, 10);
    const clamped = clampMin(Number.isFinite(n) ? n : value);
    setText(String(clamped));
    onChange(clamped);
  };
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(clampMin(value - 1))}>
        <Minus size={17} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
      <TextInput
        style={styles.stepInput}
        value={text}
        onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 2))}
        onEndEditing={commit}
        onBlur={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={2}
        selectTextOnFocus
        textAlign="center"
        selectionColor={TH.ink}
        accessibilityLabel="Custom minutes"
      />
      <Pressable style={styles.stepBtn} onPress={() => onChange(clampMin(value + 1))}>
        <Plus size={17} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

// Drag-anywhere volume slider (PanResponder — no native dep, so this stays OTA-able).
// onChange fires live during the drag (for immediate audible feedback); onComplete
// fires once on release with the final value (for persistence).
function VolumeSlider({ value, onChange, onComplete }: { value: number; onChange: (v: number) => void; onComplete: (v: number) => void }) {
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(0);
  const last = useRef(value);
  last.current = value;
  const apply = (x: number) => {
    const w = trackW.current || 1;
    const v = Math.max(0, Math.min(1, x / w));
    last.current = v;
    onChange(v);
  };
  const applyPageX = (pageX: number) => apply(pageX - trackX.current);
  const measureTrack = () => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackX.current = x;
      trackW.current = width;
    });
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Android can report locationX relative to a child under the finger,
      // making the value jump from zero to full volume near the knob. pageX is
      // stable for the entire gesture; subtract the measured track origin.
      onPanResponderGrant: (e) => {
        measureTrack();
        applyPageX(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => applyPageX(e.nativeEvent.pageX),
      onPanResponderRelease: () => onComplete(last.current),
      onPanResponderTerminate: () => onComplete(last.current),
    }),
  ).current;
  const step = (delta: number) => {
    const next = Math.max(0, Math.min(1, Math.round((value + delta) * 20) / 20));
    last.current = next;
    onChange(next);
    onComplete(next);
  };
  const pct = `${Math.round(value * 100)}%` as `${number}%`;
  return (
    <View style={styles.volRow}>
      <Pressable
        style={[styles.volStepBtn, value <= 0 && styles.volStepBtnDisabled]}
        onPress={() => step(-0.05)}
        disabled={value <= 0}
        accessibilityRole="button"
        accessibilityLabel="Decrease scene volume"
      >
        <Minus size={16} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
      <View
        ref={trackRef}
        style={styles.volTrack}
        onLayout={() => requestAnimationFrame(measureTrack)}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={styles.volBar} />
        <View pointerEvents="none" style={[styles.volFill, { width: pct }]} />
        <View pointerEvents="none" style={[styles.volKnob, { left: pct }]} />
      </View>
      <Pressable
        style={[styles.volStepBtn, value >= 1 && styles.volStepBtnDisabled]}
        onPress={() => step(0.05)}
        disabled={value >= 1}
        accessibilityRole="button"
        accessibilityLabel="Increase scene volume"
      >
        <Plus size={16} color={TH.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function TopBar({ onClose, onPrefs }: { onClose: () => void; onPrefs: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable style={styles.topBtn} onPress={onClose} accessibilityLabel="Close">
        <ChevronLeft size={20} color={TH.topBtnInk} />
      </Pressable>
      <Text style={styles.topTitle}>Meditation</Text>
      <Pressable style={styles.topBtn} onPress={onPrefs} accessibilityLabel="Preferences">
        <SlidersHorizontal size={18} color={TH.topBtnInk} />
      </Pressable>
    </View>
  );
}

export default function MeditationScreen() {
  const router = useRouter();
  const med = useMeditation();
  const session = useMeditationSession();

  const cfg = med.settings.timer;
  const firstTime = med.settings.source === null && !med.settings.hintSeen;

  // Setup-screen selections — only used while no sit is running. Once a sit is
  // live the UI reads everything from the global session (so returning to this
  // screen mid-sit shows the running timer, not a fresh setup).
  const [selMinutes, setSelMinutes] = useState(cfg.minutes);
  const [selKey, setSelKey] = useState<string>(cfg.sound);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const isSetup = session.phase === 'ready';
  const isCustom = !PRESETS.includes(selMinutes);

  // Scenes — from Supabase when loaded, else the bundled defaults so the picker
  // is never empty. The selected scene drives the background AND the ambience bed.
  const scenes = useMeditationScenes();
  const sceneList = Object.values(scenes);
  const sceneOptions: MeditationScene[] =
    sceneList.length > 0
      ? sceneList
      : SOUNDS.map((s) => ({ key: s.id, name: s.label, stillUri: null, animatedUri: null, audioSource: null }));

  // First-time users land on a real background scene (the experience should begin
  // immediately) — default to the first scene that actually has a soundtrack.
  const firstAudioKey = sceneOptions.find((s) => s.audioSource)?.key ?? null;
  const didHydrateSettings = useRef(false);
  useEffect(() => {
    if (med.isLoading || didHydrateSettings.current) return;
    setSelMinutes(cfg.minutes);
    setSelKey(firstTime && firstAudioKey ? firstAudioKey : cfg.sound);
    didHydrateSettings.current = true;
  }, [med.isLoading, cfg.minutes, cfg.sound, firstTime, firstAudioKey]);

  const selScene = sceneOptions.find((s) => s.key === selKey);
  const sceneStill = selScene?.stillUri ?? null;
  const sceneAnimated = selScene?.animatedUri ?? null; // animated webp/video, if any
  const selAudioSource = selScene?.audioSource ?? null;
  const selName = selScene?.name ?? selKey;

  const minutes = isSetup ? selMinutes : session.minutes;
  const paused = session.paused;

  // Ken Burns — slow continuous pan/zoom that gives the still life.
  const kb = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(kb, { toValue: 1, duration: 34000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(kb, { toValue: 0, duration: 34000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [kb]);
  const kbStyle = {
    transform: [
      { scale: kb.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.20] }) },
      { translateX: kb.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) },
      { translateY: kb.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) },
    ],
  };

  // Ambience follows the meditation SCREEN + selected scene: start/swap on focus
  // and on scene change, pause when navigating away. Locking the phone keeps the
  // screen focused, so the bed keeps playing then (background audio in the provider).
  // Pausing retains the loaded soundtrack, so returning resumes immediately.
  // The saved volume preference seeds the session via startAmbience's volume arg.
  const { startAmbience, pauseAmbience, stopAmbience } = session;
  const startVolumeRef = useRef(cfg.volume ?? 0.35);
  startVolumeRef.current = cfg.volume ?? 0.35;
  const playOutsideRef = useRef(med.settings.playOutsidePage);
  playOutsideRef.current = med.settings.playOutsidePage;
  useFocusEffect(
    useCallback(() => {
      if (selAudioSource) {
        startAmbience({ sceneKey: selKey, sceneName: selName, audioSource: selAudioSource, volume: startVolumeRef.current });
      } else {
        stopAmbience();
      }
      // Leaving the page pauses the bed — unless "play outside this page" is on.
      // (Device sleep/lock keeps the page focused, so this cleanup doesn't run then.)
      return () => { if (!playOutsideRef.current) pauseAmbience(); };
    }, [selKey, selAudioSource, selName, startAmbience, pauseAmbience, stopAmbience]),
  );

  // Begin only starts the countdown — the ambience is already playing.
  const begin = () => {
    med.setTimer({ minutes: selMinutes, sound: selKey, volume: session.volume });
    if (firstTime) med.markHintSeen();
    session.begin(selMinutes);
  };
  // "Done" ends the sit and closes the feature, back to Today. The session is
  // context-backed, so stop() first — otherwise the next visit would reopen on
  // a stale completion screen. The focus-effect cleanup handles the ambience
  // bed (it keeps playing only if "play outside this page" is on).
  const done = () => {
    session.stop();
    router.back();
  };
  const pickMinutes = (n: number) => setSelMinutes(n);
  // A scene begins playing as soon as it is selected, so that selection is
  // already the user's last-used scene even if they leave before tapping Begin.
  // Previously only begin() persisted it, which made the next visit fall back
  // to Silence after sampling a different ambience.
  const pickScene = (key: string) => {
    setSelKey(key);
    med.setTimer({ sound: key });
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
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TopBar onClose={() => router.back()} onPrefs={() => setShowPrefs(true)} />

        {isSetup && (
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
            <Pressable style={styles.center} onPress={() => Keyboard.dismiss()} accessible={false}>
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
                {/* Pills, not a carousel — every scene visible at once (the old
                    swipe carousel hid all but the neighbours, so scenes were
                    hard to discover). Selection drives background + ambience. */}
                <View style={styles.chipRow}>
                  {sceneOptions.map((s) => (
                    <Chip key={s.key} label={s.name} on={s.key === selKey} onPress={() => pickScene(s.key)} />
                  ))}
                </View>
              </View>
            </Pressable>
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={begin}>
                <Play size={17} color={TH.primaryText} />
                <Text style={styles.primaryText}>Begin</Text>
              </Pressable>
            </View>
          </>
        )}

        {session.phase === 'active' && (
          <>
            <View style={styles.center}>
              <Text style={styles.breatheLabel}>{paused ? 'PAUSED' : 'BREATHE'}</Text>
              <TimerRing progress={session.minutes ? session.remaining / (session.minutes * 60) : 0} big={fmtMMSS(session.remaining)} pulsing={!paused} />
              {selKey !== 'silence' ? (
                <View style={styles.soundPill}>
                  <Text style={styles.soundPillText}>{selName}</Text>
                </View>
              ) : (
                <View style={{ height: 35 }} />
              )}
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.endBtn} onPress={session.stop} accessibilityLabel="Stop">
                <View style={styles.stopSquare} />
              </Pressable>
              <Pressable style={styles.playBtn} onPress={session.togglePause} accessibilityLabel={paused ? 'Resume' : 'Pause'}>
                {paused ? <Play size={30} color={TH.primaryText} /> : <Pause size={30} color={TH.primaryText} />}
              </Pressable>
              <View style={{ width: 60 }} />
            </View>
          </>
        )}

        {session.phase === 'complete' && (
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
                {session.doneMin} minute{session.doneMin === 1 ? '' : 's'} of stillness.{'\n'}Marked complete on Today.
              </Text>
            </View>
            <View style={styles.footer}>
              <Pressable style={styles.primaryBtn} onPress={done}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </View>
          </>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showPrefs && (
        <View style={styles.prefsOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPrefs(false)} accessibilityLabel="Close preferences" />
          <SafeAreaView edges={['bottom']} style={styles.prefsPanel}>
            <View style={styles.prefsHeader}>
              <Text style={styles.prefsTitle}>Preferences</Text>
              <Pressable onPress={() => setShowPrefs(false)} hitSlop={10}>
                <X size={18} color={TH.ink2} />
              </Pressable>
            </View>

            <Text style={styles.prefsLabel}>SCENE VOLUME</Text>
            <VolumeSlider value={session.volume} onChange={session.setVolume} onComplete={(v) => med.setTimer({ volume: v })} />

            <View style={styles.prefsDivider} />

            <View style={styles.prefsRow}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text style={styles.prefsRowTitle}>Play outside this page</Text>
                <Text style={styles.prefsRowSub}>Keep the scene playing as you move around the app. It always stops when the app closes.</Text>
              </View>
              <Switch
                value={med.settings.playOutsidePage}
                onValueChange={med.setPlayOutsidePage}
                trackColor={{ false: 'rgba(255,255,255,0.20)', true: 'rgba(255,255,255,0.55)' }}
                thumbColor={TH.ink}
                ios_backgroundColor="rgba(255,255,255,0.20)"
              />
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TH.shell },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  footer: { paddingHorizontal: 22, paddingBottom: 24 },

  topBar: { paddingHorizontal: 14, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: TH.topBtnBorder, backgroundColor: TH.topBtnBg, alignItems: 'center', justifyContent: 'center' },
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

  sceneSection: { width: '100%', paddingHorizontal: 22 },

  prefsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(6,12,26,0.55)' },
  prefsPanel: { backgroundColor: '#16223C', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10, borderTopWidth: 1, borderColor: TH.glassBorder },
  prefsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  prefsTitle: { fontFamily: fontFamily.display, fontSize: 20, color: TH.ink },
  prefsLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8, color: TH.ink2, textAlign: 'center', marginBottom: 14 },
  prefsDivider: { height: 1, backgroundColor: TH.glassBorder, marginVertical: 22 },
  prefsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prefsRowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: TH.ink },
  prefsRowSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: TH.ink2, marginTop: 4, lineHeight: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: TH.glassBorder, backgroundColor: TH.glassBg, alignItems: 'center', justifyContent: 'center' },
  stepInput: { minWidth: 64, paddingVertical: 0, textAlign: 'center', fontFamily: fontFamily.display, fontSize: 26, color: TH.ink, fontVariant: ['tabular-nums'] },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 17, borderRadius: 999, backgroundColor: TH.primaryBg },
  primaryText: { fontFamily: fontFamily.bold, fontSize: 16, color: TH.primaryText, letterSpacing: 0.2 },

  breatheLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, letterSpacing: 2.5, color: TH.ink2 },
  soundPill: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: TH.soundSelBg, borderWidth: 1, borderColor: TH.soundSelBorder },
  soundPillText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: TH.ink },

  volRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 280, alignSelf: 'center' },
  volStepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: TH.glassBorder, backgroundColor: TH.glassBg, alignItems: 'center', justifyContent: 'center' },
  volStepBtnDisabled: { opacity: 0.38 },
  volTrack: { flex: 1, height: 34, justifyContent: 'center' },
  volBar: { position: 'absolute', left: 0, right: 0, top: 15, height: 4, borderRadius: 2, backgroundColor: TH.ringTrack },
  volFill: { position: 'absolute', left: 0, top: 15, height: 4, borderRadius: 2, backgroundColor: TH.ink },
  volKnob: { position: 'absolute', top: 8, width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: TH.ink },

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
