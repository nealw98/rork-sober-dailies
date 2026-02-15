import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback, useState } from "react";
import { Text, StyleSheet, TouchableOpacity, Platform, View, StatusBar } from 'react-native';
import { ChevronLeft } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GratitudeProvider } from "@/hooks/use-gratitude-store";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboardingStore";
import { SobrietyProvider } from "@/hooks/useSobrietyStore";
import { EveningReviewProvider } from "@/hooks/use-evening-review-store";
import { TextSettingsProvider } from "@/hooks/use-text-settings";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { useOTAUpdates } from "@/hooks/useOTAUpdates";
import { adjustFontWeight } from "@/constants/fonts";
import { useTheme } from "@/hooks/useTheme";
import WelcomeScreen from "@/components/WelcomeScreen";
import PaywallScreen from "@/components/PaywallScreen";
import OTASnackbar from "@/components/OTASnackbar";
import { Logger } from "@/lib/logger";
import { initUsageLogger, setPostHogForUsageLogger, getAnonymousId } from "@/lib/usageLogger";
import { recordAppOpen } from "@/lib/reviewPrompt";
import { useExpoRouterTracking } from "@/hooks/useExpoRouterTracking";
import { SessionProvider } from "@/hooks/useSessionContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSobrietyBirthday } from "@/hooks/useSobrietyBirthday";
import SobrietyBirthdayModal from "@/components/SobrietyBirthdayModal";
import { getSobrietyMilestone } from "@/utils/sobriety";

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

/**
 * Component that identifies the user with PostHog using the same anonymous ID
 * that Supabase uses (stored in SecureStore). This ensures consistent user
 * tracking across both analytics systems.
 * 
 * Also sets sobriety milestone (range only, not actual date) as a user property.
 * Must be a child of PostHogProvider to access usePostHog hook.
 */
function PostHogIdentifier({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();

  useEffect(() => {
    let isMounted = true;

    const identifyUser = async () => {
      try {
        // Register PostHog instance with usageLogger for dual tracking
        if (posthog) {
          setPostHogForUsageLogger(posthog);
        }

        // Get the same anonymous ID that Supabase uses (from SecureStore)
        // This ensures consistent user tracking across both systems
        const anonymousId = await getAnonymousId();
        
        if (!anonymousId) {
          console.warn('[PostHog] No anonymous ID available for identification');
          return;
        }

        if (!isMounted || !posthog) {
          return;
        }

        console.log('[PostHog] Identifying user with anonymous ID:', anonymousId);

        // Get sobriety date from AsyncStorage
        const sobrietyDataStr = await AsyncStorage.getItem('sobriety_data');
        let sobrietyDate: string | null = null;
        
        if (sobrietyDataStr) {
          try {
            const sobrietyData = JSON.parse(sobrietyDataStr);
            sobrietyDate = sobrietyData.sobrietyDate || null;
          } catch (parseError) {
            console.error('[PostHog] Error parsing sobriety data:', parseError);
          }
        }

        // Calculate milestone range (NEVER send actual date)
        const milestone = getSobrietyMilestone(sobrietyDate);
        
        console.log('[PostHog] Sobriety milestone:', milestone);

        // Identify user with anonymous ID (same as Supabase) and milestone as person property
        posthog.identify(anonymousId, {
          sobriety_milestone: milestone,
        });

        // Register milestone and anonymous ID as super properties (included with every event)
        posthog.register({
          sobriety_milestone: milestone,
          sober_dailies_anonymous_id: anonymousId,
        });

        console.log('[PostHog] User identified with shared anonymous ID and milestone');
      } catch (error) {
        console.error('[PostHog] Error during identification:', error);
      }
    };

    identifyUser();

    return () => {
      isMounted = false;
    };
  }, [posthog]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const { palette } = useTheme();
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const { showSnackbar, dismissSnackbar, restartApp } = useOTAUpdates();
  const { showBirthdayModal, closeBirthdayModal } = useSobrietyBirthday();
  const { isLoading: isSubscriptionLoading, isPremium } = useSubscription();

  // Enable screen tracking for Expo Router
  useExpoRouterTracking();

  // Local state to prevent re-renders from affecting rendering logic
  const [appReady, setAppReady] = useState(false);
  // Dev-only: allow dismissing the paywall
  const [paywallDismissed, setPaywallDismissed] = useState(false);
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
    // Initialize in-app logger
    Logger.initialize();

    // Initialize usage logger
    initUsageLogger();

    recordAppOpen().catch((error) => {
      console.warn('[reviewPrompt] Failed to record app open from root layout', error);
    });

    
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
  if (!appReady || isLoading || isSubscriptionLoading) {
    return null; // Let splash screen remain visible
  }

  // Entire app is subscription-only after onboarding.
  if (!isPremium && !paywallDismissed) {
    return <PaywallScreen onDismiss={__DEV__ ? () => setPaywallDismissed(true) : undefined} />;
  }

  return (
    <>
      <Stack screenOptions={{ 
        headerBackTitle: "",
        headerTitleAlign: 'center',
        headerTransparent: false,
        headerLeft: ({ canGoBack }) => canGoBack ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft color={palette.tint} size={20} />
            <Text style={[styles.backText, { color: palette.tint }]}>Back</Text>
          </TouchableOpacity>
        ) : null,
        contentStyle: { backgroundColor: palette.cardBackground },
        headerStyle: {
          backgroundColor: palette.cardBackground,
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
          name="sponsor-chat" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="about" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
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
      <PostHogProvider
        apiKey="phc_rNmxplbqDdGgWftieyYPJoKJHRYpWT0QHdwiSFYMfI1"
        options={{
          host: 'https://us.i.posthog.com',
          enableSessionReplay: true,
        }}
        autocapture={{
          captureTouches: false, // Disable touch autocapture
          captureLifecycleEvents: true, // Keep app open/close events
          captureScreens: true // Keep screen navigation
        }}
      >
        <PostHogIdentifier>
          <ThemeProvider>
            <SessionProvider>
              <SubscriptionProvider>
                <OnboardingProvider>
                  <TextSettingsProvider>
                    <GratitudeProvider>
                      <SobrietyProvider>
                        <EveningReviewProvider>
                          <GestureHandlerRootView style={{ flex: 1 }}>
                            {Platform.OS === 'android' && (
                              <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
                            )}
                            <ErrorBoundary>
                              <RootLayoutNav />
                            </ErrorBoundary>
                          </GestureHandlerRootView>
                        </EveningReviewProvider>
                      </SobrietyProvider>
                    </GratitudeProvider>
                  </TextSettingsProvider>
                </OnboardingProvider>
              </SubscriptionProvider>
            </SessionProvider>
          </ThemeProvider>
        </PostHogIdentifier>
      </PostHogProvider>
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