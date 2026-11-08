import React from 'react';
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useThemedStyles } from '@/hooks/useTokens';
import ReadingColumn from '@/components/layout/ReadingColumn';

// Shared pieces of the "lead with the tools" onboarding screens (counter,
// reflection, read & listen, talk & practice): the 4-segment progress rail
// with Skip, the primary button, and the centered column. On a phone the
// column never binds; on an unfolded Duo or iPad the screens stay a single
// readable column instead of stretching edge to edge.

export const ONBOARDING_MAX_WIDTH = 520;
export const TOUR_STEPS = 4;

export function OnboardingColumn({ children, style, maxWidth = ONBOARDING_MAX_WIDTH }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; maxWidth?: number }) {
  return (
    <ReadingColumn maxWidth={maxWidth} style={[{ flex: 1 }, style]}>
      {children}
    </ReadingColumn>
  );
}

// Position in the four tour screens, plus Skip (straight to the disclaimer).
// `onImage` is the reflection screen's variant: drawn in white over its photo.
export function TourProgress({ index, onSkip, onImage = false }: { index: number; onSkip: () => void; onImage?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.progressRow}>
      <View
        style={styles.segments}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${index + 1} of ${TOUR_STEPS}`}
      >
        {Array.from({ length: TOUR_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              onImage
                ? (i <= index ? styles.segmentOnImage : styles.segmentOffImage)
                : (i <= index ? styles.segmentOn : styles.segmentOff),
            ]}
          />
        ))}
      </View>
      <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip">
        <Text style={[styles.skip, onImage && styles.skipOnImage]}>Skip</Text>
      </Pressable>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.primaryBtn, disabled && styles.primaryBtnOff]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.primaryText}>{label}</Text>
      <ArrowRight size={18} color="#fff" />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, minHeight: 44 },
    segments: { flex: 1, flexDirection: 'row', gap: 6 },
    segment: { flex: 1, height: 4, borderRadius: 2 },
    segmentOn: { backgroundColor: colors.primary },
    segmentOff: { backgroundColor: c.border },
    segmentOnImage: { backgroundColor: '#fff' },
    segmentOffImage: { backgroundColor: 'rgba(255,255,255,0.35)' },
    skip: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: c.textSecondary, paddingVertical: 8 },
    skipOnImage: { color: '#fff' },

    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
    primaryBtnOff: { backgroundColor: isDark ? '#3A3D42' : '#C7C9C4', shadowOpacity: 0 },
    primaryText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff', textAlign: 'center', flexShrink: 1 },
  });
};
