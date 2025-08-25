import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { LogBox, ErrorUtils, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Add unhandled promise rejection handler
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.log('=== UNHANDLED REJECTION ===');
    console.log('Reason:', reason);
    console.log('Promise:', promise);
  });
}

// Global error handler
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log('=== GLOBAL ERROR ===');
  console.log('Is Fatal:', isFatal);
  console.log('Error:', error);
  console.log('Stack:', error.stack);
});

// Override console.error for better error tracking
const originalConsoleError = console.error;
console.error = (...args) => {
  console.log('=== ERROR LOG ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Arguments:', args);
  originalConsoleError.apply(console, args);
};

// Disable yellow box warnings for development
LogBox.ignoreAllLogs();

import { GratitudeProvider } from "@/hooks/use-gratitude-store";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboardingStore";
import { SobrietyProvider } from "@/hooks/useSobrietyStore";
import { EveningReviewProvider } from "@/hooks/use-evening-review-store";
import { adjustFontWeight } from "@/constants/fonts";
import Colors from "@/constants/colors";
import WelcomeScreen from "@/components/WelcomeScreen";
import CustomSplashScreen from "@/components/CustomSplashScreen";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isOnboardingComplete, isLoading } = useOnboarding();

  console.log('=== ROOT LAYOUT NAV RENDER ===');
  console.log('RootLayoutNav - isLoading:', isLoading, 'isOnboardingComplete:', isOnboardingComplete);
  console.log('Current timestamp:', new Date().toISOString());
  console.log('useOnboarding hook result type:', typeof useOnboarding);

  // Hide splash screen when app is ready
  const hideSplashScreen = useCallback(async () => {
    if (!isLoading) {
      console.log('Hiding splash screen');
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.log('Error hiding splash screen:', error);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    hideSplashScreen();
  }, [hideSplashScreen]);

  // Render different screens based on state
  if (isLoading) {
    console.log('Still loading, showing custom splash screen');
    return <CustomSplashScreen />;
  }

  if (!isOnboardingComplete) {
    console.log('Showing welcome screen');
    return <WelcomeScreen />;
  }

  console.log('Showing main app');

  return (
    <Stack screenOptions={{ 
      headerBackTitle: "",
      headerTitleAlign: 'center',
      headerLeft: ({ canGoBack }) => canGoBack ? (
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft color={Colors.light.tint} size={20} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      ) : null,
      headerLeftContainerStyle: {
        paddingLeft: 16,
        minWidth: 80, // Reserve space for consistent centering
      },
      headerRightContainerStyle: {
        paddingRight: 16,
        minWidth: 80, // Balance the left side
      },
      headerStyle: {
        backgroundColor: "#f8f9fa",
      },
      headerTitleStyle: {
        fontWeight: adjustFontWeight("600", true),
        textAlign: 'center',
      },
    }}>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          title: "AA Sober Companion"
        }} 
      />
      <Stack.Screen 
        name="terms" 
        options={{ 
          presentation: 'modal',
          title: "Terms of Use"
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          presentation: 'modal',
          title: "Privacy Policy"
        }} 
      />
      <Stack.Screen 
        name="daily-reflections" 
        options={{ 
          title: "Daily Reflections"
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0, // Remove extra padding since we handle it in container
  },
  backText: {
    fontSize: 17,
    color: Colors.light.tint,
    marginLeft: 4,
  },
});

export default function RootLayout() {
  console.log('=== ROOT LAYOUT INIT ===');
  console.log('Initializing providers and root layout');
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider>
          <GratitudeProvider>
            <SobrietyProvider>
              <EveningReviewProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </EveningReviewProvider>
            </SobrietyProvider>
          </GratitudeProvider>
        </OnboardingProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('FATAL ERROR in RootLayout:', error);
    return null;
  }
}