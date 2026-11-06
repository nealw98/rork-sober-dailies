// Keeps app content out of the LEFT/RIGHT safe-area insets while the
// background still paints edge-to-edge behind them.
//
// iOS only pads the sides on hardware that reserves them: the iPhone Duo
// reports an 84pt side inset (camera strip + floating status cluster) on
// BOTH displays, along the full length of the screen. Classic portrait
// phones report 0 on both sides, so this wrapper is a no-op there.
//
// Mounted ONCE at the app root (app/_layout.tsx). Screens inside the tree
// must NOT also apply left/right safe-area edges or they double-inset.
// React Native <Modal>s render in their own native window OUTSIDE this
// wrapper, so full-screen modal content (e.g. the Big Book reader, the PDF
// reader) handles the side edges itself.
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/hooks/useTokens';
import { reassertDisplayOrientationRule } from '@/lib/orientation';

export default function SideInsetGuard({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { c } = useTokens();
  return (
    <View
      // The app root re-lays-out whenever the app changes displays
      // (fold/unfold) or rotates — a third, UI-tree-side trigger for the
      // orientation rule, for handoffs where the Dimensions/AppState events
      // are missed. Idempotent, so repeat fires converge.
      onLayout={reassertDisplayOrientationRule}
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}
