// Settings — rebuilt from the prototype (frames/hifi-profile-v2.jsx · ProfileHiFiB).
// Tab-style header (large "Settings" title + serif subtitle, matching Today /
// Journey / Tools — no TopLevelHeader, no Home/hamburger, no eyebrow). Content is
// token-based CardGroup / CardRow / SettingSection blocks: Text Size (live preview
// + steppers), Your Data, Support Sober Dailies, About, and a dev-only group.
// Legal links + version live at the foot of the scroll (the floating tab bar +
// FAB sit above). Hidden QA: tap the version 7× for the Support ID; long-press for
// the Debug Console. Reminders (notifications) + Light/Dark/System theme from the
// prototype are deferred — see the team note in the PR.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Share, ScrollView,
  Modal, SafeAreaView as RNSafeAreaView, Alert, TextInput, ActivityIndicator,
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, X, Code2, RefreshCw } from 'lucide-react-native';
import {
  colors,
  getSemanticColors,
  spacing,
  radii,
  fontFamily,
  shadows,
} from '@/constants/designTokens';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { useTextSettings } from '@/hooks/use-text-settings';
import { Logger } from '@/lib/logger';
import { submitFeedback } from '@/lib/feedback';
import { usageLogger } from '@/lib/usageLogger';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { clearUserData } from '@/lib/userDataSync';
import { setSyncPaused } from '@/lib/icloudSync';
import {
  DEFAULT_SPONSOR_API_PROVIDER,
  DEFAULT_SPONSOR_API_TEMPERATURE,
  MAX_SPONSOR_API_TEMPERATURE,
  MIN_SPONSOR_API_TEMPERATURE,
  getSponsorApiProvider,
  getSponsorApiTemperature,
  setSponsorApiProvider,
  setSponsorApiTemperature,
  type SponsorApiProvider,
} from '@/lib/sponsorApiSettings';

const c = getSemanticColors('light');
const DEVELOPER_MODE_KEY = 'developer_mode_enabled';

// ─── Token-based building blocks (mirror the prototype) ──────────────────────

// A labelled card containing one or more rows (surface fill, hairline border).
function CardGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

// A tappable row inside a CardGroup: label (+ optional sub / value) + chevron.
function CardRow({
  label, value, sub, last, onPress,
}: { label: string; value?: string; sub?: string; last?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <ChevronRight size={18} color={c.textMuted} />
    </TouchableOpacity>
  );
}

