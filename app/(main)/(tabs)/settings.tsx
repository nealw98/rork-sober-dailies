// Settings — rebuilt from the prototype (frames/hifi-profile-v2.jsx · ProfileHiFiB).
// Tab-style header (large "Settings" title + serif subtitle, matching Today /
// Journey / Tools — no TopLevelHeader, no Home/hamburger, no eyebrow). Content is
// token-based CardGroup / CardRow / SettingSection blocks: Appearance, Your
// Data, Support Sober Dailies, About, and a dev-only group. (Text size follows
// the OS system setting / Dynamic Type — there is no in-app control.)
// Legal links + version live at the foot of the scroll (the floating tab bar +
// FAB sit above). Hidden QA: tap the version 7× for the Support ID; long-press for
// the Developer Console. Reminders (notifications) from the prototype are deferred.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Linking, ScrollView,
  Modal, SafeAreaView as RNSafeAreaView, Alert, TextInput, ActivityIndicator,
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, type Href } from 'expo-router';
import { shareApp } from '@/lib/shareApp';
import { ChevronRight, X, RefreshCw, UserPlus, Flag, RotateCcw, Play, Power, CircleDot, Gift, Fingerprint, MessageSquare } from 'lucide-react-native';
import {
  fontFamily,
  shadows,
  type Tokens,
} from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { ThemedCard } from '@/components/ThemedCard';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import PaywallScreen from '@/components/PaywallScreen';
import { QA_FORCE_NEW_USER_KEY, useSubscription } from '@/hooks/useSubscription';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { useTheme } from '@/hooks/useTheme';
import { Logger } from '@/lib/logger';
import { submitFeedback } from '@/lib/feedback';
import { logEvent, setAnalyticsDeveloperMode, DEVELOPER_MODE_KEY } from '@/lib/analytics';
import { getAnonymousId } from '@/lib/anonymousId';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { clearUserData } from '@/lib/userDataSync';
import {
  qaGrantPasses, qaFetchCreditStatus, getPassesOverride, setPassesOverride,
  type CreditStatus, type AnnouncePlan,
} from '@/lib/creditsService';
import GiftThankYouSheet from '@/components/GiftThankYouSheet';
import { qaPreviewTrialReminder } from '@/lib/trialReminder';
import { setSyncPaused, cloudBackupSupported } from '@/lib/cloudSync';
import { getQaEngine, setQaEngine, type QaEngine } from '@/lib/sponsorApiSettings';
import { checkDeveloperAccess } from '@/lib/developerAccess';

// ─── Token-based building blocks (mirror the prototype) ──────────────────────

// A labelled card containing one or more rows. Uses the full ThemedCard
// treatment so on OLED it reads as a lit surface, not an outline on black.
function CardGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ThemedCard radius={14} shadow="sm" contentStyle={styles.cardInner}>{children}</ThemedCard>
    </View>
  );
}

