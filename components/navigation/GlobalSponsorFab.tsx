// AI Sponsor FAB — the floating sponsor portrait over every (main) screen, tabs
// included, so the sponsor is always one tap away. It floats just above the
// docked bottom bar (which zeroes the bottom inset while it shows). Hidden in
// immersive mode (full-screen reading overlays) and naturally sits under
// native Modals (the PDF / text readers), which render above the layout.
import React from 'react';
import { Pressable, View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useSegments } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native';
import { colors, shadows } from '@/constants/designTokens';
import { getSponsorById } from '@/constants/sponsors';
import { useImmersive } from '@/hooks/use-immersive';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useStripRailFits } from '@/components/layout/SideInsetGuard';

export default function GlobalSponsorFab() {
  const segments = useSegments();
  const { immersive } = useImmersive();
  const { lastSponsorId } = useLastSponsor();
  const insets = useSafeAreaInsets();
  const player = useGlobalAudioPlayer();
  const expanded = useLayoutMode() === 'expanded';
  const stripRail = useStripRailFits();
  const raisedForMiniPlayer = (segments as string[]).includes('speakers') && player.isLoaded;

  // On expanded widths the left rail carries the sponsor on the four tabs;
  // skip here to avoid doubling up. Skip on the meditation screen — it's its own immersive UI, and the FAB
  // would sit over its controls / Preferences sheet. Skip the Spot Check form
  // too — it's a focused writing surface and a chat FAB over it reads as a
  // competing exit. And skip the AI Sponsor screen on expanded widths, where
  // it already shows a chat beside the picker. And skip it entirely on the
  // Duo, where the strip rail's sponsor button is always showing.
  if (
    stripRail ||
    (expanded && (segments as string[]).includes('chat')) ||
    (expanded && (segments as string[]).includes('(tabs)')) ||
    (segments as string[]).includes('meditation') ||
    (segments as string[]).includes('trends') ||
    (segments as string[]).includes('inventory') ||
    immersive
  ) {
    return null;
  }

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
      // Just above the docked bar, or above the home indicator where the bar
      // steps aside.
      style={({ pressed }) => [styles.fab, { bottom: Math.max(insets.bottom, 16) + 5 + (raisedForMiniPlayer ? 88 : 0) }, pressed && { opacity: 0.85 }]}
    >
      {sponsor?.avatar ? (
        <Image source={sponsor.avatar} style={styles.fabImg} />
      ) : (
        <View style={[styles.fabImg, styles.unselectedFab]}>
          <ChatCircleDots size={26} color="#fff" weight="regular" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: colors.tertiary,
    ...shadows.lg,
  },
  fabImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  unselectedFab: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tertiary },
});
