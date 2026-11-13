/**
 * BottomTabBar — the docked bottom navigation on phones (compact and medium
 * widths), replacing the old floating pill bar.
 *
 * A standard full-width bar: Today · Tools · Literature · Journal as the same
 * icon-pill + label items the NavigationRail uses, on the surface color with
 * a hairline top divider, padded for the home indicator. Rendered app-wide by
 * SideInsetGuard (not by the tabs layout) so it stays put on pushed screens
 * too; there no item is selected and a tap returns to that tab. The AI
 * Sponsor button stays a floating portrait above it (GlobalSponsorFab).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTokens } from '@/hooks/useTokens';
import { RailItem } from './NavigationRail';
import { TAB_ITEMS } from './TabGlyphs';

export const BOTTOM_BAR_HEIGHT = 58;

export default function BottomTabBar({ bottomInset }: { bottomInset: number }) {
  const { c, colors: tc } = useTokens();
  const pathname = usePathname();
  // Tab switches go through the router like a deep link; `navigate` jumps to
  // the existing tab instead of pushing a duplicate.
  const go = (path: string) => router.navigate(path as never);

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: bottomInset, backgroundColor: c.surface, borderTopColor: c.border },
      ]}
    >
      {TAB_ITEMS.map(({ path, label, Glyph }) => {
        const active = pathname === path;
        return (
          <View key={path} style={styles.slot}>
            <RailItem active={active} label={label} onPress={() => go(path)}>
              <Glyph size={22} color={tc.primaryDark} strokeWidth={active ? 2.1 : 1.9} />
            </RailItem>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slot: {
    flex: 1,
    height: BOTTOM_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
