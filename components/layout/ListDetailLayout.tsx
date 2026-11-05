// List-detail container (handoff building block 4): a fixed-width list pane,
// a hairline divider on the `border` token, and a flexible detail pane.
// Purely presentational on purpose — the CALLER decides when to render it
// (via useLayoutMode) and owns the selection state plus its mapping onto
// pushed routes, because that mapping is where fold/unfold continuity lives.
// The pattern gets settled per-screen starting with Today (handoff Screen 1).
import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTokens } from '@/hooks/useTokens';

export const LIST_PANE_WIDTH = 330;

export default function ListDetailLayout({ list, detail, listWidth = LIST_PANE_WIDTH, style }: {
  list: React.ReactNode;
  // The open item's content — pass a placeholder view when nothing is open.
  detail: React.ReactNode;
  listWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTokens();
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.list, { width: listWidth, borderRightColor: c.border }]}>{list}</View>
      <View style={styles.detail}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  list: { borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
});
