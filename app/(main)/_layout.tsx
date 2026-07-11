import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTokens } from "@/hooks/useTokens";
import GlobalSponsorFab from "@/components/navigation/GlobalSponsorFab";

export default function MainLayout() {
  const { c, isDark } = useTokens();

  return (
    <View style={{ flex: 1 }}>
    {/* Follow the app's appearance setting (which may differ from the system's) */}
    <StatusBar style={isDark ? "light" : "dark"} />
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: "slide_from_right",
      }}
    >
      {/* Today · Tools · Literature · Journey + Settings (bar-less, gear-opened)
          all live inside the tab group so the floating tab bar stays visible. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="daily-reflections" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="speakers" />
      <Stack.Screen name="speaker-detail" />
      <Stack.Screen name="bigbook" />
      <Stack.Screen name="twelve-and-twelve" />
      <Stack.Screen name="meeting-readings" />
      <Stack.Screen name="meeting-reading" />
      <Stack.Screen name="meetings" />
      <Stack.Screen name="online-meetings" />
      <Stack.Screen name="reach-out" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="pass-it-on" />
      <Stack.Screen name="gift-wallet" />
      <Stack.Screen name="gratitude" />
      <Stack.Screen name="journal" />
      <Stack.Screen name="prayers" />
      <Stack.Screen name="evening-review" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="meditation" />
      <Stack.Screen name="trends" />
      <Stack.Screen name="sober-date" />
      <Stack.Screen name="modal" />
    </Stack>
      <GlobalSponsorFab />
    </View>
  );
}
