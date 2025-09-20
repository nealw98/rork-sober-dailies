import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import { GratitudeProvider } from "@/hooks/use-gratitude-store";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboardingStore";
import { SobrietyProvider } from "@/hooks/useSobrietyStore";
import { EveningReviewProvider } from "@/hooks/use-evening-review-store";
import { useOTAUpdates } from "@/hooks/useOTAUpdates";
import { adjustFontWeight } from "@/constants/fonts";
import Colors from "@/constants/colors";
import WelcomeScreen from "@/components/WelcomeScreen";
import OTASnackbar from "@/components/OTASnackbar";
import { configurePurchases } from "@/lib/purchases";
import { Logger } from "@/lib/logger";
// Lazy-load expo-updates to avoid crashes in environments without the native module (e.g., Expo Go)

// Prevent the splash screen from auto-hiding before asset loading is complete.
console.log('🟢 SPLASH: Preventing auto-hide');
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const { showSnackbar, dismissSnackbar } = useOTAUpdates();

  useEffect(() => {
    try {
      // Initialize in-app logger ASAP so it captures early logs
      Logger.initialize();
      configurePurchases();
      // OTA diagnostics (safe in dev/simulator)
      (async () => {
        try {
          const Updates = await import('expo-updates');
          console.log('[OTA] moduleLoaded=', !!Updates && typeof Updates.checkForUpdateAsync === 'function');
          const runtimeVersion = Updates.runtimeVersion;
          const url = (Updates as any)?.updateUrl ?? (Updates as any)?.manifest?.extra?.expoClient?.updates?.url ?? 'unknown';
          const isEmbeddedLaunch = Updates.isEmbeddedLaunch;
          const updateId = Updates.updateId ?? 'embedded';
          console.log(`[OTA] runtimeVersion=${runtimeVersion} url=${url}`);
          console.log(`[OTA] launchedFrom=${isEmbeddedLaunch ? 'embedded' : 'OTA'} updateId=${updateId}`);
        } catch (e: any) {
          console.log('[OTA] error', e?.message || String(e));
        }
      })();
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

  // Force hide splash screen when onboarding is complete
  useEffect(() => {
    if (!isLoading && isOnboardingComplete) {
      console.log('🟢 SPLASH: Onboarding complete, force hiding splash screen');
      const hideSplash = async () => {
        try {
          console.log('🟢 SPLASH: Attempting force hide');
          await SplashScreen.hideAsync();
          console.log('🟢 SPLASH: Force hide successful');
        } catch (error) {
          console.log('🟢 SPLASH: Force hide failed:', error);
        }
      };
      hideSplash();
    }
  }, [isLoading, isOnboardingComplete]);

  // Hard fallback: ensure splash is hidden after a short delay
  useEffect(() => {
    const timeout = setTimeout(async () => {
      console.log('🟢 SPLASH: Hard fallback timeout - forcing hide');
      try {
        await SplashScreen.hideAsync();
        console.log('🟢 SPLASH: Hard fallback successful');
      } catch (error) {
        console.log('🟢 SPLASH: Hard fallback failed:', error);
      }
    }, 3000); // 3 second timeout
    return () => clearTimeout(timeout);
  }, []);

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
    <>
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
        contentStyle: { backgroundColor: "#f8f9fa" },
        headerStyle: {
          backgroundColor: "#f8f9fa",
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
            presentation: 'modal',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="privacy" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="about-support" 
          options={{ 
            headerShown: true,
          }} 
        />
        
      </Stack>
      <OTASnackbar visible={showSnackbar} onDismiss={dismissSnackbar} />
    </>
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