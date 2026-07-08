// SettingsGear — the top-right header control that opens Settings. Since the
// 3.0 nav dropped Settings as a bottom tab (handoff-tab-nav), this gear is the
// single, predictable anchor for it on all four top-level tab screens (Today,
// Tools, Literature, Journey). Tap → pushes /settings (covers the tab bar).
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTokens } from '@/hooks/useTokens';

export default function SettingsGear({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTokens();
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={style}
    >
      <Settings size={23} color={c.textMuted} strokeWidth={1.9} />
    </Pressable>
  );
}
