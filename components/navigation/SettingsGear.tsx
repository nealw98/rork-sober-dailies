// SettingsGear — the top-right header control that opens Settings on the four
// top-level tab screens (Today, Tools, Literature, Journal). The phone's
// bottom bar has no Settings item, so on phones this gear is how you get
// there. Where a tab rail is showing (iPad, the Duo), Settings sits at the
// bottom of the rail instead, and the gear steps aside so there aren't two.
// Tap → pushes /settings (covers the tab bar).
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTokens } from '@/hooks/useTokens';
import { useRailHasSettings } from '@/components/layout/SideInsetGuard';

export default function SettingsGear({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTokens();
  if (useRailHasSettings()) return null;
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
