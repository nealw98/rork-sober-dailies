// Shared back button — a chevron inside a round white pill, per the prototype's
// HeaderIconBtn (hifi-shared.jsx): 38px circle, 1px border, white surface. The
// `dark` variant (translucent) is for colored/dark headers.
import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');

export default function BackButton({
  onPress,
  dark = false,
  style,
}: {
  onPress: () => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[styles.btn, dark ? styles.dark : styles.light, style]}
    >
      <ChevronLeft size={20} color={dark ? '#F3EBDA' : c.textSecondary} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  light: { backgroundColor: c.surface, borderColor: c.border },
  dark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)' },
});