// A labelled section that holds an inline control (no card chrome).
function SettingSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { fontSize, setFontSize, minFontSize, maxFontSize, resetDefaults, defaultFontSize } = useTextSettings();
  const { resetOnboarding } = useOnboarding();

  useScreenTimeTracking('Settings');

  const [logsVisible, setLogsVisible] = useState(false);
  const [logsText, setLogsText] = useState('');
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [sponsorApiTemperature, setSponsorApiTemperatureState] = useState(DEFAULT_SPONSOR_API_TEMPERATURE);
  const [sponsorApiProvider, setSponsorApiProviderState] = useState<SponsorApiProvider>(DEFAULT_SPONSOR_API_PROVIDER);

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
      } catch (error) {
        console.error('[Settings] Failed to load developer mode:', error);
      }
    };
    loadDeveloperMode();
  }, []);

  useEffect(() => {
    getSponsorApiTemperature()
      .then(setSponsorApiTemperatureState)
      .catch(() => {
        setSponsorApiTemperatureState(DEFAULT_SPONSOR_API_TEMPERATURE);
      });
  }, []);

  useEffect(() => {
    getSponsorApiProvider()
      .then(setSponsorApiProviderState)
      .catch(() => {
        setSponsorApiProviderState(DEFAULT_SPONSOR_API_PROVIDER);
      });
  }, []);

  const toggleDeveloperMode = async () => {
    const newValue = !isDeveloperMode;
    setIsDeveloperMode(newValue);
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, newValue.toString());
      usageLogger.logEvent('developer_mode_toggled', { screen: 'Settings', is_developer: newValue });
    } catch (error) {
      console.error('[Settings] Failed to save developer mode:', error);
      Alert.alert('Error', 'Failed to save developer mode setting');
    }
  };

  const step = 2;
  const increase = () => setFontSize(fontSize + step);
  const decrease = () => setFontSize(fontSize - step);

  const adjustSponsorApiTemperature = async (delta: number) => {
    try {
      const next = await setSponsorApiTemperature(Number((sponsorApiTemperature + delta).toFixed(2)));
      setSponsorApiTemperatureState(next);
    } catch (error) {
      console.error('[Settings] Failed to save sponsor API temperature:', error);
      Alert.alert('Error', 'Failed to save sponsor API temperature.');
    }
  };

  const resetSponsorApiTemperature = async () => {
    try {
      const next = await setSponsorApiTemperature(DEFAULT_SPONSOR_API_TEMPERATURE);
      setSponsorApiTemperatureState(next);
    } catch (error) {
      console.error('[Settings] Failed to reset sponsor API temperature:', error);
    }
  };

  const changeSponsorApiProvider = async (provider: SponsorApiProvider) => {
    if (provider === sponsorApiProvider) return;
    setSponsorApiProviderState(provider);
    try {
      await setSponsorApiProvider(provider);
    } catch (error) {
      console.error('[Settings] Failed to save sponsor API provider:', error);
      Alert.alert('Error', 'Failed to save AI engine setting.');
    }
  };

  // Version info
  const appVersion = Constants.expoConfig?.version ?? '—';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber ?? undefined;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode ?? undefined;
  const versionLabel = `Version ${appVersion}${Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}${Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}`;

  // Update in-app logs when viewer is open
  useEffect(() => {
    if (!logsVisible) return;
    setLogsText(Logger.toClipboardText());
    const unsub = Logger.subscribe(() => setLogsText(Logger.toClipboardText()));
    return () => unsub();
  }, [logsVisible]);

  const toggleLogs = () => setLogsVisible((v) => !v);

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
              await AsyncStorage.removeItem('sober_dailies_onboarding_complete');
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

  const handleSharePress = async () => {
    try {
      const appStoreUrl =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/sober-dailies/id6749869819'
          : 'https://play.google.com/store/apps/details?id=com.nealwagner.soberdailies';
      await Share.share({ message: 'Sober Dailies helps me stay sober one day at a time. Check it out: ' + appStoreUrl });
    } catch {}
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Please enter your feedback', 'Let us know what you think!');
      return;
    }
    if (contactInfo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactInfo.trim())) {
        Alert.alert('Invalid email', 'Please enter a valid email address or leave it blank.');
        return;
      }
    }
    setIsSubmitting(true);
    const result = await submitFeedback({
      feedbackText: feedbackText.trim(),
      contactInfo: contactInfo.trim() || undefined,
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
    const id = await usageLogger.getAnonymousId();
    setSupportId(id);
    setSupportIdModalVisible(true);
  };

  const copySupportId = async () => {
    if (supportId) {
      await Clipboard.setStringAsync(supportId);
      Alert.alert('Copied', 'Support ID copied to clipboard');
    }
  };

  // ── Testing tools (dev) — mirror Backup & Restore's Start Fresh flows ──
  // Re-run onboarding while keeping all current data (incl. the iCloud backup):
  // the root layout swaps to onboarding the moment the flag flips.
  const onboardKeep = () => {
    Alert.alert('Run onboarding again?', 'The welcome flow will run again. Your current data is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Run onboarding', onPress: () => { resetOnboarding(); } },
    ]);
  };

  // Wipe everything on this device and onboard fresh (clean-install test). Pauses
  // iCloud sync first so the empty state can't overwrite or auto-restore the backup.
  const clearAll = () => {
    Alert.alert(
      'Clear all data?',
      'Wipes ALL your data on this device and runs onboarding again. Your iCloud backup is kept and sync is paused, so nothing comes back until you restore.',
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

      {/* Header — matches Today / Journey / Tools */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Preferences and support</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Text Size — live preview + steppers */}
        <SettingSection label="Text Size">
          <View style={styles.previewCard}>
            <Text style={[styles.previewText, { fontSize, lineHeight: fontSize * 1.5 }]}>
              &ldquo;Daily progress one day at a time.&rdquo;
            </Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepBtn, fontSize <= minFontSize && styles.stepBtnDisabled]}
              onPress={decrease}
              disabled={fontSize <= minFontSize}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, fontSize <= minFontSize && styles.stepBtnTextDisabled]}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepBtn, fontSize >= maxFontSize && styles.stepBtnDisabled]}
              onPress={increase}
              disabled={fontSize >= maxFontSize}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, fontSize >= maxFontSize && styles.stepBtnTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
          {fontSize !== defaultFontSize && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetDefaults} activeOpacity={0.7}>
              <Text style={styles.resetBtnText}>Reset to default</Text>
            </TouchableOpacity>
          )}
        </SettingSection>

        {/* Your Data */}
        <CardGroup label="Your Data">
          <CardRow label="Backup & Restore" last onPress={() => router.push('/(main)/backup' as Href)} />
        </CardGroup>

        {/* Support Sober Dailies */}
        <CardGroup label="Support Sober Dailies">
          <CardRow label="Rate & Review" onPress={handleRateAppPress} />
          <CardRow label="Share the App" onPress={handleSharePress} />
          <CardRow label="Send Feedback" last onPress={() => setFeedbackVisible(true)} />
        </CardGroup>

        {/* About */}
        <CardGroup label="About">
          <CardRow label="About Sober Dailies" last onPress={() => router.push('/about')} />
        </CardGroup>

        {/* Developer / testing — visible in this sponsor API test branch */}
        {
          <CardGroup label="Developer">
            <View style={[styles.devControl, styles.rowDivider]}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Sponsor AI engine</Text>
                <Text style={styles.rowSub}>Engine behind Steady Eddie 2, Salty Sam 2, and Gentle Grace 2</Text>
              </View>
              <View style={styles.devSegment}>
                {(['openai', 'anthropic'] as SponsorApiProvider[]).map((option) => {
                  const active = sponsorApiProvider === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.devSegmentBtn, active && styles.devSegmentBtnActive]}
                      onPress={() => changeSponsorApiProvider(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.devSegmentText, active && styles.devSegmentTextActive]}>
                        {option === 'openai' ? 'OpenAI' : 'Anthropic'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.devControl, styles.rowDivider]}>
              <View style={styles.devControlHeader}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Sponsor API temperature</Text>
                  <Text style={styles.rowSub}>Used by Steady Eddie 2, Salty Sam 2, and Gentle Grace 2</Text>
                </View>
                <Text style={styles.devValue}>{sponsorApiTemperature.toFixed(2)}</Text>
              </View>
              <View style={styles.devStepperRow}>
                <TouchableOpacity
                  style={[styles.devStepBtn, sponsorApiTemperature <= MIN_SPONSOR_API_TEMPERATURE && styles.devStepBtnDisabled]}
                  onPress={() => adjustSponsorApiTemperature(-0.1)}
                  disabled={sponsorApiTemperature <= MIN_SPONSOR_API_TEMPERATURE}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devStepBtnText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devResetBtn} onPress={resetSponsorApiTemperature} activeOpacity={0.7}>
                  <Text style={styles.devResetBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devStepBtn, sponsorApiTemperature >= MAX_SPONSOR_API_TEMPERATURE && styles.devStepBtnDisabled]}
                  onPress={() => adjustSponsorApiTemperature(0.1)}
                  disabled={sponsorApiTemperature >= MAX_SPONSOR_API_TEMPERATURE}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <CardRow
              label="Run onboarding again"
              sub="Replays the welcome flow · keeps all data"
              onPress={onboardKeep}
            />
            <CardRow
              label="Clear all data & start over"
              sub="Clean-install test · iCloud backup kept"
              last
              onPress={clearAll}
            />
          </CardGroup>
        }

        {/* Legal links — external */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={handlePrivacyPress}><Text style={styles.legalLink}>Privacy</Text></TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={handleTermsPress}><Text style={styles.legalLink}>Terms</Text></TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={handleSupportPress}><Text style={styles.legalLink}>Support</Text></TouchableOpacity>
        </View>

        {/* Version + copyright (7-tap → Support ID · long-press → Debug Console) */}
        <View style={styles.versionWrap}>
          <TouchableOpacity onPress={handleVersionTap} onLongPress={toggleLogs} activeOpacity={0.6} delayLongPress={500}>
            <Text style={styles.versionText}>{versionLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.copyright}>© 2026 Daily Growth LLC</Text>
        </View>
      </ScrollView>

      {/* Debug Console Modal (hidden QA screen) */}
      <Modal visible={logsVisible} animationType="slide" onRequestClose={toggleLogs}>
        <RNSafeAreaView style={styles.logsContainer}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.logsHeader}>
            <View style={styles.logsHeaderContent}>
              <View style={styles.logsHeaderLeft}>
                <Code2 size={24} color="#60a5fa" />
                <Text style={styles.logsHeaderTitle}>Debug Console</Text>
              </View>
              <TouchableOpacity onPress={toggleLogs} style={styles.logsCloseButton}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.logsInfoSection}>
            <View style={styles.logsInfoCard}>
              <Text style={styles.logsInfoLabel}>Version</Text>
              <Text style={styles.logsInfoValue}>{versionLabel.replace('Version ', '')}</Text>
            </View>
            <View style={styles.logsInfoCard}>
              <Text style={styles.logsInfoLabel}>Platform</Text>
              <Text style={styles.logsInfoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}</Text>
            </View>
          </View>

          <View style={styles.logsDeveloperSection}>
            <View style={styles.logsDeveloperToggle}>
              <View>
                <Text style={styles.logsDeveloperLabel}>Developer Mode</Text>
                <Text style={styles.logsDeveloperSubtext}>Tag your activity as developer in analytics</Text>
              </View>
              <Switch
                value={isDeveloperMode}
                onValueChange={toggleDeveloperMode}
                trackColor={{ false: '#334155', true: '#60a5fa' }}
                thumbColor={isDeveloperMode ? '#fff' : '#94a3b8'}
              />
            </View>
          </View>

          <View style={styles.logsActionsRow}>
            <TouchableOpacity onPress={copyLogs} style={styles.logsActionButton}>
              <Text style={styles.logsActionButtonText}>Copy Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearLogs} style={styles.logsActionButton}>
              <Text style={styles.logsActionButtonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logsActionsRow}>
            <TouchableOpacity onPress={resetSubscriptionState} style={[styles.logsActionButton, { backgroundColor: '#7f1d1d' }]}>
              <Text style={styles.logsActionButtonText}>Reset Subscription State</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logsDisplayContainer}>
            <Text style={styles.logsDisplayLabel}>Application Logs</Text>
            <ScrollView style={styles.logsScrollView} contentContainerStyle={styles.logsScrollContent}>
              <Text style={styles.logsText}>{logsText || 'No logs yet. Logs will appear here as you use the app.'}</Text>
            </ScrollView>
          </View>

          <View style={styles.logsFooter}>
            <TouchableOpacity onPress={checkForOta} style={styles.logsFooterButton}>
              <RefreshCw size={18} color="#60a5fa" />
              <Text style={styles.logsFooterButtonText}>Check for Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reloadApp} style={styles.logsFooterButton}>
              <RefreshCw size={18} color="#60a5fa" />
              <Text style={styles.logsFooterButtonText}>Restart App</Text>
            </TouchableOpacity>
          </View>
        </RNSafeAreaView>
      </Modal>

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
            <Text style={[styles.feedbackLabel, { marginTop: 20 }]}>Contact info (optional)</Text>
            <TextInput
              style={styles.feedbackContactInput}
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder="Email if you'd like a response"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.feedbackNote}>Your feedback is anonymous unless you provide contact info. We read every message!</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  headerSafe: { backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5, color: c.text },
  subtitle: { fontFamily: fontFamily.serifItalic, fontSize: 15, color: c.textSecondary, marginTop: 2 },

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
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.sm,
  },
  devControl: { paddingHorizontal: 16, paddingVertical: 14 },
  devControlHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  devSegment: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  devSegmentBtn: {
    flex: 1,
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
  rowLabel: { fontFamily: fontFamily.medium, fontSize: 15, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
  rowValue: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted },

  // Text Size control
  previewCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  previewText: { fontFamily: fontFamily.serifItalic, color: c.text, textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepBtnDisabled: { backgroundColor: c.divider, shadowOpacity: 0, elevation: 0 },
  stepBtnText: { fontFamily: fontFamily.semiBold, fontSize: 24, lineHeight: 28, color: '#fff' },
  stepBtnTextDisabled: { color: c.textMuted },
  resetBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 4, paddingHorizontal: 10 },
  resetBtnText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.primary },

  // Legal + version
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 },
  legalLink: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textMuted },
  legalSep: { fontSize: 13, color: c.textMuted },
  versionWrap: { alignItems: 'center', marginTop: 14, gap: 3 },
  versionText: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
  copyright: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted },

  // ── Debug Console (dark QA modal) ──
  logsContainer: { flex: 1, backgroundColor: '#0f172a' },
  logsHeader: { paddingVertical: 16, paddingHorizontal: 16 },
  logsHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logsHeaderTitle: { fontSize: 20, fontWeight: '600', color: '#f1f5f9' },
  logsCloseButton: { padding: 4 },
  logsInfoSection: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  logsInfoCard: { flex: 1, backgroundColor: '#1e293b', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  logsInfoLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  logsInfoValue: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  logsDeveloperSection: { paddingHorizontal: 16, paddingBottom: 16 },
  logsDeveloperToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  logsDeveloperLabel: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginBottom: 4 },
  logsDeveloperSubtext: { fontSize: 12, color: '#94a3b8' },
  logsActionsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  logsActionButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  logsActionButtonText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
  logsDisplayContainer: { flex: 1, marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  logsDisplayLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  logsScrollView: { flex: 1 },
  logsScrollContent: { paddingHorizontal: 16, paddingVertical: 12 },
  logsText: { color: '#cbd5e1', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 11, lineHeight: 16 },
  logsFooter: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  logsFooterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  logsFooterButtonText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },

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
