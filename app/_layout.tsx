import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback, useState } from "react";
import { Text, StyleSheet, TouchableOpacity, Platform, View, StatusBar } from 'react-native';
import { ChevronLeft } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { HamburgerMenuProvider } from "@/hooks/useHamburgerMenu";
import HamburgerMenu from "@/components/navigation/HamburgerMenu";
import { AudioPlayerProvider } from "@/hooks/useGlobalAudioPlayer";
import {
  useFonts,
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_600SemiBold_Italic,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import {
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_500Medium_Italic,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  WixMadeforDisplay_500Medium,
  WixMadeforDisplay_600SemiBold,
  WixMadeforDisplay_700Bold,
  WixMadeforDisplay_800ExtraBold,
} from '@expo-google-fonts/wix-madefor-display';
import {
  Gelasio_400Regular,
  Gelasio_400Regular_Italic,
} from '@expo-google-fonts/gelasio';
import {
  WixMadeforText_400Regular,
  WixMadeforText_400Regular_Italic,
  WixMadeforText_500Medium,
  WixMadeforText_500Medium_Italic,
  WixMadeforText_600SemiBold,
} from '@expo-google-fonts/wix-madefor-text';

import { ReadingSizeProvider } from "@/hooks/use-reading-size";
import { GratitudeProvider } from "@/hooks/use-gratitude-store";
import { DailiesProvider } from "@/hooks/use-dailies-store";
import { MeditationProvider } from "@/hooks/use-meditation-store";
import { MeditationSessionProvider } from "@/hooks/use-meditation-session";
import { MeditationLogProvider } from "@/hooks/use-meditation-log";
import { UserPrayersProvider } from "@/hooks/use-user-prayers-store";
import { OnboardingProvider, useOnboarding } from "@/hooks/useOnboardingStore";
import { SobrietyProvider } from "@/hooks/useSobrietyStore";
import { EveningReviewProvider } from "@/hooks/use-evening-review-store";
import { MeetingsProvider } from "@/hooks/use-meetings-store";
import { JournalProvider } from "@/hooks/use-journal-store";
import { ContactsProvider } from "@/hooks/use-contacts-store";
import { LastSponsorProvider } from "@/hooks/use-last-sponsor";
import { PdfBookmarksProvider } from "@/hooks/use-pdf-bookmarks";
import { SpeakerFavoritesProvider } from "@/hooks/use-speaker-favorites";
import { CloudSyncGate } from "@/hooks/use-cloud-sync";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { ImmersiveProvider } from "@/hooks/use-immersive";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { useOTAUpdates } from "@/hooks/useOTAUpdates";
import { adjustFontWeight } from "@/constants/fonts";
import { useTokens } from "@/hooks/useTokens";
import OnboardingFlow, { DisclaimerStep } from "@/components/OnboardingFlow";
import { hasAcceptedDisclaimer } from "@/lib/disclaimerConsent";
import PaywallScreen from "@/components/PaywallScreen";
import OTASnackbar from "@/components/OTASnackbar";
import { Logger } from "@/lib/logger";
import { initAnalytics } from "@/lib/analytics";
import { useExpoRouterTracking } from "@/hooks/useExpoRouterTracking";
import { SessionProvider } from "@/hooks/useSessionContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSobrietyBirthday } from "@/hooks/useSobrietyBirthday";
import SobrietyBirthdayModal from "@/components/SobrietyBirthdayModal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  console.log('🟢 SPLASH: Failed to prevent auto-hide, continuing anyway');
});

// The app is portrait-only EXCEPT the PDF reader (which unlocks rotation so
// landscape can render pages larger — PDF text can't reflow like the readers).
// app.json orientation is "default" so the native shell allows landscape; this
// runtime lock keeps everything portrait until a screen opts out. Guarded:
// binaries older than the one bundling expo-screen-orientation (≤126) reject
// the call — they're natively portrait-locked anyway, so it's a no-op there.
try {
  const ScreenOrientation = require('expo-screen-orientation');
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
} catch {}

const queryClient = new QueryClient();

// Entire app is subscription-only after onboarding. ENABLED for 3.0.7 testing —
// renders the RevenueCat "Sober Dailies" paywall on the `default` offering (see
// the gate below); flip to false to disable. When enabled, launch waits on the
// subscription load (RevenueCat + grandfather check) before the gate resolves.
const PAYWALL_ENABLED = true;



