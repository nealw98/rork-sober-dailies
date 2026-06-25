// AI Sponsor FAB for pushed (non-tab) screens. On the four tabs the
// FloatingTabBar renders its own FAB above the bar; this one covers every other
// (main) screen so the sponsor is always one tap away. Hidden in immersive mode
// (full-screen reading overlays) and naturally sits under native Modals (the
// PDF / text readers), which render above the layout.
import React from 'react';
import { Pressable, View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useSegments } from 'expo-router';
import { colors, shadows } from '@/constants/designTokens';
import { getSponsorById } from '@/constants/sponsors';
import { useImmersive } from '@/hooks/use-immersive';
import { useLastSponsor } from '@/hooks/use-last-sponsor';

export default function GlobalSponsorFab() {
  const segments = useSegments();
  const { immersive } = useImmersive();
  const { lastSponsorId } = useLastSponsor();
  const insets = useSafeAreaInsets();

  // The tab bar owns the FAB on the four tabs; skip here to avoid doubling up.
  if ((segments as string[]).includes('(tabs)') || immersive) return null;

  const sponsor = getSponsorById(lastSponsorId) ?? getSponsorById('supportive');
  return (
    <Pressable
      accessibilityLabel={`Chat with ${sponsor?.name ?? 'your sponsor'}`}
      accessibilityRole="button"
      onPress={() => router.push(`/sponsor-chat?sponsor=${sponsor?.id ?? 'supportive'}`)}
      style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 18 }, pressed && { opacity: 0.85 }]}
    >
      {sponsor?.avatar ? (
        <Image source={sponsor.avatar} style={styles.fabImg} />
      ) : (
        <View style={[styles.fabImg, { backgroundColor: colors.tertiary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: colors.tertiary,
    ...shadows.lg,
  },
  fabImg: { width: '100%', height: '100%', resizeMode: 'cover' },
});