// A tappable row inside a CardGroup: optional leading icon + label (+ optional
// sub / value) + chevron. `valueColor` lets a row tint its value (Pass It On).
function CardRow({
  label, value, sub, last, onPress, icon, valueColor,
}: {
  label: string; value?: string; sub?: string; last?: boolean; onPress?: () => void;
  icon?: React.ReactNode; valueColor?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {icon}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {value ? (
        <Text style={[styles.rowValue, valueColor ? { color: valueColor, fontFamily: fontFamily.semiBold } : null]}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={18} color={c.textMuted} />
    </TouchableOpacity>
  );
}

// A labelled section that holds an inline control (no card chrome).
function SettingSection({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

// Destructive tint in the Developer Console (matches the app's remove-control red).
const DANGER = '#D8584E';

const APPEARANCE_OPTIONS = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
] as const;

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { resetOnboarding, resetOnboardingAsUpgrader } = useOnboarding();
  const { colorScheme, setColorScheme } = useTheme();
  const { customerInfo } = useSubscription();

  // Only store subscribers get the row: managementURL is null for
  // grandfathered members, pass riders, and free users, so none of them see
  // a "subscription" they don't have.
  const managementURL = customerInfo?.managementURL ?? null;
  const openManageSubscription = async () => {
    try {
      // Lazy require, getSMS()-style: purchases-ui ships in the 3.0.8 binary,
      // but an OTA of this file must never crash a binary without the module.
      const RevenueCatUI = require('react-native-purchases-ui').default;
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.warn('[Settings] Customer Center unavailable, opening store page:', e);
      if (managementURL) Linking.openURL(managementURL);
    }
  };

  useScreenTimeTracking('Settings');

  const [logsVisible, setLogsVisible] = useState(false);
  const [isCheckingDeveloperAccess, setIsCheckingDeveloperAccess] = useState(false);
  const [developerPinVisible, setDeveloperPinVisible] = useState(false);
  const [developerPin, setDeveloperPin] = useState('');
  const [developerPinError, setDeveloperPinError] = useState<string | null>(null);
  const [logsText, setLogsText] = useState('');
  // QA: preview the paywall in either state ('trial' | 'notrial'). Close the
  // Developer Console first, else the preview modal opens behind it (iOS stacks
  // modals — a second modal presented under an open one never shows).
  const [paywallPreview, setPaywallPreview] = useState<'trial' | 'notrial' | null>(null);
  const openPaywallPreview = (mode: 'trial' | 'notrial') => {
    setLogsVisible(false);
    setTimeout(() => setPaywallPreview(mode), 350);
  };
  // QA: preview the post-subscribe thank-you sheet (annual = 5 passes,
  // monthly = 1 pass) without buying. Same modal-stacking dance as above.
  const [thankYouPreview, setThankYouPreview] = useState<AnnouncePlan | null>(null);
  const openThankYouPreview = (plan: AnnouncePlan) => {
    setLogsVisible(false);
    setTimeout(() => setThankYouPreview(plan), 350);
  };
  // QA: the arrival sheet fires days after purchase (passes are earned on the
  // first real charge) and is swallowed while PASSES_ENABLED is false, so this
  // is the only way to see it on device before the flip.
  const [arrivalPreview, setArrivalPreview] = useState<number | null>(null);
  const openArrivalPreview = (count: number) => {
    setLogsVisible(false);
    setTimeout(() => setArrivalPreview(count), 350);
  };
  // Console actions that alert/navigate must close the console modal first
  // (iOS stacks modals — anything presented under an open one never shows).
  const fromConsole = (fn: () => void) => {
    setLogsVisible(false);
    setTimeout(fn, 350);
  };
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  // QA: force-new-user flag mirror (so the toggle button shows ON/OFF).
  const [forceNewUser, setForceNewUser] = useState(false);
  useEffect(() => {
    SecureStore.getItemAsync(QA_FORCE_NEW_USER_KEY)
      .then((v) => setForceNewUser(v === 'true'))
      .catch(() => {});
  }, []);
  // QA: Auto routes Sam to Terra and the other sponsors to Luna. Explicit
  // selections override both chat surfaces for comparisons.
  // on silently served the free lifeboat for a whole evaluation session,
  // which is why the row labels the ACTIVE engine rather than the one it
  // switches to. Read per call — applies to the next message, no restart.
  const [qaEngine, setQaEngineState] = useState<QaEngine>('auto');
  useEffect(() => {
    getQaEngine().then(setQaEngineState).catch(() => {});
  }, []);
  const toggleQaEngine = async () => {
    const next: QaEngine = qaEngine === 'auto' ? 'luna' : qaEngine === 'luna' ? 'terra' : qaEngine === 'terra' ? 'sonnet' : 'auto';
    setQaEngineState(next);
    await setQaEngine(next);
  };

  const toggleForceNewUser = async () => {
    const next = !forceNewUser;
    Alert.alert(
      next ? 'Force New-User: ON' : 'Force New-User: OFF',
      next
        ? 'The app will ignore your grandfather status and any existing subscription, so the paywall gates like a fresh install. A sandbox purchase this session still unlocks. Restart now to apply.'
        : 'Grandfather / subscription status will be honored again. Restart now to apply.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply & Restart',
          onPress: async () => {
            try {
              if (next) await SecureStore.setItemAsync(QA_FORCE_NEW_USER_KEY, 'true');
              else await SecureStore.deleteItemAsync(QA_FORCE_NEW_USER_KEY);
              setForceNewUser(next);
              const Updates = await import('expo-updates');
              await Updates.reloadAsync();
            } catch (e) {
              console.error('[Settings] toggle force-new-user failed', e);
              Alert.alert('Error', 'Could not toggle the flag. You may need to restart the app manually.');
            }
          },
        },
      ]
    );
  };

  // QA: gift passes. Hand grants write the same gift_credit_grants ledger the
  // automatic ones do (annual 5/yr, monthly tenure, grandfathered founding_y1)
  // via the dev_grant_passes RPC. The server refuses devices not in its
  // dev_pass_granters allowlist, so these buttons are inert everywhere else.
  const [passStatus, setPassStatus] = useState<CreditStatus | null>(null);
  const [passesBusy, setPassesBusy] = useState(false);
  const [passesOverride, setPassesOverrideState] = useState(false);
  useEffect(() => {
    getPassesOverride().then(setPassesOverrideState).catch(() => {});
  }, []);
  // Read the true ledger whenever the console opens (ungated — the balance is
  // real even while PASSES_ENABLED keeps it hidden from the rest of the app).
  // The device ID rides along: it's what DEV_GRANT_ANONYMOUS_IDS allowlists,
  // so the console shouldn't send you hunting for the 7-tap modal to find it.
  useEffect(() => {
    if (!logsVisible) return;
    qaFetchCreditStatus().then(setPassStatus).catch(() => {});
    getAnonymousId().then(setSupportId).catch(() => {});
  }, [logsVisible]);

  const grantPasses = async (n: number) => {
    if (passesBusy) return;
    setPassesBusy(true);
    try {
      const res = await qaGrantPasses(n);
      if (!res.ok) {
        fromConsole(() => Alert.alert('Grant failed', res.message ?? 'The server refused the grant.'));
        return;
      }
      // A successful grant flips the device override on (qaGrantPasses did the
      // storage write) — mirror it so the switch reads true without a reopen.
      setPassesOverrideState(true);
      setPassStatus(await qaFetchCreditStatus());
    } finally {
      setPassesBusy(false);
    }
  };

  const togglePassesOverride = async (next: boolean) => {
    setPassesOverrideState(next);
    await setPassesOverride(next);
    setPassStatus(await qaFetchCreditStatus().catch(() => null));
  };

  // Feedback modal state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Support ID modal state (hidden, revealed by tapping the version 7 times)
  const [supportIdModalVisible, setSupportIdModalVisible] = useState(false);
  const [supportId, setSupportId] = useState<string | null>(null);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const versionTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load developer mode on mount
  useEffect(() => {
    const loadDeveloperMode = async () => {
      try {
        const value = await AsyncStorage.getItem(DEVELOPER_MODE_KEY);
        setIsDeveloperMode(value === 'true');
        setAnalyticsDeveloperMode(value === 'true');
      } catch (error) {
        console.error('[Settings] Failed to load developer mode:', error);
      }
    };
    loadDeveloperMode();
  }, []);

  const toggleDeveloperMode = async () => {
    const newValue = !isDeveloperMode;
    setIsDeveloperMode(newValue);
    // Update the analytics gate BEFORE logging: turning dev mode ON suppresses
    // even this toggle event; turning it OFF lets the event through.
    setAnalyticsDeveloperMode(newValue);
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, newValue.toString());
      logEvent('developer_mode_toggled', { screen: 'Settings', is_developer: newValue });
    } catch (error) {
      console.error('[Settings] Failed to save developer mode:', error);
      Alert.alert('Error', 'Failed to save developer mode setting');
    }
  };

  // Version info. The build number must come from the BINARY
  // (expo-application), not Constants.expoConfig — that's the app.json
  // snapshot carried by the last OTA, so after an update it can claim a build
  // the device doesn't actually have.
  const appVersion = Constants.expoConfig?.version ?? '—';
  const nativeBuild = Application.nativeBuildVersion ?? undefined;
  const versionLabel = `Version ${appVersion}${nativeBuild ? ` (${nativeBuild})` : ''}`;

  // Update in-app logs when viewer is open
  useEffect(() => {
    if (!logsVisible) return;
    setLogsText(Logger.toClipboardText());
    const unsub = Logger.subscribe(() => setLogsText(Logger.toClipboardText()));
    return () => unsub();
  }, [logsVisible]);

  const closeLogs = () => setLogsVisible(false);

  const openDeveloperConsole = async () => {
    if (isCheckingDeveloperAccess || logsVisible) return;
    setIsCheckingDeveloperAccess(true);
    try {
      const access = await checkDeveloperAccess();
      if (access.authorized) setLogsVisible(true);
      else if (access.pinRequired) {
        setDeveloperPinError(access.locked ? 'Too many attempts. Try again in 15 minutes.' : null);
        setDeveloperPinVisible(true);
      } else {
        // Previously this fell through to nothing, so a failed check and a
        // mis-aimed long press looked identical. Only ever seen by someone who
        // found a hidden gesture, so naming the cause costs nothing.
        Alert.alert(
          'Developer access unavailable',
          access.unavailable === 'unreachable'
            ? "Couldn't reach the authorization server. Check the connection and try again."
            : access.unavailable === 'no_device_secret'
              ? 'This device has no stored key, so it cannot prove its identity.'
              : 'This device is not authorized.',
        );
      }
    } finally {
      setIsCheckingDeveloperAccess(false);
    }
  };

  const submitDeveloperPin = async () => {
    const pin = developerPin.trim();
    if (!pin || isCheckingDeveloperAccess) return;
    setIsCheckingDeveloperAccess(true);
    setDeveloperPinError(null);
    try {
      const access = await checkDeveloperAccess(pin);
      if (access.authorized) {
        setDeveloperPin('');
        setDeveloperPinVisible(false);
        setLogsVisible(true);
      } else {
        setDeveloperPinError(access.locked
          ? 'Too many attempts. Try again in 15 minutes.'
          : 'That PIN wasn’t accepted.');
      }
    } finally {
      setIsCheckingDeveloperAccess(false);
    }
  };

  const copyLogs = async () => {
    try {
      await Clipboard.setStringAsync(Logger.toClipboardText());
      Alert.alert('Copied', 'Logs copied to clipboard');
    } catch {}
  };

  const clearLogs = () => {
    Logger.clear();
    setLogsText('');
  };

  const checkForOta = async () => {
    try {
      const Updates = await import('expo-updates');
      console.log('[OTA] manualCheck start');
      const result = await Updates.checkForUpdateAsync();
      console.log('[OTA] manualCheck result', result);
      if (result.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        console.log('[OTA] manualFetch result', fetched);
        Alert.alert('Update downloaded', 'Close and reopen the app to apply the update.');
      } else {
        Alert.alert('Up to date', 'No update available.');
      }
    } catch (e: any) {
      console.log('[OTA] manual error', e?.message || String(e));
      Alert.alert('Update error', e?.message || 'Unknown error');
    }
  };

  const reloadApp = async () => {
    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();
    } catch {}
  };

  const resetSubscriptionState = async () => {
    Alert.alert(
      'Reset Subscription State',
      'This will clear ALL user data including anonymous ID and RevenueCat user. The app will behave as a completely new install. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('sober_dailies_premium_override');
              await SecureStore.deleteItemAsync('sober_dailies_anonymous_id');
              await AsyncStorage.removeItem('anonymous_id');
              await AsyncStorage.multiRemove(['sober_dailies_onboarding_complete', 'sober_dailies_onboarding_v3_complete']);
              try {
                await Purchases.logOut();
                console.log('[Settings] RevenueCat user logged out');
              } catch (rcError) {
                console.warn('[Settings] RevenueCat logout failed (may not be configured):', rcError);
              }
              Alert.alert('Reset Complete', 'All user data has been cleared. You MUST restart the app now for changes to take effect.', [{ text: 'OK' }]);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset subscription state.');
              console.error('[Settings] Reset subscription state error:', error);
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPress = () => Linking.openURL('https://soberdailies.com/privacy');
  const handleTermsPress = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  const handleSupportPress = () => Linking.openURL('https://soberdailies.com/support');

  const handleRateAppPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        const appStoreId = '6749869819';
        await Linking.openURL(`itms-apps://itunes.apple.com/app/id${appStoreId}?action=write-review`);
      } else {
        await Linking.openURL(`market://details?id=com.nealwagner.soberdailies`);
      }
    } catch (error) {
      console.error('Error opening store for rating:', error);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Please enter your feedback', 'Let us know what you think!');
      return;
    }
    if (!contactInfo.trim()) {
      Alert.alert('Email required', 'Please add your email so we can follow up on your feedback.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactInfo.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    const result = await submitFeedback({
      feedbackText: feedbackText.trim(),
      contactInfo: contactInfo.trim(),
    });
    setIsSubmitting(false);
    if (result.success) {
      Alert.alert('Thank you!', 'Your feedback has been submitted. We appreciate you taking the time to help improve Sober Dailies.', [
        { text: 'OK', onPress: () => { setFeedbackVisible(false); setFeedbackText(''); setContactInfo(''); } },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleFeedbackClose = () => {
    if (feedbackText.trim()) {
      Alert.alert('Discard feedback?', 'Your feedback will not be saved.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { setFeedbackVisible(false); setFeedbackText(''); setContactInfo(''); } },
      ]);
    } else {
      setFeedbackVisible(false);
      setFeedbackText('');
      setContactInfo('');
    }
  };

  // Tap the version 7× to reveal the Support ID (for support requests).
  const handleVersionTap = () => {
    if (versionTapTimeoutRef.current) clearTimeout(versionTapTimeoutRef.current);
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);
    if (newCount >= 7) {
      setVersionTapCount(0);
      showSupportIdModal();
    } else {
      versionTapTimeoutRef.current = setTimeout(() => setVersionTapCount(0), 3000);
    }
  };

  useEffect(() => () => { if (versionTapTimeoutRef.current) clearTimeout(versionTapTimeoutRef.current); }, []);

  const showSupportIdModal = async () => {
    const id = await getAnonymousId();
    setSupportId(id);
    setSupportIdModalVisible(true);
  };

  const copySupportId = async () => {
    if (supportId) {
      await Clipboard.setStringAsync(supportId);
      Alert.alert('Copied', 'The ID is on your clipboard.');
    }
  };

  // ── Testing tools (dev) — mirror Backup & Restore's Start Fresh flows ──
  // Re-run onboarding while keeping all current data (incl. the cloud backup):
  // the root layout swaps to onboarding the moment the flag flips.
  const onboardKeep = () => {
    Alert.alert('Run onboarding again?', 'The welcome flow will run again. Your current data is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Run onboarding', onPress: () => { resetOnboarding(); } },
    ]);
  };

  // Replay the v2-upgrader ("What's new") variant of onboarding.
  const onboardAsUpgrader = () => {
    Alert.alert('Run onboarding as v2 upgrader?', "The What's-new welcome flow will run, as a v2 user sees it after the store update. Your current data is kept.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Run onboarding', onPress: () => { resetOnboardingAsUpgrader(); } },
    ]);
  };

  // Wipe everything on this device and onboard fresh (clean-install test). Pauses
  // cloud sync first so the empty state can't overwrite or auto-restore the backup.
  const clearAll = () => {
    Alert.alert(
      'Clear all data?',
      'Wipes ALL your data on this device and runs onboarding again. Your cloud backup is kept and sync is paused, so nothing comes back until you restore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await setSyncPaused(true);
              await clearUserData();
              try { const U = await import('expo-updates'); await U.reloadAsync(); } catch {}
              await resetOnboarding(); // dev fallback if no updates module
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to clear data');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — pushed leaf screen now, so it leads with a back button
          (matches Literature). */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Preferences and support</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Appearance — Light / Dark / System */}
        <SettingSection label="Appearance">
          <View style={styles.segmentRow}>
            {APPEARANCE_OPTIONS.map((opt) => {
              const active = colorScheme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setColorScheme(opt.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={active ? { selected: true } : {}}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingSection>

        {/* Text size follows the device's system text-size (Dynamic Type) —
            no in-app control. */}

        {/* Your Data — iCloud on iOS, Google Drive on Android. Hidden only on a
            binary without the cloud modules (e.g. an OTA onto an older build);
            the screen itself has a matching empty state for deep links. */}
        {cloudBackupSupported() && (
          <CardGroup label="Your Data">
            <CardRow label="Backup & Restore" last onPress={() => router.push('/(main)/backup' as Href)} />
          </CardGroup>
        )}

        {/* Pass It On — gift codes (Pass It On Handoff 2). The give row is the
            permanent giver entry; the wallet row appears once codes exist.
            Redeeming a code now lives on the paywall ("Have a code?"), so it's
            no longer surfaced here. */}
        <CardGroup label="Pass It On">
          <CardRow
            label="Pass It On"
            sub="Give 3 months of Sober Dailies"
            icon={
              <View style={styles.giftIconSquare}>
                <GiftGlyph size={19} color={colors.roseDark} />
              </View>
            }
            onPress={() => router.push('/(main)/pass-it-on' as Href)}
          />
          <CardRow
            label="Share the App"
            sub="Send friends a link to the app"
            last
            icon={
              <View style={styles.giftIconSquare}>
                <UserPlus size={19} color={colors.roseDark} strokeWidth={1.9} />
              </View>
            }
            onPress={shareApp}
          />
        </CardGroup>

        {/* Subscription — store subscribers only (RC Customer Center) */}
        {managementURL != null && (
          <CardGroup label="Subscription">
            <CardRow
              label="Manage Subscription"
              sub="Change plan or cancel"
              last
              onPress={openManageSubscription}
            />
          </CardGroup>
        )}

        {/* Support Sober Dailies */}
        <CardGroup label="Support Sober Dailies">
          <CardRow label="Rate & Review" onPress={handleRateAppPress} />
          <CardRow label="Send Feedback" last onPress={() => setFeedbackVisible(true)} />
        </CardGroup>

        {/* About */}
        <CardGroup label="About">
          <CardRow label="About Sober Dailies" last onPress={() => router.push('/about')} />
        </CardGroup>

        {/* Developer/QA actions live in the Developer Console (long-press the
            version number below), not on the Settings page. */}

        {/* Legal links — external */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={handlePrivacyPress}><Text style={styles.legalLink}>Privacy</Text></TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={handleTermsPress}><Text style={styles.legalLink}>Terms</Text></TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={handleSupportPress}><Text style={styles.legalLink}>Support</Text></TouchableOpacity>
        </View>

        {/* Version + copyright (7-tap → Support ID · long-press → Developer Console) */}
        <View style={styles.versionWrap}>
          <TouchableOpacity onPress={handleVersionTap} onLongPress={openDeveloperConsole} activeOpacity={0.6} delayLongPress={500}>
            <Text style={styles.versionText}>{versionLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.copyright}>© 2026 Daily Growth LLC</Text>
        </View>
      </ScrollView>

      {/* One-time enrollment for a new installation under an authorized Support ID. */}
      <Modal visible={developerPinVisible} transparent animationType="fade" onRequestClose={() => setDeveloperPinVisible(false)}>
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Developer PIN</Text>
            <Text style={styles.pinBody}>Enter your private PIN once to authorize this installation.</Text>
            <TextInput
              value={developerPin}
              onChangeText={setDeveloperPin}
              onSubmitEditing={submitDeveloperPin}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              placeholder="PIN"
              placeholderTextColor={c.textMuted}
              style={styles.pinInput}
              editable={!isCheckingDeveloperAccess}
              autoFocus
            />
            {!!developerPinError && <Text style={styles.pinError}>{developerPinError}</Text>}
            <TouchableOpacity
              style={[styles.pinSubmit, (!developerPin.trim() || isCheckingDeveloperAccess) && { opacity: 0.5 }]}
              onPress={submitDeveloperPin}
              disabled={!developerPin.trim() || isCheckingDeveloperAccess}
              activeOpacity={0.8}
            >
              {isCheckingDeveloperAccess ? <ActivityIndicator color="#fff" /> : <Text style={styles.pinSubmitText}>Authorize Device</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDeveloperPinVisible(false); setDeveloperPin(''); setDeveloperPinError(null); }} style={styles.pinCancel}>
              <Text style={styles.pinCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Developer Console Modal (hidden QA screen — long-press the version number).
          App-styled per the Jul 18 mock: info cards, THIS DEVICE / PAYWALL &
          SUBSCRIPTION / ONBOARDING & DATA sections, then the log feed. All
          developer actions live here — none on the Settings page itself. */}
      <Modal visible={logsVisible} animationType="slide" onRequestClose={closeLogs}>
        <RNSafeAreaView style={styles.dcContainer}>
          <View style={styles.dcTopBar}>
            <Text style={styles.dcTitle}>Developer Console</Text>
            <TouchableOpacity onPress={closeLogs} hitSlop={10} style={styles.dcClose}>
              <X size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.dcScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.dcInfoRow}>
              <View style={styles.dcInfoCard}>
                <Text style={styles.dcInfoLabel}>VERSION</Text>
                <Text style={styles.dcInfoValue}>{versionLabel.replace('Version ', '')}</Text>
              </View>
              <View style={styles.dcInfoCard}>
                <Text style={styles.dcInfoLabel}>PLATFORM</Text>
                <Text style={styles.dcInfoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}</Text>
              </View>
            </View>

            <Text style={styles.dcSectionLabel}>THIS DEVICE</Text>
            <View style={styles.dcCard}>
              <TouchableOpacity style={styles.dcRow} onPress={copySupportId} activeOpacity={0.6}>
                <View style={styles.dcIcon}><Fingerprint size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Device ID</Text>
                  <Text style={styles.dcRowSub} numberOfLines={1}>
                    {supportId ?? 'Reading…'}
                  </Text>
                </View>
                <View style={styles.dcBadge}>
                  <Text style={styles.dcBadgeText}>COPY</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dcDivider} />
              <View style={styles.dcRow}>
                <View style={styles.dcIcon}><CircleDot size={18} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Developer Mode</Text>
                  <Text style={styles.dcRowSub}>Stops all analytics from this device</Text>
                </View>
                <Switch
                  value={isDeveloperMode}
                  onValueChange={toggleDeveloperMode}
                  trackColor={{ false: c.divider, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.dcDivider} />
              <TouchableOpacity style={styles.dcRow} onPress={toggleQaEngine} activeOpacity={0.6}>
                <View style={styles.dcIcon}><MessageSquare size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>LLM: {qaEngine === 'auto' ? 'Auto · Sam Terra / others Luna' : qaEngine === 'luna' ? 'GPT-5.6 Luna' : qaEngine === 'terra' ? 'GPT-5.6 Terra' : 'Sonnet'}</Text>
                  <Text style={styles.dcRowSub}>Tap to cycle · explicit choices override Auto on the next message</Text>
                </View>
                <ChevronRight size={17} color={c.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity style={styles.dcBtn} onPress={checkForOta} activeOpacity={0.7}>
                <RefreshCw size={15} color={colors.primaryDark} strokeWidth={2.2} />
                <Text style={styles.dcBtnText}>Check for update</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dcBtn} onPress={reloadApp} activeOpacity={0.7}>
                <Power size={15} color={colors.primaryDark} strokeWidth={2.2} />
                <Text style={styles.dcBtnText}>Restart app</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dcSectionLabel}>PAYWALL & SUBSCRIPTION</Text>
            <View style={styles.dcCard}>
              <TouchableOpacity style={styles.dcRow} onPress={toggleForceNewUser} activeOpacity={0.6}>
                <View style={styles.dcIcon}><Flag size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Force new-user paywall</Text>
                  <Text style={styles.dcRowSub}>Next launch shows the hard gate</Text>
                </View>
                <View style={[styles.dcBadge, forceNewUser && styles.dcBadgeOn]}>
                  <Text style={[styles.dcBadgeText, forceNewUser && styles.dcBadgeTextOn]}>{forceNewUser ? 'ON' : 'OFF'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.dcDivider} />
              <TouchableOpacity
                style={styles.dcRow}
                activeOpacity={0.6}
                onPress={() => {
                  // QA: present RC Customer Center unconditionally — the
                  // Settings row is gated on managementURL (store subscribers
                  // only), which hides it on a grandfathered device. This
                  // also verifies the RC dashboard config end-to-end.
                  setLogsVisible(false);
                  setTimeout(async () => {
                    try {
                      const RevenueCatUI = require('react-native-purchases-ui').default;
                      await RevenueCatUI.presentCustomerCenter();
                    } catch (e: any) {
                      Alert.alert('Customer Center failed', e?.message ?? String(e));
                    }
                  }, 350);
                }}
              >
                <View style={styles.dcIcon}><CircleDot size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Present Customer Center</Text>
                  <Text style={styles.dcRowSub}>Ungated — Settings row needs a store sub</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} />
              </TouchableOpacity>
              <View style={styles.dcDivider} />
              <TouchableOpacity style={styles.dcRow} onPress={resetSubscriptionState} activeOpacity={0.6}>
                <View style={[styles.dcIcon, styles.dcIconDanger]}><RotateCcw size={17} color={DANGER} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={[styles.dcRowLabel, { color: DANGER }]}>Reset subscription state</Text>
                  <Text style={styles.dcRowSub}>Clears RevenueCat cache on this device</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openPaywallPreview('trial')} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Preview · Trial</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openPaywallPreview('notrial')} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Preview · No trial</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openThankYouPreview('annual')} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Thank-you · Annual</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openThankYouPreview('monthly')} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Thank-you · Monthly</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openArrivalPreview(5)} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Arrival · 5 passes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dcBtn} onPress={() => openArrivalPreview(1)} activeOpacity={0.7}>
                <Text style={styles.dcBtnText}>Arrival · 1 pass</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity
                style={styles.dcBtn}
                activeOpacity={0.7}
                onPress={() => fromConsole(async () => {
                  const err = await qaPreviewTrialReminder();
                  Alert.alert(
                    err ? 'Preview unavailable' : 'Scheduled',
                    err ?? 'The day-5 reminder fires in ~8 seconds. Background the app to see the banner.'
                  );
                })}
              >
                <Text style={styles.dcBtnText}>Preview · Trial reminder</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dcSectionLabel}>GIFT PASSES</Text>
            <View style={styles.dcCard}>
              <View style={styles.dcRow}>
                <View style={styles.dcIcon}><Gift size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Balance on this device</Text>
                  <Text style={styles.dcRowSub}>
                    {passStatus
                      ? `${passStatus.totalGranted} granted · ${passStatus.sharesUsed} sent`
                      : 'Checking the ledger…'}
                  </Text>
                </View>
                <View style={[styles.dcBadge, !!passStatus && passStatus.balance > 0 && styles.dcBadgeOn]}>
                  <Text style={[styles.dcBadgeText, !!passStatus && passStatus.balance > 0 && styles.dcBadgeTextOn]}>
                    {passStatus ? passStatus.balance : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.dcDivider} />
              <View style={styles.dcRow}>
                <View style={styles.dcIcon}><CircleDot size={18} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Passes on this device</Text>
                  <Text style={styles.dcRowSub}>Unsuspends Pass It On here only, not for other users</Text>
                </View>
                <Switch
                  value={passesOverride}
                  onValueChange={togglePassesOverride}
                  trackColor={{ false: c.divider, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
            <View style={styles.dcBtnRow}>
              <TouchableOpacity style={styles.dcBtn} onPress={() => grantPasses(5)} activeOpacity={0.7} disabled={passesBusy}>
                <Gift size={15} color={colors.primaryDark} strokeWidth={2.2} />
                <Text style={styles.dcBtnText}>{passesBusy ? 'Granting…' : 'Grant 5 passes'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dcFootnote}>
              Same ledger as an annual renewal — permanent, and they send through the normal
              Pass It On flow. Nothing is consumed until a recipient opens their link.
            </Text>

            <Text style={styles.dcSectionLabel}>ONBOARDING & DATA</Text>
            <View style={styles.dcCard}>
              <TouchableOpacity style={styles.dcRow} onPress={() => fromConsole(onboardKeep)} activeOpacity={0.6}>
                <View style={styles.dcIcon}><Play size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Run onboarding again</Text>
                  <Text style={styles.dcRowSub}>Replays the welcome flow · keeps all data</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} />
              </TouchableOpacity>
              <View style={styles.dcDivider} />
              <TouchableOpacity style={styles.dcRow} onPress={() => fromConsole(onboardAsUpgrader)} activeOpacity={0.6}>
                <View style={styles.dcIcon}><Play size={17} color={colors.primaryDark} strokeWidth={2} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={styles.dcRowLabel}>Run onboarding as v2 upgrader</Text>
                  <Text style={styles.dcRowSub}>Replays the What&rsquo;s-new variant · keeps all data</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} />
              </TouchableOpacity>
              <View style={styles.dcDivider} />
              <TouchableOpacity style={styles.dcRow} onPress={() => fromConsole(clearAll)} activeOpacity={0.6}>
                <View style={[styles.dcIcon, styles.dcIconDanger]}><X size={17} color={DANGER} strokeWidth={2.4} /></View>
                <View style={styles.dcRowBody}>
                  <Text style={[styles.dcRowLabel, { color: DANGER }]}>Clear all data & start over</Text>
                  <Text style={styles.dcRowSub}>Clean-install test · cloud backup kept</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dcFootnote}>Destructive rows ask to confirm before running.</Text>

            <View style={styles.dcLogsHead}>
              <Text style={[styles.dcSectionLabel, { marginTop: 0, marginBottom: 0 }]}>APPLICATION LOGS</Text>
              <View style={styles.dcLogsActions}>
                <TouchableOpacity style={styles.dcPill} onPress={copyLogs} activeOpacity={0.7}>
                  <Text style={styles.dcPillText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dcPill} onPress={clearLogs} activeOpacity={0.7}>
                  <Text style={styles.dcPillText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dcLogsCard}>
              <Text style={styles.dcLogsText}>{logsText || 'No logs yet. Logs will appear here as you use the app.'}</Text>
            </View>
          </ScrollView>
        </RNSafeAreaView>
      </Modal>

      {/* QA: paywall preview (trial / no-trial), forced regardless of real eligibility */}
      <Modal visible={!!paywallPreview} animationType="slide" onRequestClose={() => setPaywallPreview(null)}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={{ flex: 1 }}>
          <PaywallScreen preview forceTrial={paywallPreview === 'trial'} onDismiss={() => setPaywallPreview(null)} />
          <TouchableOpacity
            onPress={() => setPaywallPreview(null)}
            style={styles.previewCloseButton}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color="#fff" />
            <Text style={styles.previewCloseText}>Close preview</Text>
          </TouchableOpacity>
        </View>
        </SafeAreaProvider>
      </Modal>

      {/* QA: post-subscribe thank-you sheet preview (it's its own Modal) */}
      {thankYouPreview && (
        <GiftThankYouSheet
          plan={thankYouPreview}
          onSeeGifts={() => setThankYouPreview(null)}
          onClose={() => setThankYouPreview(null)}
        />
      )}

      {/* QA: pass-arrival sheet preview */}
      {arrivalPreview != null && (
        <GiftThankYouSheet
          plan={arrivalPreview > 1 ? 'annual' : 'monthly'}
          mode="arrival"
          count={arrivalPreview}
          onSeeGifts={() => setArrivalPreview(null)}
          onClose={() => setArrivalPreview(null)}
        />
      )}

      {/* Feedback Modal */}
      <Modal visible={feedbackVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleFeedbackClose}>
        <KeyboardModalScope>
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackHeader}>
            <Text style={styles.feedbackHeaderTitle}>Send Feedback</Text>
            <TouchableOpacity onPress={handleFeedbackClose} style={styles.feedbackCloseButton}>
              <X size={24} color={c.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.feedbackContent} contentContainerStyle={styles.feedbackScrollContent} keyboardShouldPersistTaps="handled" bottomOffset={24}>
            <Text style={styles.feedbackLabel}>What&rsquo;s on your mind?</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Share your thoughts, suggestions, or report an issue..."
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={[styles.feedbackLabel, { marginTop: 20 }]}>Email</Text>
            <TextInput
              style={styles.feedbackContactInput}
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder="Your email address"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.feedbackNote}>We read every message, and your email lets us follow up. It&rsquo;s never used for anything else.</Text>
            <TouchableOpacity
              style={[styles.feedbackSubmitButton, isSubmitting && styles.feedbackSubmitButtonDisabled]}
              onPress={handleFeedbackSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.feedbackSubmitButtonText}>Submit Feedback</Text>}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
        </KeyboardModalScope>
      </Modal>

      {/* Support ID Modal (hidden — 7 version taps) */}
      <Modal visible={supportIdModalVisible} transparent animationType="fade" onRequestClose={() => setSupportIdModalVisible(false)}>
        <View style={styles.supportIdModalOverlay}>
          <View style={styles.supportIdModalContent}>
            <Text style={styles.supportIdModalTitle}>Support ID</Text>
            <TouchableOpacity onPress={copySupportId} activeOpacity={0.7}>
              <Text style={styles.supportIdModalValue}>{supportId || 'Not available'}</Text>
            </TouchableOpacity>
            <Text style={styles.supportIdModalHint}>Tap to copy • Provide this ID to support</Text>
            <TouchableOpacity style={styles.supportIdModalDoneButton} onPress={() => setSupportIdModalVisible(false)} activeOpacity={0.8}>
              <Text style={styles.supportIdModalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Cheap dark card chrome (lit top hairline) for the small settings cards.
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  headerSafe: { backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 2 },

  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 150 },

  // Section label + card chrome
  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: c.textMuted,
    marginLeft: 6,
    marginBottom: 9,
  },
  // ThemedCard owns the card chrome; this just clips row press-highlights.
  cardInner: { overflow: 'hidden' },
  // Appearance segmented control (Light / Dark / System)
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    ...darkCard,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(isDark ? { borderTopColor: colors.primary } : null),
  },
  segmentText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
  segmentTextActive: { color: '#fff' },

  devControl: { paddingHorizontal: 16, paddingVertical: 14 },
  devControlHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  devSegment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  devSegmentBtn: {
    flexGrow: 1,
    flexBasis: '47%',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  devSegmentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  devSegmentText: { fontFamily: fontFamily.bold, fontSize: 14, color: c.textSecondary },
  devSegmentTextActive: { color: '#fff' },
  devValue: { fontFamily: fontFamily.bold, fontSize: 16, color: c.text, marginTop: 1 },
  devStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  devStepBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  devStepBtnDisabled: { backgroundColor: c.border },
  devStepBtnText: { fontFamily: fontFamily.bold, fontSize: 20, color: '#fff', lineHeight: 22 },
  devResetBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  devResetBtnText: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowText: { flex: 1, minWidth: 0 },
  // Pass It On rows — 34px rose-soft leading square (handoff Settings group)
  giftIconSquare: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.roseSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontFamily: fontFamily.medium, fontSize: 15, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
  rowValue: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted },


  // Legal + version
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 },
  legalLink: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textMuted },
  legalSep: { fontSize: 13, color: c.textMuted },
  versionWrap: { alignItems: 'center', marginTop: 14, gap: 3 },
  versionText: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
  copyright: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted },

  pinOverlay: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  pinCard: { width: '100%', maxWidth: 390, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 22, ...shadows.lg },
  pinTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, color: c.text, textAlign: 'center' },
  pinBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 7 },
  pinInput: { marginTop: 18, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.background, color: c.text, fontFamily: fontFamily.semiBold, fontSize: 18, letterSpacing: 2, paddingHorizontal: 14, paddingVertical: 13, textAlign: 'center' },
  pinError: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: DANGER, textAlign: 'center', marginTop: 9 },
  pinSubmit: { marginTop: 16, minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pinSubmitText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: '#fff' },
  pinCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  pinCancelText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textMuted },

  // ── Developer Console (app-styled QA modal, Jul 18 mock) ──
  dcContainer: { flex: 1, backgroundColor: c.background },
  dcTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  dcTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.3, color: c.text },
  dcClose: { padding: 4 },
  dcScroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

  dcInfoRow: { flexDirection: 'row', gap: 10 },
  dcInfoCard: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, ...shadows.sm },
  dcInfoLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.2, color: c.textMuted, marginBottom: 5 },
  dcInfoValue: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 15, color: c.text },

  dcSectionLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.2, color: c.textMuted, marginTop: 22, marginBottom: 8, marginHorizontal: 4 },
  dcCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, overflow: 'hidden', ...shadows.sm },
  dcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 13 },
  dcRowBody: { flex: 1, minWidth: 0 },
  dcRowLabel: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text, letterSpacing: -0.2 },
  dcRowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
  dcDivider: { height: 1, backgroundColor: c.divider, marginLeft: 61 },
  dcIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dcIconDanger: { backgroundColor: isDark ? 'rgba(216,88,78,0.18)' : '#F9E4E2' },

  dcBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: c.divider },
  dcBadgeOn: { backgroundColor: colors.primary },
  dcBadgeText: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.5, color: c.textMuted },
  dcBadgeTextOn: { color: '#fff' },

  dcBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dcBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm },
  dcBtnText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: colors.primaryDark },

  dcFootnote: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 12 },

  dcLogsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8, marginHorizontal: 4 },
  dcLogsActions: { flexDirection: 'row', gap: 8 },
  dcPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  dcPillText: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: colors.primaryDark },
  dcLogsCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, ...shadows.sm },
  dcLogsText: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 11, lineHeight: 17, color: c.textSecondary },

  previewCloseButton: { position: 'absolute', top: 54, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.78)', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', zIndex: 9999, elevation: 24 },
  previewCloseText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Feedback modal ──
  feedbackContainer: { flex: 1, backgroundColor: c.background },
  feedbackHeader: {
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  feedbackHeaderTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.3, color: c.text },
  feedbackCloseButton: { padding: 4 },
  feedbackContent: { flex: 1 },
  feedbackScrollContent: { padding: 18, paddingBottom: 40 },
  feedbackLabel: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.text, marginBottom: 8 },
  feedbackInput: { backgroundColor: c.surface, borderRadius: 12, padding: 14, fontFamily: fontFamily.regular, fontSize: 15, color: c.text, minHeight: 150, borderWidth: 1, borderColor: c.border },
  feedbackContactInput: { backgroundColor: c.surface, borderRadius: 12, padding: 14, fontFamily: fontFamily.regular, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },
  feedbackNote: { fontFamily: fontFamily.regular, fontSize: 12.5, color: colors.primary, marginTop: 16, marginBottom: 24, textAlign: 'center' },
  feedbackSubmitButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  feedbackSubmitButtonDisabled: { opacity: 0.7 },
  feedbackSubmitButtonText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: '#fff' },

  // ── Support ID modal ──
  supportIdModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  supportIdModalContent: { backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320 },
  supportIdModalTitle: { fontFamily: fontFamily.semiBold, fontSize: 18, color: c.text, marginBottom: 16 },
  supportIdModalValue: { fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), color: colors.primary, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 8, overflow: 'hidden' },
  supportIdModalHint: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 8, marginBottom: 20 },
  supportIdModalDoneButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  supportIdModalDoneText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: '#fff' },
  });
};
