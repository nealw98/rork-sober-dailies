import { Tabs } from 'expo-router';
import React from 'react';
import FloatingTabBar from '@/components/navigation/FloatingTabBar';

/**
 * The four redesign-3.0 destinations: Today · Tools · Journey · Settings.
 * Rendered with a custom floating bar (+ Sponsor FAB) — see FloatingTabBar.
 * Leaf screens (Daily Reflection, Gratitude, chat, …) live one level up in the
 * (main) Stack, so pushing them covers the bar — exactly the prototype's
 * "tab bar only on top-level destinations" behavior.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="journey" options={{ title: 'Journey' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
