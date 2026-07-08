import { Tabs } from 'expo-router';
import React from 'react';
import FloatingTabBar from '@/components/navigation/FloatingTabBar';

/**
 * The four redesign-3.0 destinations: Today · Tools · Literature · Journey.
 * Rendered with a custom floating bar (+ Sponsor FAB) — see FloatingTabBar.
 * Settings is no longer a tab; it lives in the (main) Stack and opens from a
 * header gear on each tab (handoff-tab-nav). Leaf screens (Daily Reflection,
 * Gratitude, chat, …) also live one level up in the (main) Stack, so pushing
 * them covers the bar — the prototype's "tab bar only on top-level" behavior.
 *
 * Bar button order follows this declaration order, so Literature sits third.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // "history" so Back from Literature returns to whichever tab opened it.
      backBehavior="history"
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="literature" options={{ title: 'Literature' }} />
      <Tabs.Screen name="journey" options={{ title: 'Journey' }} />
      {/* Settings lives in the tab group but has NO bar button (not in
          FloatingTabBar's TAB_META) — reached from each tab's header gear. It
          stays in the group so the floating tab bar remains visible on it. */}
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
