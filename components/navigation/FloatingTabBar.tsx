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
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { BookOpen, Library, PenLine, Users } from 'lucide-react-native';
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

// "#RRGGBB" (or shorthand) → "r, g, b" so we can build rgba() tint stops from a
// token colour and keep the band's colour locked to the page background.
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const BAR_HEIGHT = 68;
// How far the frosted band rises above the pill. Taller than the pill gap on
// purpose: it gives the progressive blur + gradient tint room to fade out into
// the page instead of ending on a hard rectangular edge.
const BAND_TOP_EXTRA = 48;

// FAB hidden on Settings (per product decision).
const FAB_HIDDEN_ON: TabKey[] = [];

function SponsorFab() {
  // Show the last-opened sponsor and tap straight back into that chat. Before a
  // sponsor is opened, use an anonymous picker state so Eddie is not implied.
  const { lastSponsorId } = useLastSponsor();
  const sponsor = lastSponsorId ? getSponsorById(lastSponsorId) : null;
  const openSponsor = () => {
    if (sponsor) router.push(`/sponsor-chat?sponsor=${sponsor.id}`);
    else router.push('/(main)/chat');
  };

  return (
    <Pressable
      accessibilityLabel={sponsor ? `Chat with ${sponsor.name}` : 'Choose your AI Sponsor'}
      accessibilityRole="button"
      onPress={openSponsor}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      {sponsor?.avatar ? (
        <Image source={sponsor.avatar} style={styles.fabImg} />
      ) : (
        <View style={[styles.fabImg, styles.unselectedFab]}>
          <Users size={25} color="#fff" strokeWidth={2.2} />
        </View>
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

  // Progressive frosted band. A single blur is masked by a vertical gradient
  // (transparent at top → opaque behind the pill), so the REAL blur fades out
  // smoothly with no hard top edge — the mask, not the blur intensity, controls
  // how high the frost reaches, so we can blur hard behind the pill without the
  // band looking taller. A gradient tint (transparent at top → cream/ink at the
  // bar) fades the colour cast the same way. Android has no cheap blur (dimezis
  // blanks pushed screens) so it leans on the gradient tint alone.
  const blurTint = isDark ? 'dark' : 'light';
  // Tint the band with the PAGE background colour (c.background) so it reads as
  // the page dissolving upward, not a separate panel. Only the alpha ramps —
  // kept per platform: iOS is lighter since the blur adds its own coverage,
  // Android has no blur so it leans on the tint alone.
  const bg = hexToRgb(c.background);
  const bandAlpha = Platform.OS === 'ios'
    ? (isDark ? [0, 0.2, 0.48] : [0, 0.16, 0.44])
    : (isDark ? [0, 0.66, 0.97] : [0, 0.6, 0.97]);
  const bandTint: readonly [string, string, string] = [
    `rgba(${bg}, ${bandAlpha[0]})`,
    `rgba(${bg}, ${bandAlpha[1]})`,
    `rgba(${bg}, ${bandAlpha[2]})`,
  ];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { height: BAR_HEIGHT + bottomPad + BAND_TOP_EXTRA }]}
    >
      {Platform.OS === 'ios' && (
        <MaskedView
          style={styles.band}
          pointerEvents="none"
          maskElement={
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)', '#000']}
              locations={[0, 0.45, 0.7]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView intensity={55} tint={blurTint} style={StyleSheet.absoluteFill} />
        </MaskedView>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={bandTint}
        locations={[0, 0.5, 1]}
        style={styles.band}
      />

      {/* Floating white pill + FAB, sitting on the band */}
      <View pointerEvents="box-none" style={[styles.pillRow, { paddingBottom: bottomPad }]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: isDark ? c.surface : '#FFFFFF',
              borderColor: isDark ? c.tabBorder : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
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
  // Positioning wrapper (box-none); height set inline to span the band.
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Full-width frosted band behind the pill — fills the wrapper edge to edge.
  band: {
    ...StyleSheet.absoluteFillObject,
  },
  // The floating pill + FAB row, pinned to the bottom of the band.
  pillRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: 30,
    // Solid fill (color set inline per mode) so the pill reads as a distinct
    // floating element resting on the frosted band; the deeper shadow lifts it.
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
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
  unselectedFab: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary,
  },
});
