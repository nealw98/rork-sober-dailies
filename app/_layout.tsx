import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback, useState } from "react";
import { Text, StyleSheet, TouchableOpacity, Platform, View } from 'react-native';
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
import { initUsageLogger } from "@/lib/usageLogger";
import { useExpoRouterTracking } from "@/hooks/useExpoRouterTracking";
import { SessionProvider } from "@/hooks/useSessionContext";
import { useSobrietyBirthday } from "@/hooks/useSobrietyBirthday";
import SobrietyBirthdayModal from "@/components/SobrietyBirthdayModal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  console.log('🟢 SPLASH: Failed to prevent auto-hide, continuing anyway');
});

const queryClient = new QueryClient();

// Global flag to track if splash screen has been hidden
let splashHidden = false;
// Global flag to ensure we only perform the early OTA check once per launch
let otaCheckedThisLaunch = false;

// Single function to hide splash screen
const hideSplashScreenSafely = async () => {
  if (splashHidden) return;
  
  try {
    console.log('🟢 SPLASH: Attempting to hide splash screen');
    await SplashScreen.hideAsync();
    splashHidden = true;
    console.log('🟢 SPLASH: Successfully hid splash screen');
  } catch (error) {
    console.log('🟢 SPLASH: Error hiding splash screen:', error);
  }
};

function RootLayoutNav() {
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const { showSnackbar, dismissSnackbar, restartApp } = useOTAUpdates();
  const { showBirthdayModal, closeBirthdayModal } = useSobrietyBirthday();

  // Enable screen tracking for Expo Router
  useExpoRouterTracking();

  // Local state to prevent re-renders from affecting rendering logic
  const [appReady, setAppReady] = useState(false);
  // Ensure OTA selection/check completes before we hide splash
  const [otaChecked, setOtaChecked] = useState(false);

  // Early OTA check while splash is still shown - mirrors earlier stable behavior
  useEffect(() => {
    let didCancel = false;
    (async () => {
      if (otaCheckedThisLaunch) {
        setOtaChecked(true);
        return;
      }
      try {
        const Updates = await import('expo-updates');
        // Short timeout to avoid blocking launch
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1500));
        const checkPromise = (async () => {
          try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable) {
              console.log('[OTA] Early splash check: update available, fetching');
              const fetched = await Updates.fetchUpdateAsync();
              if (fetched.isNew) {
                otaCheckedThisLaunch = true;
                if (!didCancel) {
                  await Updates.reloadAsync();
                }
                return null;
              }
            }
          } catch (e) {
            console.log('[OTA] Early splash check error:', (e as any)?.message || e);
          }
          return null;
        })();
        await Promise.race([timeout, checkPromise]);
      } finally {
        if (!didCancel) {
          otaCheckedThisLaunch = true;
          setOtaChecked(true);
        }
      }
    })();
    return () => { didCancel = true; };
  }, []);

  // Initialize app services
  useEffect(() => {
    // Initialize in-app logger and purchases
    Logger.initialize();
    configurePurchases();

    // Initialize usage logger
    initUsageLogger();

    
    // Log OTA diagnostics with safe fallback
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
        // Safe fallback: log error but don't crash
        console.log('[OTA] error', e?.message || String(e));
        // In production builds, this would be logged via Logger.logDiag
        // but we don't want to import Logger here to avoid circular dependencies
      }
    })();
  }, []);

  // Handle splash screen hiding based on app state
  useEffect(() => {
    // Only proceed when we know the loading state
    if (isLoading === false && otaChecked) {
      console.log('🟢 SPLASH: App ready, isOnboardingComplete:', isOnboardingComplete);
      
      // App is ready to render
      setAppReady(true);
      
      // Hide splash screen
      hideSplashScreenSafely();
    }
  }, [isLoading, isOnboardingComplete, otaChecked]);

  // Failsafe: hide splash screen after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🟢 SPLASH: Failsafe timer triggered');
      hideSplashScreenSafely();
      setAppReady(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show consent page immediately if not completed, regardless of other initialization
  if (!isOnboardingComplete) {
    return <WelcomeScreen />;
  }

  // Only show main app after consent is complete AND other initialization is done
  if (!appReady || isLoading) {
    return null; // Let splash screen remain visible
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
        <OTASnackbar visible={showSnackbar} onDismiss={dismissSnackbar} onRestart={restartApp} />
        <SobrietyBirthdayModal visible={showBirthdayModal} onClose={closeBirthdayModal} />
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
  // Ensure splash screen is hidden even if providers have errors
  React.useEffect(() => {
    const timer = setTimeout(() => {
      hideSplashScreenSafely();
    }, 5000); // Last resort failsafe
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <OnboardingProvider>
          <GratitudeProvider>
            <SobrietyProvider>
              <EveningReviewProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <ErrorBoundary>
                    <RootLayoutNav />
                  </ErrorBoundary>
                </GestureHandlerRootView>
              </EveningReviewProvider>
            </SobrietyProvider>
          </GratitudeProvider>
        </OnboardingProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

// Simple error boundary to prevent crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('FATAL ERROR in RootLayout:', error, info);
    hideSplashScreenSafely();
  }

  render() {
    if (this.state.hasError) {
      hideSplashScreenSafely();
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
          <Text style={{fontSize: 18, marginBottom: 20, textAlign: 'center'}}>
            Something went wrong. Please restart the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}