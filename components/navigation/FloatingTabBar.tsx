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
import { View, Text, Pressable, StyleSheet, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { BookOpen, PenLine, UserRound } from 'lucide-react-native';
import { colors, fontFamily, shadows } from '@/constants/designTokens';
import { getSponsorById } from '@/constants/sponsors';

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

type TabKey = 'index' | 'tools' | 'journey' | 'settings';

const TAB_META: Record<TabKey, { label: string; Glyph: GlyphComponent; tone: string }> = {
  index: { label: 'Today', Glyph: SunriseGlyph, tone: colors.primary }, // teal
  tools: { label: 'Tools', Glyph: BookOpen, tone: '#C2843E' },          // amber
  journey: { label: 'Journey', Glyph: PenLine, tone: colors.secondary }, // blue
  settings: { label: 'Settings', Glyph: UserRound, tone: '#8E6FC7' },   // lavender
};

const BAR_HEIGHT = 68;
const INACTIVE = '#A79B86';

// FAB hidden on Settings (per product decision). Last-used persona TODO: wire to
// use-chat-store `aa-chat-sponsor-type`; default to Steady Eddie for now.
const FAB_HIDDEN_ON: TabKey[] = ['settings'];

function SponsorFab() {
  const sponsor = getSponsorById('supportive'); // Steady Eddie (last-used default)
  return (
    <Pressable
      accessibilityLabel="AI Sponsor"
      accessibilityRole="button"
      onPress={() => router.push('/(main)/chat')}
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
  label,
  Glyph,
  onPress,
}: {
  focused: boolean;
  tone: string;
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
            focused && { backgroundColor: tone, shadowColor: tone, ...activeGlow },
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
          <Glyph size={focused ? 19 : 23} color={focused ? '#fff' : INACTIVE} strokeWidth={focused ? 2 : 1.9} />
        </Animated.View>
      </View>
      <Text style={[styles.label, { color: focused ? tone : INACTIVE }]}>{label}</Text>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeKey = state.routes[state.index]?.name as TabKey;
  const showFab = !FAB_HIDDEN_ON.includes(activeKey);
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: bottomPad, height: BAR_HEIGHT + bottomPad + 16 }]}
    >
      {showFab && <SponsorFab />}

      <View style={styles.bar}>
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
              tone={meta.tone}
              label={meta.label}
              Glyph={meta.Glyph}
              onPress={onPress}
            />
          );
        })}
      </View>
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
    justifyContent: 'flex-end',
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 30,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(120,98,60,0.13)',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 6,
    ...shadows.lg,
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
    position: 'absolute',
    right: 20,
    bottom: BAR_HEIGHT + 36,
    width: 56,
    height: 56,
    borderRadius: 28,
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
