// Shared back button — a chevron inside a round white pill, per the prototype's
// HeaderIconBtn (hifi-shared.jsx): 38px circle, 1px border, white surface. The
// `dark` variant (translucent) is for colored/dark headers; in dark mode the
// default variant flips to the translucent treatment automatically.
//
// The chevron means "go back somewhere else"; the Minimize2 glyph means
// "undo an expand". The button picks the collapse presentation — the 34pt
// counterpart of PaneExpandButton — in two cases, with onPress untouched:
//  1. Inside a wide-layout pane (usePane() non-null): back collapses the pane.
//  2. On a full-screen route a pane's expand pushed (`expanded=1` route param,
//     set by every expand handler): back returns to the split view, so it IS
//     a collapse — but only while the window is still expanded-class. Fold
//     the phone and the same screen becomes the ordinary compact
//     presentation, where there is no collapsed state and the chevron is
//     honest again.
import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Minimize2 } from 'lucide-react-native';
import { type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { usePane } from '@/components/layout/PaneContext';
import { useLayoutMode } from '@/hooks/useLayoutMode';

export default function BackButton({
  onPress,
  dark = false,
  style,
}: {
  onPress: () => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, isDark } = useTokens();
  const params = useLocalSearchParams<{ expanded?: string }>();
  const paneCtx = usePane();
  const layoutMode = useLayoutMode();
  const pane = paneCtx != null || (params.expanded === '1' && layoutMode === 'expanded');
  const translucent = dark || isDark;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={pane ? 'Collapse' : 'Back'}
      style={[styles.btn, pane && styles.collapse, translucent ? styles.dark : styles.light, style]}
    >
      {pane ? (
        <Minimize2 size={15} color={dark ? '#F3EBDA' : c.textSecondary} strokeWidth={2} />
      ) : (
        <ChevronLeft size={20} color={dark ? '#F3EBDA' : c.textSecondary} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
    btn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    // Matches PaneExpandButton's 34pt chrome so the pane's two controls read as a pair.
    collapse: { width: 34, height: 34, borderRadius: 17 },
    light: { backgroundColor: c.surface, borderColor: c.border },
    dark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)' },
  });
};
