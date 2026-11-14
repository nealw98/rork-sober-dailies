// Shared back button — a chevron inside a round white pill, per the prototype's
// HeaderIconBtn (hifi-shared.jsx): 38px circle, 1px border, white surface. The
// `dark` variant (translucent) is for colored/dark headers; in dark mode the
// default variant flips to the translucent treatment automatically.
//
// A chevron that means "go back somewhere else". It steps aside on the wide
// layouts' two pane states, where back has nowhere honest to go:
//  - Inside a pane (usePane() non-null): the list it came from is right there
//    on the left, and picking another row (or the reflection) is how you move
//    on, so back would only duplicate the list.
//  - On the full-screen route a pane's Expand pushed (useExpandedRoute): the
//    way out is Collapse, which PaneExpandButton draws in Expand's own spot.
import React from 'react';
import { Pressable, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { usePane, useExpandedRoute } from '@/components/layout/PaneContext';

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
  const pane = usePane();
  const expandedRoute = useExpandedRoute();
  const hidden = pane != null || expandedRoute;
  const translucent = dark || isDark;
  // An empty slot, not null: headers lay out [back … actions] with
  // space-between, and a lone child would slide the actions to the left.
  if (hidden) return <View />;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[styles.btn, translucent ? styles.dark : styles.light, style]}
    >
      <ChevronLeft size={20} color={dark ? '#F3EBDA' : c.textSecondary} strokeWidth={2} />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
    btn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    light: { backgroundColor: c.surface, borderColor: c.border },
    dark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)' },
  });
};
