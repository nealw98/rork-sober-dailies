/**
 * NavigationRail — the expanded-width navigation (3.5 wide layouts, handoff
 * building block 2); narrower windows get the docked BottomTabBar.
 *
 * A slim vertical rail on the right edge, matching the Duo's strip rail: Today · Tools · Literature · Journey
 * as icon + small label, the selected item on a soft teal pill (primarySoft
 * fill, primaryDark label). The Sponsor FAB and the Settings gear live at the
 * bottom of the rail. Rendered app-wide by SideInsetGuard in `expanded` mode,
 * on the right edge, over every screen.
 *
 * On the Duo (both displays) it moves into the safe strip instead
 * (placement="strip", rendered by SideInsetGuard): it starts below the
 * status cluster, has no fill or divider, and shows over every screen.
 *
 * Unlike the bottom bar this is not an overlay: the rail takes real layout
 * width beside the tab screens, so screens never need to know it exists.
 * It lives outside <Tabs>, so it navigates with the router (tab switches via
 * href, like any deep link) and reads the active tab from the pathname.
 */
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { ChatCircleDots } from 'phosphor-react-native';
import { colors, fontFamily, shadows } from '@/constants/designTokens';
import { useTokens } from '@/hooks/useTokens';
import { getSponsorById } from '@/constants/sponsors';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { TAB_ITEMS } from './TabGlyphs';
import { useLayoutMode } from '@/hooks/useLayoutMode';

export const RAIL_WIDTH = 76;

// Where the strip rail starts, clear of the Duo's status cluster at the top
// of the right strip. The cover's cluster is taller (camera above the clock).
const STRIP_TOP = 150;
const STRIP_TOP_COVER = 185;
// The cover turned landscape: the strip is only ~466pt long and the camera
// sits at one end of it — the top when the strip is on the left, the bottom
// when it's on the right. The rail keeps clear of that end.
const COVER_CAMERA_END = 90;
const COVER_FAR_END = 12;

// Over the meditation scene (onScene) the rail goes light-on-photo.
const ON_SCENE_INK = '#FFFFFF';
const ON_SCENE_PILL = 'rgba(255,255,255,0.22)';

// Also the bottom tab bar's item: icon in a selection pill over a small label.
export function RailItem({
  active,
  label,
  onPress,
  onScene = false,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  onScene?: boolean;
  children: React.ReactNode;
}) {
  const { colors: tc } = useTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconPill, active && { backgroundColor: onScene ? ON_SCENE_PILL : tc.primarySoft }]}>
        {children}
      </View>
      <Text style={[styles.label, { color: onScene ? ON_SCENE_INK : tc.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

function RailSponsorFab() {
  const { lastSponsorId } = useLastSponsor();
  const sponsor = lastSponsorId ? getSponsorById(lastSponsorId) : null;
  const expanded = useLayoutMode() === 'expanded';
  const openSponsor = () => {
    // Expanded widths: the AI Sponsor screen is picker | chat — open it on
    // this sponsor's chat. Narrower (the Duo cover's strip rail): straight to
    // the chat, like the phone's floating button.
    if (!sponsor) router.push('/(main)/chat');
    else if (expanded) router.push(`/(main)/chat?sponsor=${sponsor.id}`);
    else router.push(`/sponsor-chat?sponsor=${sponsor.id}`);
  };
  return (
    <Pressable
      accessibilityLabel={sponsor ? `Chat with ${sponsor.name}` : 'Choose your AI Sponsor'}
      accessibilityRole="button"
      onPress={openSponsor}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      {sponsor?.avatar ? (
        <Image source={sponsor.avatar} style={styles.fabImg} />
      ) : (
        <View style={[styles.fabImg, styles.unselectedFab]}>
          <ChatCircleDots size={22} color="#fff" weight="regular" />
        </View>
      )}
    </Pressable>
  );
}

export default function NavigationRail({
  placement = 'edge',
  side = 'right',
  onScene = false,
}: {
  placement?: 'edge' | 'strip';
  side?: 'left' | 'right';
  // The meditation scene runs under the rail (drawn by whoever hosts it).
  onScene?: boolean;
}) {
  const strip = placement === 'strip';
  const expanded = useLayoutMode() === 'expanded';
  const { width: winW, height: winH } = useWindowDimensions();
  const coverLandscape = strip && !expanded && winW > winH;
  const cameraTop = side === 'left';
  const insets = useSafeAreaInsets();
  const { c, colors: tc } = useTokens();
  const pathname = usePathname();
  const ink = onScene ? ON_SCENE_INK : tc.primaryDark;

  // Tab switches go through the router like a deep link; `navigate` jumps to
  // the existing tab instead of pushing a duplicate.
  const go = (path: string) => router.navigate(path as never);

  return (
    <View
      style={[
        styles.rail,
        {
          // Side safe-area insets come from the root SideInsetGuard; the rail
          // itself only sizes to its content.
          width: RAIL_WIDTH,
          paddingTop: coverLandscape
            ? (cameraTop ? COVER_CAMERA_END : COVER_FAR_END)
            : strip ? (expanded ? STRIP_TOP : STRIP_TOP_COVER) : insets.top + 16,
          paddingBottom: coverLandscape
            ? (cameraTop ? COVER_FAR_END : COVER_CAMERA_END)
            : Math.max(insets.bottom, 16),
          backgroundColor: c.background,
          borderColor: c.border,
        },
        (strip || onScene) && styles.stripRail,
      ]}
    >
      <View style={styles.items}>
        {TAB_ITEMS.map(({ path, label, Glyph }) => {
          const active = pathname === path;
          return (
            <RailItem key={path} active={active} label={label} onPress={() => go(path)} onScene={onScene}>
              <Glyph size={22} color={ink} strokeWidth={active ? 2.1 : 1.9} />
            </RailItem>
          );
        })}
      </View>

      <View style={styles.bottom}>
        <RailSponsorFab />
        {/* No room in the landscape cover's short strip; the screens'
            header gear still reaches Settings there. */}
        {!coverLandscape && (
          <RailItem
            active={pathname === '/settings'}
            label="Settings"
            onPress={() => go('/settings')}
            onScene={onScene}
          >
            <Settings size={22} color={ink} strokeWidth={pathname === '/settings' ? 2.1 : 1.9} />
          </RailItem>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The divider faces the content, which sits to the rail's left.
  rail: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  // In the strip it reads as part of the system chrome: no fill (the guard
  // paints the strip) and no divider. Over the meditation scene too.
  stripRail: {
    flex: 1,
    borderLeftWidth: 0,
    backgroundColor: 'transparent',
  },
  items: {
    gap: 6,
  },
  bottom: {
    alignItems: 'center',
    gap: 14,
  },
  item: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  // The selected-state pill wraps just the icon (Material-rail style) so the
  // label never has to fight the fill for contrast.
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: colors.tertiary,
    ...shadows.lg,
  },
  fabImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  unselectedFab: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tertiary },
});
