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
import { PartyPopper, RotateCcw } from 'lucide-react-native';
import { fontFamily, spacing } from '@/constants/designTokens';
import { useTokens } from '@/hooks/useTokens';

// Page gutter this band cancels to reach the screen edges. Both the Today
// ScrollView and DailiesEditor's content container use 22 — if either changes,
// this has to change with it.
const PAGE_GUTTER = 22;

const LOOP_MS = 3800;

export function MilestoneBand({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTokens();
  const isFocused = useIsFocused();
  const [reduceMotion, setReduceMotion] = useState(false);
  // Band width drives the sweep distance; until it's measured the sweep stays put.
  const [bandWidth, setBandWidth] = useState(0);

  const loop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // One driver for both motions, stopped when the screen isn't focused so the
  // loop isn't burning frames under other tabs.
  useEffect(() => {
    if (reduceMotion || !isFocused || bandWidth === 0) return;
    loop.setValue(0);
    const anim = Animated.loop(
      Animated.timing(loop, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => { anim.stop(); loop.setValue(0); };
  }, [reduceMotion, isFocused, bandWidth, loop]);

  const animate = !reduceMotion && bandWidth > 0;

  // Sweep: crosses in the first half of the cycle, then parks offscreen for the
  // second half. The pause matters — a continuous sweep reads as a loading
  // shimmer rather than a celebration.
  const sweepX = loop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-bandWidth * 0.7, bandWidth * 2, bandWidth * 2],
    extrapolate: 'clamp',
  });

  // Popper flick lands just AFTER the sweep has passed, so the band reads as
  // sweep-then-wink rather than two things happening at once.
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
      onPress={onPress}
      onLayout={(e) => setBandWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.band, { backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} sober today. Tap to celebrate again`}
    >
      {animate && (
        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, { transform: [{ translateX: sweepX }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.26)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <Animated.View style={animate ? { transform: [{ scale: popScale }, { rotate: popRotate }] } : undefined}>
        <PartyPopper size={16} color="#fff" strokeWidth={2.2} />
      </Animated.View>
      <Text style={styles.text}>{`${label.toUpperCase()} SOBER TODAY`}</Text>

      {/* Absolutely positioned so the message stays optically centred on the
          band. Don't widen this without reserving its width on both sides — a
          wider variant collides with the last letters of "TODAY". */}
      <View style={styles.replay} pointerEvents="none">
        <RotateCcw size={15} color="#fff" strokeWidth={2.2} />
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
  sweep: { position: 'absolute', top: 0, bottom: 0, width: '34%' },
  text: { fontFamily: fontFamily.bold, fontSize: 12.5, letterSpacing: 1.5, color: '#fff' },
  replay: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -13 }],
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MilestoneBand;
