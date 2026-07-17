// PassItOnGift — a top-right header control that opens Pass It On (gift codes).
// Sits beside the SettingsGear on the four top-level tab screens, sharing its
// muted tone so the two header controls read as a set. Tap → pushes
// /(main)/pass-it-on (covers the tab bar).
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTokens } from '@/hooks/useTokens';
import GiftGlyph from '@/components/GiftGlyph';

export default function PassItOnGift({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTokens();
  return (
    <Pressable
      onPress={() => router.push('/(main)/pass-it-on' as Href)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Pass It On"
      style={style}
    >
      {/* Same muted tone as the SettingsGear it sits beside. */}
      <GiftGlyph size={24} color={c.textMuted} strokeWidth={1.9} />
    </Pressable>
  );
}
