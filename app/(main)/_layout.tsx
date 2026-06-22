import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/hooks/useTheme";

export default function MainLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: "slide_from_right",
      }}
    >
      {/* Today · Tools · Journey · Settings live inside the tab group */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="daily-reflections" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="speakers" />
      <Stack.Screen name="speaker-detail" />
      <Stack.Screen name="literature" />
      <Stack.Screen name="bigbook" />
      <Stack.Screen name="twelve-and-twelve" />
      <Stack.Screen name="meeting-pocket" />
      <Stack.Screen name="meetings" />
      <Stack.Screen name="online-meetings" />
      <Stack.Screen name="gratitude" />
      <Stack.Screen name="journal" />
      <Stack.Screen name="prayers" />
      <Stack.Screen name="evening-review" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="add-contact" />
      <Stack.Screen name="my-dailies" />
      <Stack.Screen name="meditation" />
      <Stack.Screen name="sober-date" />
      <Stack.Screen name="modal" />
    </Stack>
  );
}
