import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import FloatingTabBar from '@/components/navigation/FloatingTabBar';
import NavigationRail from '@/components/navigation/NavigationRail';
import { useLayoutMode } from '@/hooks/useLayoutMode';

/**
 * The four redesign-3.0 destinations: Today · Tools · Literature · Journey.
 * Compact/medium render the custom floating bottom bar (+ Sponsor FAB) — see
 * FloatingTabBar. Expanded widths (unfolded Duo landscape, iPad) swap it for
 * the left-edge NavigationRail (3.5 wide layouts): the rail takes real layout
 * width in a row beside the tab screens, which is why it can't come from the
 * tabBar slot. <Tabs> keeps its position in the tree across the swap, so tab
 * state survives fold/unfold.
 *
 * Settings is no longer a tab; it lives in the tab group bar-less and opens
 * from a header gear (compact) or the rail's bottom gear (expanded). Leaf
 * screens (Daily Reflection, Gratitude, chat, …) live one level up in the
 * (main) Stack, so pushing them covers the bar and the rail — the prototype's
 * "tab bar only on top-level" behavior.
 *
 * Bar button order follows this declaration order, so Literature sits third.
 */
export default function TabsLayout() {
  const expanded = useLayoutMode() === 'expanded';

  return (
    <View style={styles.row}>
      {expanded && <NavigationRail />}
      <View style={styles.content}>
        <Tabs
          screenOptions={{ headerShown: false }}
          // "history" so Back from Literature returns to whichever tab opened it.
          backBehavior="history"
          tabBar={(props) => (expanded ? null : <FloatingTabBar {...props} />)}
        >
          <Tabs.Screen name="index" options={{ title: 'Today' }} />
          <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
          <Tabs.Screen name="literature" options={{ title: 'Literature' }} />
          <Tabs.Screen name="journey" options={{ title: 'Journal' }} />
          {/* Settings lives in the tab group but has NO bar button (not in
              FloatingTabBar's TAB_META) — reached from each tab's header gear
              or the rail. It stays in the group so the tab chrome remains
              visible on it. */}
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
});
