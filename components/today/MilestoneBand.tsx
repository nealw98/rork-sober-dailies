// Sobriety-milestone recognition band (design D5, July 2026). On a milestone
// day this full-bleed terracotta strip sits between the Today counter and the
// Daily Reflection hero and replays the celebration takeover on tap.
//
// Full-bleed by design: a strip that breaks the page gutters reads as a message
// interrupting the page, where a pill would read as a control competing with the
// page title. Terracotta (not rose) because rose is reserved for Pass It On —
// on a milestone day the header would otherwise carry two unrelated rose
// elements inches apart.
//
// The takeover has already auto-played by the time this shows, so the band never
// has to explain WHAT replays — only where to tap. The looping arrow says
// "again" (a chevron would promise navigation), and the motion is what makes it
// self-evidently interactive without a label.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { PartyPopper, RotateCcw } from 'lucide-react-native';
import { fontFamily, spacing, gradients } from '@/constants/designTokens';

// Page gutter this band cancels to reach the screen edges. Both the Today
// ScrollView and DailiesEditor's content container use 22 — if either changes,
// this has to change with it.
const PAGE_GUTTER = 22;

const LOOP_MS = 3800;

export function MilestoneBand({ label, onPress }: { label: string; onPress: () => void }) {
  const isFocused = useIsFocused();
  const [reduceMotion, setReduceMotion] = useState(false);

  const loop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // One driver for both motions, stopped when the screen isn't focused so the
  // loop isn't burning frames under other tabs.
  useEffect(() => {
    if (reduceMotion || !isFocused) return;
    loop.setValue(0);
    const anim = Animated.loop(
      Animated.timing(loop, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => { anim.stop(); loop.setValue(0); };
  }, [reduceMotion, isFocused, loop]);

  const animate = !reduceMotion;

  // Popper flick, once per cycle — the only motion on the band. (A light sweep
  // across the strip was tried and cut: it read as a loading shimmer.)
  const popScale = loop.interpolate({
    inputRange: [0, 0.86, 0.9, 0.95, 1],
    outputRange: [1, 1, 1.2, 1.06, 1],
    extrapolate: 'clamp',
  });
  const popRotate = loop.interpolate({
    inputRange: [0, 0.86, 0.9, 0.95, 1],
    outputRange: ['0deg', '0deg', '-8deg', '0deg', '0deg'],
    extrapolate: 'clamp',
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.band, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} sober today. Tap to celebrate again`}
    >
      {/* The takeover's own gradient — tap the blue-teal strip, the blue-teal
          takeover opens. Same stops, near-diagonal like the full-screen one. */}
      <LinearGradient
        colors={[...gradients.celebration]}
        start={{ x: 0.02, y: 0 }}
        end={{ x: 0.98, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={animate ? { transform: [{ scale: popScale }, { rotate: popRotate }] } : undefined}>
        <PartyPopper size={16} color="#fff" strokeWidth={2.2} />
      </Animated.View>
      <Text style={styles.text}>{`${label.toUpperCase()} SOBER TODAY`}</Text>

      {/* Absolutely positioned so the message stays optically centred on the
          band. Don't widen this without reserving its width on both sides — a
          wider variant collides with the last letters of "TODAY".
          Centred by a full-height rail rather than top:'50%' + translateY:
          the percentage resolves against the padding box, which left the
          circle sitting low. */}
      <View style={styles.replayRail} pointerEvents="none">
        <View style={styles.replay}>
          <RotateCcw size={15} color="#fff" strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    marginHorizontal: -PAGE_GUTTER,
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: PAGE_GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    overflow: 'hidden',
  },
  text: { fontFamily: fontFamily.bold, fontSize: 12.5, letterSpacing: 1.5, color: '#fff' },
  replayRail: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' },
  replay: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MilestoneBand;
