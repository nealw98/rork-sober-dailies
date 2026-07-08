/**
 * FloatingTabBar — the redesign 3.0 bottom navigation.
 *
 * A custom floating bar (not a flat glass bar): the active tab is a beveled
 * medallion in that tab's brand tone with an Archivo label, a spring "pop" on
 * activation, and a soft tone halo. A persistent AI Sponsor FAB (last-used
 * persona portrait) sits above the bar on every tab except Settings.
 * Spec: prototype `frames/hifi-shared.jsx` BottomTabBar (sdTabPop keyframes +
 * inset bevel shadow + halo ring) and `frames/proto-app.jsx` shell FAB.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { BookOpen, Library, PenLine } from 'lucide-react-native';
import { colors, fontFamily, shadows, darkGlow } from '@/constants/designTokens';
import { useTokens } from '@/hooks/useTokens';
import { getSponsorById } from '@/constants/sponsors';
import { useImmersive } from '@/hooks/use-immersive';
import { useLastSponsor } from '@/hooks/use-last-sponsor';

type GlyphProps = { size?: number; color?: string; strokeWidth?: number };
type GlyphComponent = React.ComponentType<GlyphProps>;

// Soft tone halo behind the active medallion — a radial glow that fades to
// transparent (NOT a hard ring). Faithful soft version of the prototype's faint
// 0 0 0 5px tone@~7% spread.
function Halo({ tone }: { tone: string }) {
  return (
    <Svg width={60} height={60} style={styles.halo} pointerEvents="none">
      <Defs>
        <RadialGradient id={`halo-${tone}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={tone} stopOpacity={0.22} />
          <Stop offset="55%" stopColor={tone} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={tone} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={30} cy={30} r={30} fill={`url(#halo-${tone})`} />
    </Svg>
  );
}

// Today's brand "sunrise" glyph — a custom sun-over-horizon with rays (no
// up-arrow). Lucide's Sunrise differs, so we draw the prototype's exact paths.
function SunriseGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.6v2.5" />
      <Path d="M5.9 6 7.7 7.8" />
      <Path d="M18.1 6 16.3 7.8" />
      <Path d="M7.4 14.5a4.6 4.6 0 0 1 9.2 0" />
      <Path d="M3.5 19q8.5-2.9 17 0" />
    </Svg>
  );
}

type TabKey = 'index' | 'tools' | 'literature' | 'journey';

// June 2026 re-theme: the active-tab indicator is brand teal on every tab.
// The medallion fill stays the full-chroma teal in both modes (it's a "jewel" —
// Dark Mode Handoff); the label/halo tone brightens on dark for legibility.
// Nav model (handoff-tab-nav): Literature is a real tab between Tools and
// Journey; Settings moved off the bar to a header gear. Tools takes the
// `Library` glyph so Literature can own the `BookOpen` book glyph.
const TAB_META: Record<TabKey, { label: string; Glyph: GlyphComponent }> = {
  index: { label: 'Today', Glyph: SunriseGlyph },
  tools: { label: 'Tools', Glyph: Library },
  literature: { label: 'Literature', Glyph: BookOpen },
  journey: { label: 'Journey', Glyph: PenLine },
};

const BAR_HEIGHT = 68;

// FAB hidden on Settings (per product decision). Last-used persona TODO: wire to
// use-chat-store `aa-chat-sponsor-type`; default to Steady Eddie for now.
const FAB_HIDDEN_ON: TabKey[] = [];

function SponsorFab() {
  // Show the last-chatted sponsor and tap straight back into that chat
  // (defaults to Steady Eddie when there's no prior conversation).
  const { lastSponsorId } = useLastSponsor();
  const sponsor = getSponsorById(lastSponsorId) ?? getSponsorById('supportive');
  return (
    <Pressable
      accessibilityLabel={`Chat with ${sponsor?.name ?? 'your sponsor'}`}
      accessibilityRole="button"
      onPress={() => router.push(`/sponsor-chat?sponsor=${sponsor?.id ?? 'supportive'}`)}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      {sponsor?.avatar ? (
        <Image source={sponsor.avatar} style={styles.fabImg} />
      ) : (
        <View style={[styles.fabImg, { backgroundColor: colors.tertiary }]} />
      )}
    </Pressable>
  );
}

function TabButton({
  focused,
  tone,
  inactive,
  isDark,
  label,
  Glyph,
  onPress,
}: {
  focused: boolean;
  tone: string;
  inactive: string;
  isDark: boolean;
  label: string;
  Glyph: GlyphComponent;
  onPress: () => void;
}) {
  // sdTabPop: scale .7 → 1.13 → 1 with a back-overshoot, fired on activation.
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!focused) return;
    scale.setValue(0.7);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.13, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [focused, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <View style={styles.medallionWrap}>
        {/* soft tone halo glow (radial, fades out — not an outline) */}
        {focused && <Halo tone={tone} />}
        <Animated.View
          style={[
            styles.medallion,
            // Medallion fill stays full-chroma teal in both modes; on dark it
            // gains the handoff's soft outer glow instead of the drop shadow.
            focused && { backgroundColor: colors.primary },
            focused && (isDark ? darkGlow.tabMedallion : { shadowColor: colors.primary, ...activeGlow }),
            { transform: [{ scale }] },
          ]}
        >
          {/* fake inset bevel: top highlight → bottom shade */}
          {focused && (
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.16)']}
              locations={[0, 0.55, 1]}
              style={styles.bevel}
            />
          )}
          <Glyph size={focused ? 19 : 23} color={focused ? '#fff' : inactive} strokeWidth={focused ? 2 : 1.9} />
        </Animated.View>
      </View>
      <Text style={[styles.label, { color: focused ? tone : inactive }]}>{label}</Text>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { immersive } = useImmersive();
  const { c, colors: tc, isDark } = useTokens();
  const activeKey = state.routes[state.index]?.name as TabKey;
  const showFab = !FAB_HIDDEN_ON.includes(activeKey);
  const bottomPad = Math.max(insets.bottom, 16);

  // Hidden while a full-screen overlay (e.g. a Journey entry sheet) is open.
  if (immersive) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: bottomPad, height: BAR_HEIGHT + bottomPad }]}
    >
      <View style={[styles.bar, { borderColor: isDark ? c.tabBorder : 'rgba(255,255,255,0.55)' }]}>
        {/* Frosted glass. On iOS the BlurView samples the real screen behind it
            (the bar is transparent so nothing muddies the blur) under a thin
            tint. Android has no cheap system blur — expo-blur's dimezis method
            renders to a window texture that blanks out pushed screens (it turned
            the sponsor chat white), so we DON'T use it. Instead Android falls
            back to a near-opaque frosted panel: the tint carries the surface. */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 50 : 0}
          tint={isDark ? 'dark' : 'light'}
          style={styles.barGlass}
        />
        <View
          pointerEvents="none"
          style={[
            styles.barTint,
            {
              backgroundColor: Platform.select({
                // iOS: thin tint over a real blur. Android: a solid-ish frosted
                // fill that reads as glass without any blur.
                ios: isDark ? 'rgba(8,8,10,0.55)' : 'rgba(255,253,248,0.3)',
                default: isDark ? 'rgba(18,18,20,0.92)' : 'rgba(255,253,248,0.92)',
              }),
            },
          ]}
        />
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name as TabKey];
          if (!meta) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabButton
              key={route.key}
              focused={focused}
              tone={tc.primary}
              inactive={c.tabInactive}
              isDark={isDark}
              label={meta.label}
              Glyph={meta.Glyph}
              onPress={onPress}
            />
          );
        })}
      </View>

      {showFab && <SponsorFab />}
    </View>
  );
}

// colored drop glow under the active medallion (0 9px 20px tone@~36%)
const activeGlow = {
  shadowOpacity: 0.36,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    // Row: the pill flexes to fill, the FAB sits on the same line to its right.
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: 30,
    // Transparent: the BlurView is the fill, so nothing sits behind the blur to
    // muddy it. (The pill still reads as floating via the shadow + the tint.)
    backgroundColor: 'transparent',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    ...shadows.lg,
  },
  // BlurView clipped to the pill; the real fill, behind the tint + tab buttons.
  barGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    overflow: 'hidden',
  },
  // Thin cast ON TOP of the blur (frosted-white on light, deep glass on dark) —
  // color set inline per mode.
  barTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  medallionWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 60,
    height: 60,
  },
  medallion: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  bevel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: 11.5,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: colors.tertiary,
    ...shadows.lg,
  },
  fabImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
