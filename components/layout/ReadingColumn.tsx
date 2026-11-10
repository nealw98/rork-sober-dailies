// Reading-width cap (handoff building block 5: text maxes out ~560–620pt).
// Centers its children and stops them growing wider than the cap. On compact
// phones the cap never binds, so wrapping a screen in this is a guaranteed
// no-op there. Pass { flex: 1 } via `style` when the column should fill the
// screen (chat); use it bare inside scroll content for plain reading text.
import React from 'react';
import { View, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

export const READING_MAX_WIDTH = 600;

export default function ReadingColumn({ children, maxWidth = READING_MAX_WIDTH, style, onLayout }: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return <View style={[styles.column, { maxWidth }, style]} onLayout={onLayout}>{children}</View>;
}

const styles = StyleSheet.create({
  column: { width: '100%', alignSelf: 'center' },
});
