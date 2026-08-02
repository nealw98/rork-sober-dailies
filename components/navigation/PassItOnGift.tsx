// PassItOnGift — a top-right header control that opens Pass It On (gift
// credits). Sits beside the SettingsGear on the four top-level tab screens.
//
// The icon IS the notification (decided 2026-07-20): it renders only when the
// user is holding gifts, with a count badge — so its appearance means "you
// have something to give." At zero it disappears entirely; Pass It On stays
// reachable via the Tools catalog tile and the Settings row, which is where
// zero-credit users find the membership pitch.
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTokens } from '@/hooks/useTokens';
import { fontFamily } from '@/constants/designTokens';
import { useGiftCredits } from '@/hooks/use-gift-credits';
import GiftGlyph from '@/components/GiftGlyph';

export default function PassItOnGift({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c, colors } = useTokens();
  const { balance } = useGiftCredits();

  if (balance <= 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/(main)/pass-it-on' as Href)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Pass It On — ${balance} ${balance === 1 ? 'pass' : 'passes'} to give`}
      style={style}
    >
      <View>
        {/* Same muted tone as the SettingsGear it sits beside. */}
        <GiftGlyph size={24} color={c.textMuted} strokeWidth={1.9} />
        <View style={[styles.badge, { backgroundColor: colors.rose }]}>
          <Text style={styles.badgeText}>{balance > 99 ? '99+' : balance}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fontFamily.semiBold, fontSize: 9.5, color: '#FFFFFF' },
});
