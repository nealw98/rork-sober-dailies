import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  console.log('=== EXPO ROUTER LAYOUT LOADING ===');
  
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  );
}