import { Tabs } from "expo-router";
import React from "react";
import { RedesignTabBar } from "@/components/navigation/RedesignTabBar";
import { redesignColors } from "@/constants/redesignTokens";

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <RedesignTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: redesignColors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="journey" options={{ title: "Journey" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />

      <Tabs.Screen name="daily-reflections" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="speakers" options={{ href: null }} />
      <Tabs.Screen name="speaker-detail" options={{ href: null }} />
      <Tabs.Screen name="literature" options={{ href: null }} />
      <Tabs.Screen name="bigbook" options={{ href: null }} />
      <Tabs.Screen name="twelve-and-twelve" options={{ href: null }} />
      <Tabs.Screen name="meeting-pocket" options={{ href: null }} />
      <Tabs.Screen name="gratitude" options={{ href: null }} />
      <Tabs.Screen name="prayers" options={{ href: null }} />
      <Tabs.Screen name="evening-review" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="check-in" options={{ href: null }} />
      <Tabs.Screen name="add-contact" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
    </Tabs>
  );
}
