/**
 * NavigationRail — the expanded-width replacement for FloatingTabBar
 * (3.5 wide layouts, handoff building block 2).
 *
 * A slim vertical rail on the left edge: Today · Tools · Literature · Journey
 * as icon + small label, the selected item on a soft teal pill (primarySoft
 * fill, primaryDark label). The Sponsor FAB and the Settings gear live at the
 * bottom of the rail. Rendered by the tabs layout ONLY in `expanded` mode —
 * compact and medium keep the floating bottom bar untouched.
 *
 * Unlike the bottom bar this is not an overlay: the rail takes real layout
 * width beside the tab screens, so screens never need to know it exists.
 * It lives outside <Tabs>, so it navigates with the router (tab switches via
 * href, like any deep link) and reads the active tab from the pathname.
 */
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { BookOpen, Library, PenLine, Settings } from 'lucide-react-native';
import { ChatCircleDots } from 'phosphor-react-native';
import { colors, fontFamily, shadows } from '@/constants/designTokens';
import { useTokens } from '@/hooks/useTokens';
import { getSponsorById } from '@/constants/sponsors';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { SunriseGlyph } from './FloatingTabBar';

export const RAIL_WIDTH = 76;

// Same four destinations and glyphs as FloatingTabBar's TAB_META, addressed
// by path because the rail sits outside the tab navigator.
const RAIL_ITEMS = [
  { path: '/', label: 'Today', Glyph: SunriseGlyph },
  { path: '/tools', label: 'Tools', Glyph: Library },
  { path: '/literature', label: 'Literature', Glyph: BookOpen },
  { path: '/journey', label: 'Journal', Glyph: PenLine },
] as const;

function RailItem({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
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
      <View style={[styles.iconPill, active && { backgroundColor: tc.primarySoft }]}>
        {children}
      </View>
      <Text style={[styles.label, { color: tc.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

function RailSponsorFab() {
  const { lastSponsorId } = useLastSponsor();
  const sponsor = lastSponsorId ? getSponsorById(lastSponsorId) : null;
  const openSponsor = () => {
    if (sponsor) router.push(`/sponsor-chat?sponsor=${sponsor.id}`);
    else router.push('/(main)/chat');
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

export default function NavigationRail() {
  const insets = useSafeAreaInsets();
  const { c, colors: tc } = useTokens();
  const pathname = usePathname();

  // Tab switches go through the router like a deep link; `navigate` jumps to
  // the existing tab instead of pushing a duplicate.
  const go = (path: string) => router.navigate(path as never);

  return (
    <View
      style={[
        styles.rail,
        {
          // Left safe-area inset comes from the root SideInsetGuard; the rail
          // itself only sizes to its content.
          width: RAIL_WIDTH,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: c.background,
          borderRightColor: c.border,
        },
      ]}
    >
      <View style={styles.items}>
        {RAIL_ITEMS.map(({ path, label, Glyph }) => {
          const active = pathname === path;
          return (
            <RailItem key={path} active={active} label={label} onPress={() => go(path)}>
              <Glyph size={22} color={tc.primaryDark} strokeWidth={active ? 2.1 : 1.9} />
            </RailItem>
          );
        })}
      </View>

      <View style={styles.bottom}>
        <RailSponsorFab />
        <RailItem
          active={pathname === '/settings'}
          label="Settings"
          onPress={() => go('/settings')}
        >
          <Settings size={22} color={tc.primaryDark} strokeWidth={pathname === '/settings' ? 2.1 : 1.9} />
        </RailItem>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
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