// Global flag to track if splash screen has been hidden
let splashHidden = false;

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
  const tokens = useTokens();
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const { showSnackbar, dismissSnackbar, restartApp } = useOTAUpdates();
  const { showBirthdayModal, closeBirthdayModal } = useSobrietyBirthday();
  const { isLoading: isSubscriptionLoading, isPremium } = useSubscription();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_600SemiBold_Italic,
    Inter_700Bold,
    InterTight_700Bold,
    BarlowCondensed_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_500Medium_Italic,
    Lora_700Bold,
    Archivo_600SemiBold,
    Archivo_700Bold,
    WixMadeforDisplay_500Medium,
    WixMadeforDisplay_600SemiBold,
    WixMadeforDisplay_700Bold,
    WixMadeforDisplay_800ExtraBold,
    WixMadeforText_400Regular,
    WixMadeforText_400Regular_Italic,
    WixMadeforText_500Medium,
    WixMadeforText_500Medium_Italic,
    WixMadeforText_600SemiBold,
    Gelasio_400Regular,
    Gelasio_400Regular_Italic,
  });

  // Enable screen tracking for Expo Router
  useExpoRouterTracking();

  // Local state to prevent re-renders from affecting rendering logic
  const [appReady, setAppReady] = useState(false);
  // Session-only paywall dismissal. Never persisted: a lapsed user can close
  // the wall and continue for this running session, but it returns on the next
  // cold launch unless an entitlement has been restored or purchased.
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  // Disclaimer acceptance backstop. null = still reading AsyncStorage (covered
  // by the teal fill). First-run users accept inside OnboardingFlow; this gate
  // records acceptance for legacy installs whose earlier consent was not stored.
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  useEffect(() => {
    hasAcceptedDisclaimer().then(setDisclaimerAccepted).catch(() => setDisclaimerAccepted(true));
  }, []);

  // No OTA check at launch: useOTAUpdates handles updates in the background
  // (initial check shortly after mount + on every foreground) and surfaces the
  // snackbar; an un-applied download takes effect on the next launch.

  // Initialize app services
  useEffect(() => {
    // Initialize in-app logger
    Logger.initialize();

    // Initialize analytics (Mixpanel)
    initAnalytics();

    // Retry the disclaimer-acceptance server sync if it never confirmed
    // (e.g. the user onboarded offline). One AsyncStorage read when synced.
    import('@/lib/disclaimerConsent').then((m) => m.ensureDisclaimerSynced()).catch(() => {});

    
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

  // Handle splash screen hiding based on app state. When the paywall is
  // enabled, wait for the subscription load too — otherwise the splash lifts
  // while the render gate below still returns the fallback, which is the
  // "white period" between splash and app on reopen.
  useEffect(() => {
    // Only proceed when we know the loading state
    if (isLoading === false && fontsLoaded && !(PAYWALL_ENABLED && isSubscriptionLoading)) {
      console.log('🟢 SPLASH: App ready, isOnboardingComplete:', isOnboardingComplete);

      // App is ready to render
      setAppReady(true);

      // Hide splash screen
      hideSplashScreenSafely();
    }
  }, [isLoading, isOnboardingComplete, fontsLoaded, isSubscriptionLoading]);

  // Failsafe: hide splash screen after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🟢 SPLASH: Failsafe timer triggered');
      hideSplashScreenSafely();
      setAppReady(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show the onboarding flow until it's completed — but never before the fonts
  // are in. This gate used to sit above the fontsLoaded check, so on a FRESH
  // INSTALL onboarding could render while Inter/Archivo were still loading:
  // the text laid out against fallback metrics and kept that measurement when
  // the real face arrived, clipping "Get started" down to "Get" (Neal, device
  // test 2026-07-31 — first run only, correct on every later render). The
  // 3-second splash failsafe below is what let it show at all. Teal fill
  // matches the native splash, so the wait reads as the splash, not a flash.
  // Readiness FIRST, then onboarding. This order matters: OnboardingFlow now
  // branches on whether the person already has access (grandfathered members
  // and returning subscribers get a welcome-back screen instead of the full
  // introduction), so it must not mount until subscription state has resolved.
  // Mounting early would show a stranger's welcome to a member and then swap it.
  if (!appReady || isLoading || disclaimerAccepted === null || (PAYWALL_ENABLED && isSubscriptionLoading)) {
    return <View style={{ flex: 1, backgroundColor: '#3D8B8B' }} />;
  }

  if (!isOnboardingComplete) {
    if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#3D8B8B' }} />;
    // The whole first run lives in OnboardingFlow now — including the
    // disclaimer and the paywall, in that order, so nobody pays before they
    // have agreed to what the app is and nobody sets up an app they have not
    // bought. The two gates below remain for everyone PAST first run.
    return (
      <OnboardingFlow
        onDisclaimerAccepted={() => setDisclaimerAccepted(true)}
        onPaywallBypassed={() => setPaywallDismissed(true)}
      />
    );
  }

  // Legacy users may have agreed to an older disclaimer without that acceptance
  // being captured. Record it before any subscription decision; seeing it twice
  // is harmless, while charging before the recorded agreement is not.
  if (!disclaimerAccepted) {
    return <DisclaimerStep onAgree={() => setDisclaimerAccepted(true)} />;
  }

  // Backstop for people who onboarded already and later lapsed — a subscription
  // that expired, or an entitlement that has not reattached after a reinstall.
  if (PAYWALL_ENABLED && !isPremium && !paywallDismissed) {
    // Our own RN paywall (components/PaywallScreen) — replaces RevenueCat's
    // hosted Paywall UI while purchases and entitlements remain store-native
    // through react-native-purchases. PaywallScreen applies the returned
    // CustomerInfo so isPremium flips and the gate falls through to Today.
    // Keep this wall dismissible in production too. First-run onboarding and
    // this returning/lapsed-user backstop must expose the same clear close
    // control; dismissal lasts only for this running app session.
    return (
      <PaywallScreen
        onDismiss={() => setPaywallDismissed(true)}
        // If offerings never load there is nothing to buy, so don't hold them
        // here. Dismissed for the session only — the wall returns next launch.
        onUnavailableDismiss={() => setPaywallDismissed(true)}
      />
    );
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
            <ChevronLeft color={tokens.colors.primary} size={20} />
            <Text style={[styles.backText, { color: tokens.colors.primary }]}>Back</Text>
          </TouchableOpacity>
        ) : null,
        contentStyle: { backgroundColor: tokens.c.background },
        headerStyle: {
          backgroundColor: tokens.isDark ? tokens.c.surface : tokens.c.surface,
        },
        headerTitleStyle: {
          fontWeight: adjustFontWeight("600", true),
        },
      }}>
        <Stack.Screen 
          name="(main)" 
          options={{ 
            headerShown: false
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
            gestureEnabled: true,       // swipe-down to dismiss the sheet (iOS)
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
      <ThemeProvider>
        <SessionProvider>
          <SubscriptionProvider>
            <OnboardingProvider>
              <ReadingSizeProvider>
                <GratitudeProvider>
                  <SobrietyProvider>
                    <DailiesProvider>
                    <MeditationProvider>
                    <MeditationLogProvider>
                    <MeditationSessionProvider>
                    <UserPrayersProvider>
                    <EveningReviewProvider>
                    <MeetingsProvider>
                    <JournalProvider>
                    <ContactsProvider>
                    <LastSponsorProvider>
                    <PdfBookmarksProvider>
                    <SpeakerFavoritesProvider>
                    <ImmersiveProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <KeyboardProvider>
                        {Platform.OS === 'android' && (
                          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
                        )}
                        <ActionSheetProvider>
                          <ErrorBoundary>
                            <AudioPlayerProvider>
                              <HamburgerMenuProvider>
                                <RootLayoutNav />
                                <CloudSyncGate />
                                <HamburgerMenu />
                              </HamburgerMenuProvider>
                            </AudioPlayerProvider>
                          </ErrorBoundary>
                        </ActionSheetProvider>
                        </KeyboardProvider>
                      </GestureHandlerRootView>
                    </ImmersiveProvider>
                    </SpeakerFavoritesProvider>
                    </PdfBookmarksProvider>
                    </LastSponsorProvider>
                    </ContactsProvider>
                    </JournalProvider>
                    </MeetingsProvider>
                    </EveningReviewProvider>
                    </UserPrayersProvider>
                    </MeditationSessionProvider>
                    </MeditationLogProvider>
                    </MeditationProvider>
                    </DailiesProvider>
                  </SobrietyProvider>
                </GratitudeProvider>
              </ReadingSizeProvider>
            </OnboardingProvider>
          </SubscriptionProvider>
        </SessionProvider>
      </ThemeProvider>
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
