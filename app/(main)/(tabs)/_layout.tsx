import { Tabs } from 'expo-router';
import React from 'react';

/**
 * The four redesign-3.0 destinations: Today · Tools · Literature · Journey.
 * The tab chrome is drawn app-wide by SideInsetGuard, not here, so it stays
 * on pushed screens too: a docked bottom bar on phones, the strip rail on
 * the Duo, the right-edge rail on iPad.
 *
 * Settings is no longer a tab; it lives in the tab group bar-less and opens
 * from a header gear or the rail's bottom gear. Leaf screens (Daily
 * Reflection, Gratitude, chat, …) live one level up in the (main) Stack.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // "history" so Back from Literature returns to whichever tab opened it.
      backBehavior="history"
      // The tab chrome is app-wide (SideInsetGuard).
      tabBar={() => null}
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
  );
}
