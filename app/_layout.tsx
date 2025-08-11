import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SobrietyProvider } from "@/hooks/use-sobriety-store";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="check-in" 
        options={{ 
          title: "Daily Check-In",
          presentation: "modal",
          headerStyle: {
            backgroundColor: '#6B46C1',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="add-contact" 
        options={{ 
          title: "Add Emergency Contact",
          presentation: "modal",
          headerStyle: {
            backgroundColor: '#6B46C1',
          },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SobrietyProvider>
          <RootLayoutNav />
        </SobrietyProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}