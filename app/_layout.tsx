import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GratitudeProvider } from "@/hooks/use-gratitude-store";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboardingStore";
import { SobrietyProvider } from "@/hooks/useSobrietyStore";
import { EveningReviewProvider } from "@/hooks/use-evening-review-store";
import { adjustFontWeight } from "@/constants/fonts";
import Colors from "@/constants/colors";
import WelcomeScreen from "@/components/WelcomeScreen";
import { configurePurchases } from "@/lib/purchases";

// Prevent the splash screen from auto-hiding before asset loading is complete.
console.log('🟢 SPLASH: Preventing auto-hide');
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isOnboardingComplete, isLoading } = useOnboarding();

  useEffect(() => {
    try {
      configurePurchases();
    } catch (e) {
      // noop
    }
  }, []);

  // Hide splash screen when app is ready
  const hideSplashScreen = useCallback(async () => {
    console.log('🟢 SPLASH: hideSplashScreen called, isLoading:', isLoading);
    if (!isLoading) {
      try {
        console.log('🟢 SPLASH: Attempting to hide splash screen');
        await SplashScreen.hideAsync();
        console.log('🟢 SPLASH: Successfully hid splash screen');
      } catch (error) {
        console.log('🟢 SPLASH: Error hiding splash screen:', error);
      }
    } else {
      console.log('🟢 SPLASH: Still loading, not hiding splash screen yet');
    }
  }, [isLoading]);

  useEffect(() => {
    console.log('🟢 SPLASH: useEffect triggered, calling hideSplashScreen');
    hideSplashScreen();
  }, [hideSplashScreen]);

  // Render different screens based on state
  console.log('🟢 SPLASH: Rendering decision - isLoading:', isLoading, 'isOnboardingComplete:', isOnboardingComplete);
  if (isLoading) {
    console.log('🟢 SPLASH: Still loading, returning null');
    return null; // Let the system splash screen handle the loading state
  }

  if (!isOnboardingComplete) {
    return <WelcomeScreen />;
  }

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
        paddingLeft: Platform.OS === 'android' ? 8 : 16,
        minWidth: Platform.OS === 'android' ? 0 : 80,
      },
      headerRightContainerStyle: {
        paddingRight: Platform.OS === 'android' ? 8 : 16,
        minWidth: Platform.OS === 'android' ? 0 : 80,
      },
      headerStyle: {
        backgroundColor: "#f8f9fa",
        height: Platform.OS === 'android' ? 44 : undefined,
      },
      headerTitleStyle: {
        fontWeight: adjustFontWeight("600", true),
      },
    }}>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="terms" 
        options={{ 
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          presentation: 'modal'
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
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 4,
  },
});

export default function RootLayout() {
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