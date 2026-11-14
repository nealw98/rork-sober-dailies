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
// Over a photo backdrop (meditation) the rails go transparent with white ink,
// on a frosted strip (RailFrost) so they stay readable over bright scenes
// like snow or a grey sky.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
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

// Extra edge margin where the Duo reports no inset.
const DUO_EDGE_TOP = 14;
const DUO_EDGE_SIDE = 10;
// Screens that apply the edge margin themselves (useEdgeMargin), because
// their own colored bands should run under it.
const OWN_EDGE_SEGMENTS = ['sponsor-chat'];

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

// Frosted glass over the photo where a rail sits on it, as iOS does for bars
// over content: the scene's color and light carry to the edge, its detail
// doesn't, and the white ink always reads. The tint is what's left on
// Android, where the blur may not apply.
function RailFrost() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.frostTint]} />
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

// The extra Duo edge margin around the content. The guard pads every screen
// by it, except the OWN_EDGE_SEGMENTS screens, which read it here and pad
// their content themselves so their colored bands reach the edges.
export type EdgeMargin = { top: number; left: number; right: number };
const EdgeMarginContext = createContext<EdgeMargin>({ top: 0, left: 0, right: 0 });
export const useEdgeMargin = () => useContext(EdgeMarginContext);

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
  const { height: winH } = useWindowDimensions();
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
  const stripOnScene = backdrop != null || (railScene != null && side === 'right');
  const showBar = navOn && !stripFits && !expanded && !immersive && !keyboard
    && !segments.some((seg) => BAR_HIDDEN_SEGMENTS.includes(seg));
  // The bar owns the home-indicator inset while it shows.
  const contentInsets = useMemo(() => (showBar ? { ...insets, bottom: 0 } : insets), [showBar, insets]);
  // On the Duo the status bar lives in the side strip, so the window reports
  // no top inset, and the side away from the strip has none either: headers
  // would sit near the very top edge, and content close to the rounded
  // corner. Every main-app screen (tabs, split panes and pushed screens
  // alike, so their titles still line up) gets a margin there. Screen-side
  // insets stay as reported, so nothing double-pads.
  const roomy = navOn && stripFits;
  const padTop = roomy && insets.top === 0 ? DUO_EDGE_TOP : 0;
  const extraLeft = roomy && side === 'right' && insets.left === 0 ? DUO_EDGE_SIDE : 0;
  const extraRight = roomy && side === 'left' && insets.right === 0 ? DUO_EDGE_SIDE : 0;
  const edge = useMemo(() => ({ top: padTop, left: extraLeft, right: extraRight }), [padTop, extraLeft, extraRight]);
  const ownEdge = segments.some((seg) => OWN_EDGE_SEGMENTS.includes(seg));
  return (
    <EdgeMarginContext.Provider value={edge}>
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
          <View style={[styles.row, ownEdge
            ? { paddingLeft: insets.left, paddingRight: insets.right }
            : { paddingTop: padTop, paddingLeft: insets.left + extraLeft, paddingRight: insets.right + extraRight }]}>
            <View style={styles.flex}>{children}</View>
            {showEdgeRail && (
              <View style={styles.row0}>
                {railScene && <RailSceneBackdrop scene={railScene} />}
                {railOnScene && <RailFrost />}
                <NavigationRail onScene={railOnScene} />
              </View>
            )}
          </View>
        </SafeAreaInsetsContext.Provider>
        {/* Today's meditation pane: its scene runs on up through the top
            margin, in the same window-tall box the pane and the strip draw. */}
        {showRail && railScene && side === 'right' && padTop > 0 && (
          <View
            style={[styles.topBand, { height: padTop, right: insets.right, width: railScene.paneW }]}
            pointerEvents="none"
          >
            <View style={{ position: 'absolute', top: 0, left: 0, width: railScene.paneW + RAIL_SCENE_EXTRA, height: winH }}>
              {railScene.node}
            </View>
          </View>
        )}
        {showBar && <BottomTabBar bottomInset={insets.bottom} />}
        {showRail && (
          <View style={[styles.stripRail, side === 'left' ? { left: 0, width: insets.left } : { right: 0, width: insets.right }]}>
            {railScene && side === 'right' && <RailSceneBackdrop scene={railScene} />}
            {stripOnScene && <RailFrost />}
            <NavigationRail placement="strip" side={side!} onScene={stripOnScene} />
          </View>
        )}
      </View>
    </RailSceneContext.Provider>
    </BackdropContext.Provider>
    </BottomBarContext.Provider>
    </MainNavContext.Provider>
    </EdgeMarginContext.Provider>
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
  topBand: { position: 'absolute', top: 0, overflow: 'hidden' },
  frostTint: { backgroundColor: 'rgba(0,0,0,0.18)' },
});
