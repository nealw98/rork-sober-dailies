import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/hooks/useTheme";

export default function MainLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="daily-reflections" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="speakers" />
      <Stack.Screen name="speaker-detail" />
      <Stack.Screen name="literature" />
      <Stack.Screen name="bigbook" />
      <Stack.Screen name="twelve-and-twelve" />
      <Stack.Screen name="meeting-pocket" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="gratitude" />
      <Stack.Screen name="prayers" />
      <Stack.Screen name="evening-review" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="tools" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="add-contact" />
      <Stack.Screen name="modal" />
    </Stack>
  );
}
