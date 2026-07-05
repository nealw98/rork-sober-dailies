import React from 'react';
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTokens } from '@/hooks/useTokens';
import { shadows } from '@/constants/designTokens';

/**
 * The card treatment — the defining detail of dark mode (Dark Mode Handoff,
 * card-treatment.md). On OLED black a flat rectangle reads as dead; this makes
 * every neutral card a gently *lit* surface via four stacked effects:
 *
 *   1. soft top-light gradient falling from the top edge
 *   2. 1px top-edge highlight (the "lip" that catches light)
 *   3. faint dark pool at the bottom inner edge
 *   4. low-alpha hairline border + outer drop shadow into the black
 *
 * RN has no inset/multi shadows, so the effects are real layers: an outer View
 * owns the drop shadow (no overflow clip), an inner View owns the clipped
 * gradients. In light mode it renders the plain card screens use today
 * (surface + border + soft shadow) — zero extra layers.
 *
 * `tint` swaps the neutral surface for a family soft wash (e.g. the Meetings
 * "Next up" card) and `tintBorder` gives the hairline that family's colour.
 */
export function ThemedCard({
  children,
  radius = 16,
  tint,
  tintBorder,
  style,
  contentStyle,
  shadow = 'md',
}: {
  children?: React.ReactNode;
  radius?: number;
  /** dark-mode tinted variant: a low-alpha family wash instead of the neutral surface */
  tint?: string;
  /** hairline colour for the tinted variant (family-mixed); defaults to the neutral hairline */
  tintBorder?: string;
  style?: StyleProp<ViewStyle>;
  /** padding etc. for the inner content container */
  contentStyle?: StyleProp<ViewStyle>;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}) {
  const { c, isDark } = useTokens();

  if (!isDark) {
    return (
      <View
        style={[
          {
            backgroundColor: c.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: c.border,
          },
          shadow !== 'none' && shadows[shadow],
          style,
          contentStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    // Outer layer: owns the drop shadow into the black — must NOT clip.
    <View
      style={[
        { borderRadius: radius },
        shadow !== 'none' && styles.outerShadow,
        style,
      ]}
    >
      {/* Inner layer: surface + hairline, clips the gradient layers */}
      <View
        style={[
          styles.inner,
          {
            borderRadius: radius,
            backgroundColor: tint ?? c.surface,
            borderColor: tintBorder ?? 'rgba(255,255,255,0.06)',
          },
          contentStyle,
        ]}
      >
        {/* 1 · top-light gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.012)', 'rgba(255,255,255,0)']}
          locations={[0, 0.34, 0.62]}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        {/* 2 · top edge highlight */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)', borderRadius: radius },
          ]}
        />
        {/* 3 · faint base inner shadow */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
          locations={[0.7, 1]}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.7,
        shadowRadius: 13,
      },
      android: { elevation: 8 },
    }),
  },
  inner: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
