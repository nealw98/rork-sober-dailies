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
// Rail scene: when Today's detail pane shows the meditation scene, the scene
// continues under the tab rail to the pane's right. The pane registers its
// scene and width via useRailScene(); the rail (edge or strip) draws it in a
// box anchored at the pane's left edge — paneW + RAIL_SCENE_EXTRA wide, the
// same box the pane draws — so the two copies meet seamlessly.
//
// App-wide tab navigation. The main app turns it on with <MainNav />
// (onboarding and the paywall never do), and it stays put over every pushed
// screen:
// - Strip rail: on the Duo (both displays) the tab rail lives in the safe
//   strip, under the status cluster, like the system apps. Only where the
//   strip is wide enough for the rail — the Duo's 84pt strip. It's usually
//   on the right, but the cover rotates freely, and turned one way its
//   strip lands on the left; the rail follows it.
// - Bottom bar: everywhere else below expanded width (phones), a docked bar.
//   It takes real layout height, and the screens above it see a ZERO bottom
//   inset (the bar pads for the home indicator), so nothing double-pads. It
//   steps aside for the keyboard, immersive overlays, and the screens with
//   their own bottom controls (chat composer, Spot Check, meditation).
// - Edge rail: expanded widths without a strip (iPad) get the same rail on
//   the right edge, as a real column beside the content.
// Over a photo backdrop (meditation) the rails go transparent with white ink.
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
export type RailScene = { node: React.ReactNode; paneW: number };
// Wider than either rail (76pt edge, 84pt strip).
export const RAIL_SCENE_EXTRA = 120;
const RailSceneContext = createContext<{ scene: RailScene | null; set: (s: RailScene | null) => void }>({ scene: null, set: () => {} });
export const useRailScene = () => useContext(RailSceneContext);

// The registered scene, positioned for a rail sitting just right of the pane.
export function RailSceneBackdrop({ scene }: { scene: RailScene }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <View style={[styles.railSceneBox, { left: -scene.paneW, width: scene.paneW + RAIL_SCENE_EXTRA }]}>
        {scene.node}
      </View>
    </View>
  );
}

const MainNavContext = createContext<{ setOn: (on: boolean) => void }>({ setOn: () => {} });

// Full-window background slot for immersive screens. Call set(node) while
// focused and set(null) on cleanup; the node draws behind everything,
// including the side safe strips.
export const useSideBackdrop = () => useContext(BackdropContext);

// Which side's safe strip holds the tab rail (the Duo), or null when
// neither strip is wide enough.
function stripSide(insets: { left: number; right: number }): 'left' | 'right' | null {
  if (insets.right >= RAIL_WIDTH) return 'right';
  if (insets.left >= RAIL_WIDTH) return 'left';
  return null;
}

// True when the tab rail belongs in a safe strip (the Duo).
export function useStripRailFits(): boolean {
  return stripSide(useSafeAreaInsets()) != null;
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
  const [railScene, setRailScene] = useState<RailScene | null>(null);
  const railSceneCtx = useMemo(() => ({ scene: railScene, set: setRailScene }), [railScene]);
  const [navOn, setNavOn] = useState(false);
  const navCtx = useMemo(() => ({ setOn: setNavOn }), []);
  const side = stripSide(insets);
  const stripFits = side != null;
  const expanded = useLayoutMode() === 'expanded';
  const segments = useSegments() as string[];
  const { immersive } = useImmersive();
  const keyboard = useKeyboardShown();
  const showRail = navOn && stripFits;
  const showEdgeRail = navOn && !stripFits && expanded;
  // A photo runs under the rail: the full-window backdrop, or Today's pane scene.
  const railOnScene = backdrop != null || railScene != null;
  const showBar = navOn && !stripFits && !expanded && !immersive && !keyboard
    && !segments.some((seg) => BAR_HIDDEN_SEGMENTS.includes(seg));
  // The bar owns the home-indicator inset while it shows.
  const contentInsets = useMemo(() => (showBar ? { ...insets, bottom: 0 } : insets), [showBar, insets]);
  return (
    <MainNavContext.Provider value={navCtx}>
    <BottomBarContext.Provider value={showBar}>
    <BackdropContext.Provider value={ctx}>
    <RailSceneContext.Provider value={railSceneCtx}>
      <View
        // The app root re-lays-out whenever the app changes displays
        // (fold/unfold) or rotates — a third, UI-tree-side trigger for the
        // orientation rule, for handoffs where the Dimensions/AppState events
        // are missed. Idempotent, so repeat fires converge.
        onLayout={() => reassertDisplayOrientationRule()}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        {backdrop != null && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {backdrop}
          </View>
        )}
        <SafeAreaInsetsContext.Provider value={contentInsets}>
          <View style={[styles.row, { paddingLeft: insets.left, paddingRight: insets.right }]}>
            <View style={styles.flex}>{children}</View>
            {showEdgeRail && (
              <View style={styles.row0}>
                {railScene && <RailSceneBackdrop scene={railScene} />}
                <NavigationRail onScene={railOnScene} />
              </View>
            )}
          </View>
        </SafeAreaInsetsContext.Provider>
        {showBar && <BottomTabBar bottomInset={insets.bottom} />}
        {showRail && (
          <View style={[styles.stripRail, side === 'left' ? { left: 0, width: insets.left } : { right: 0, width: insets.right }]}>
            {railScene && side === 'right' && <RailSceneBackdrop scene={railScene} />}
            <NavigationRail placement="strip" side={side!} onScene={backdrop != null || (railScene != null && side === 'right')} />
          </View>
        )}
      </View>
    </RailSceneContext.Provider>
    </BackdropContext.Provider>
    </BottomBarContext.Provider>
    </MainNavContext.Provider>
  );
}

const styles = StyleSheet.create({
  stripRail: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center' },
  clip: { overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  flex: { flex: 1 },
  // Sized by the rail; a row so the rail stretches full height.
  row0: { flexDirection: 'row' },
  railSceneBox: { position: 'absolute', top: 0, bottom: 0 },
});
