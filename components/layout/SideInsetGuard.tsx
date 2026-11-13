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
//
// Immersive backdrop: navigator screens clip at the padded bounds, so a
// screen whose artwork should run under the side strips (Meditation's scene
// photo) can't just draw past its own edges. Instead it registers its
// background here via useSideBackdrop(); the guard renders it across the
// FULL window, behind the padded content, and the screen itself goes
// transparent (contentStyle in the stack). Cleared on blur.
//
// App-wide tab navigation. The main app turns it on with <MainNav />
// (onboarding and the paywall never do), and it stays put over every pushed
// screen:
// - Strip rail: on the Duo (both displays) the tab rail lives in the RIGHT
//   safe strip, under the status cluster, like the system apps. Only where
//   the strip is wide enough for the rail — the Duo's 84pt strip.
// - Bottom bar: everywhere else below expanded width (phones), a docked bar.
//   It takes real layout height, and the screens above it see a ZERO bottom
//   inset (the bar pads for the home indicator), so nothing double-pads. It
//   steps aside for the keyboard, immersive overlays, and the screens with
//   their own bottom controls (chat composer, Spot Check, meditation).
// - Expanded widths without a strip (iPad) keep the tabs layout's left rail.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { useTokens } from '@/hooks/useTokens';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useImmersive } from '@/hooks/use-immersive';
import { reassertDisplayOrientationRule } from '@/lib/orientation';
import NavigationRail, { RAIL_WIDTH } from '@/components/navigation/NavigationRail';
import BottomTabBar from '@/components/navigation/BottomTabBar';

// Screens that own the bottom edge (a composer, a form's submit row, the
// meditation player) — the bottom bar hides on them.
const BAR_HIDDEN_SEGMENTS = ['sponsor-chat', 'inventory', 'meditation'];

const BackdropContext = createContext<{ set: (node: React.ReactNode | null) => void }>({ set: () => {} });
const MainNavContext = createContext<{ setOn: (on: boolean) => void }>({ setOn: () => {} });

// Full-window background slot for immersive screens. Call set(node) while
// focused and set(null) on cleanup; the node draws behind everything,
// including the side safe strips.
export const useSideBackdrop = () => useContext(BackdropContext);

// True when the tab rail belongs in the right safe strip (the Duo).
export function useStripRailFits(): boolean {
  return useSafeAreaInsets().right >= RAIL_WIDTH;
}

// True while the docked bottom bar is showing (it hides for the keyboard etc.).
const BottomBarContext = createContext(false);
export const useBottomBarShown = () => useContext(BottomBarContext);

function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const [show, hide] = Platform.OS === 'ios'
      ? ['keyboardWillShow', 'keyboardWillHide'] as const
      : ['keyboardDidShow', 'keyboardDidHide'] as const;
    const a = Keyboard.addListener(show, () => setShown(true));
    const b = Keyboard.addListener(hide, () => setShown(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return shown;
}

// Mounted by the main app's navigator to show the tab navigation.
export function MainNav() {
  const { setOn } = useContext(MainNavContext);
  useEffect(() => {
    setOn(true);
    return () => setOn(false);
  }, [setOn]);
  return null;
}

export default function SideInsetGuard({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { c } = useTokens();
  const [backdrop, setBackdrop] = useState<React.ReactNode>(null);
  const set = useCallback((n: React.ReactNode | null) => setBackdrop(n), []);
  const ctx = useMemo(() => ({ set }), [set]);
  const [navOn, setNavOn] = useState(false);
  const navCtx = useMemo(() => ({ setOn: setNavOn }), []);
  const stripFits = useStripRailFits();
  const expanded = useLayoutMode() === 'expanded';
  const segments = useSegments() as string[];
  const { immersive } = useImmersive();
  const keyboard = useKeyboardShown();
  const showRail = navOn && stripFits;
  const showBar = navOn && !stripFits && !expanded && !immersive && !keyboard
    && !segments.some((seg) => BAR_HIDDEN_SEGMENTS.includes(seg));
  // The bar owns the home-indicator inset while it shows.
  const contentInsets = useMemo(() => (showBar ? { ...insets, bottom: 0 } : insets), [showBar, insets]);
  return (
    <MainNavContext.Provider value={navCtx}>
    <BottomBarContext.Provider value={showBar}>
    <BackdropContext.Provider value={ctx}>
      <View
        // The app root re-lays-out whenever the app changes displays
        // (fold/unfold) or rotates — a third, UI-tree-side trigger for the
        // orientation rule, for handoffs where the Dimensions/AppState events
        // are missed. Idempotent, so repeat fires converge.
        onLayout={reassertDisplayOrientationRule}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        {backdrop != null && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {backdrop}
          </View>
        )}
        <SafeAreaInsetsContext.Provider value={contentInsets}>
          <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }}>{children}</View>
        </SafeAreaInsetsContext.Provider>
        {showBar && <BottomTabBar bottomInset={insets.bottom} />}
        {showRail && (
          <View style={[styles.stripRail, { width: insets.right }]}>
            <NavigationRail placement="strip" />
          </View>
        )}
      </View>
    </BackdropContext.Provider>
    </BottomBarContext.Provider>
    </MainNavContext.Provider>
  );
}

const styles = StyleSheet.create({
  stripRail: { position: 'absolute', top: 0, bottom: 0, right: 0, alignItems: 'center' },
});
