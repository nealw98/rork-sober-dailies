import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Share, ScrollView, Modal, SafeAreaView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Switch } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, X, Code2, Terminal, RefreshCw } from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import { Logger } from '@/lib/logger';
import { submitFeedback } from '@/lib/feedback';
import { usageLogger } from '@/lib/usageLogger';

const DEVELOPER_MODE_KEY = 'developer_mode_enabled';

/**
 * Get a unique device identifier for PostHog tracking
 * - iOS: Uses identifierForVendor (unique per app vendor, resets on reinstall)
 * - Android: Uses ANDROID_ID (unique per device, persists across reinstalls)
 */
async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      return iosId;
    } else if (Platform.OS === 'android') {
      return Application.androidId;
    }
    return null;
  } catch (error) {
    console.error('[Settings] Failed to get device ID:', error);
    return null;
  }
}

export default function SettingsScreen() {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { fontSize, setFontSize, minFontSize, maxFontSize, resetDefaults, defaultFontSize } = useTextSettings();
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsText, setLogsText] = useState('');
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  
  // Feedback modal state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Support ID modal state (hidden, revealed by tapping version 7 times)
  const [supportIdModalVisible, setSupportIdModalVisible] = useState(false);
  const [supportId, setSupportId] = useState<string | null>(null);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const versionTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Settings');
    }, [posthog])
  );
  
  const toggleDeveloperMode = async () => {
    const newValue = !isDeveloperMode;
    setIsDeveloperMode(newValue);
    
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, newValue.toString());
      
      // Update PostHog person property using identify
      if (posthog) {
        // Get the device ID (same one used for identification)
        const deviceId = await getDeviceId();
        if (deviceId) {
          // Update person properties
          posthog.identify(deviceId, {
            is_developer: newValue
          });
        }
        
        // Also set as super property for event filtering
        posthog.register({
          is_developer: newValue
        });
        
        // Log the toggle event
        posthog.capture('developer_mode_toggled', {
          is_developer: newValue
        });
      }
    } catch (error) {
      console.error('[Settings] Failed to save developer mode:', error);
      Alert.alert('Error', 'Failed to save developer mode setting');
    }
  };

  const step = 2;
  const increase = () => {
    setFontSize(fontSize + step);
    posthog?.capture('settings_font_size_increase', {
      $screen_name: 'Settings'
    });
  };
  const decrease = () => {
    setFontSize(fontSize - step);
    posthog?.capture('settings_font_size_decrease', {
      $screen_name: 'Settings'
    });
  };

  const handleBack = () => {
    router.back();
  };

  // Version info
  const appVersion = Constants.expoConfig?.version ?? '—';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber ?? undefined;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode ?? undefined;

  // Update in-app logs when viewer is open
  useEffect(() => {
    if (!logsVisible) return;
    setLogsText(Logger.toClipboardText());
    const unsub = Logger.subscribe(() => {
      setLogsText(Logger.toClipboardText());
    });
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
              // Clear premium override (dev bypass)
              await SecureStore.deleteItemAsync('sober_dailies_premium_override');
              // Clear anonymous ID (SecureStore and AsyncStorage)
              await SecureStore.deleteItemAsync('sober_dailies_anonymous_id');
              await AsyncStorage.removeItem('anonymous_id');
              // Clear onboarding
              await AsyncStorage.removeItem('sober_dailies_onboarding_complete');
              
              // Logout from RevenueCat to get a new anonymous user ID
              try {
                await Purchases.logOut();
                console.log('[Settings] RevenueCat user logged out');
              } catch (rcError) {
                console.warn('[Settings] RevenueCat logout failed (may not be configured):', rcError);
              }
              
              Alert.alert(
                'Reset Complete',
                'All user data has been cleared. You MUST restart the app now for changes to take effect.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reset subscription state.');
              console.error('[Settings] Reset subscription state error:', error);
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://soberdailies.com/privacy');
  };

  const handleTermsPress = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  const handleSupportPress = () => {
    Linking.openURL('https://soberdailies.com/support');
  };
  
  const handleRateAppPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        const appStoreId = '6749869819';
        const url = `itms-apps://itunes.apple.com/app/id${appStoreId}?action=write-review`;
        await Linking.openURL(url);
      } else {
        const packageName = 'com.nealwagner.soberdailies';
        const url = `market://details?id=${packageName}`;
        await Linking.openURL(url);
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

      await Share.share({
        message: 'Sober Dailies helps me stay sober one day at a time. Check it out: ' + appStoreUrl,
      });
    } catch {
      // no-op
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Please enter your feedback', 'Let us know what you think!');
      return;
    }

    // Validate email if provided
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
      Alert.alert(
        'Thank you!',
        'Your feedback has been submitted. We appreciate you taking the time to help improve Sober Dailies.',
        [{ text: 'OK', onPress: () => {
          setFeedbackVisible(false);
          setFeedbackText('');
          setContactInfo('');
        }}]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleFeedbackClose = () => {
    if (feedbackText.trim()) {
      Alert.alert(
        'Discard feedback?',
        'Your feedback will not be saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => {
            setFeedbackVisible(false);
            setFeedbackText('');
            setContactInfo('');
          }},
        ]
      );
    } else {
      setFeedbackVisible(false);
      setFeedbackText('');
      setContactInfo('');
    }
  };

  // Handle version number taps for hidden diagnostic screen
  const handleVersionTap = () => {
    // Clear existing timeout
    if (versionTapTimeoutRef.current) {
      clearTimeout(versionTapTimeoutRef.current);
    }

    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);

    if (newCount >= 7) {
      // Reset count and show Support ID modal
      setVersionTapCount(0);
      showSupportIdModal();
    } else {
      // Reset count after 3 seconds of no taps
      versionTapTimeoutRef.current = setTimeout(() => {
        setVersionTapCount(0);
      }, 3000);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (versionTapTimeoutRef.current) {
        clearTimeout(versionTapTimeoutRef.current);
      }
    };
  }, []);

  // Show Support ID modal
  const showSupportIdModal = async () => {
    const id = await usageLogger.getAnonymousId();
    setSupportId(id);
    setSupportIdModalVisible(true);
  };

  // Copy Support ID to clipboard
  const copySupportId = async () => {
    if (supportId) {
      await Clipboard.setStringAsync(supportId);
      Alert.alert('Copied', 'Support ID copied to clipboard');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, tabBarStyle: { display: 'none' } }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>
      
      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Text Size</Text>
        
        {/* Text Size Controls - Inline */}
        <View style={styles.textSizeSection}>
          {/* Preview */}
          <View style={styles.preview}>
            <Text
              style={[
                styles.previewText,
                { fontSize, lineHeight: fontSize * 1.5, fontWeight: adjustFontWeight("500") },
              ]}
            >
              "Daily progress one day at a time."
            </Text>
          </View>
          
          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.sizeButton, fontSize <= minFontSize && styles.sizeButtonDisabled]}
              onPress={decrease}
              disabled={fontSize <= minFontSize}
              activeOpacity={0.7}
            >
              <Text style={[styles.sizeButtonText, fontSize <= minFontSize && styles.sizeButtonTextDisabled]}>−</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeButton, fontSize >= maxFontSize && styles.sizeButtonDisabled]}
              onPress={increase}
              disabled={fontSize >= maxFontSize}
              activeOpacity={0.7}
            >
              <Text style={[styles.sizeButtonText, fontSize >= maxFontSize && styles.sizeButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
          
          {/* Reset to Default */}
          {fontSize !== defaultFontSize && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetDefaults}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset to Default</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Support Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Support Sober Dailies</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleRateAppPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuItemTitle, { fontSize }]}>Rate & Review</Text>
          <ChevronRight size={18} color="#a0a0a0" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleSharePress}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuItemTitle, { fontSize }]}>Share the App</Text>
          <ChevronRight size={18} color="#a0a0a0" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setFeedbackVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuItemTitle, { fontSize }]}>Send Feedback</Text>
          <ChevronRight size={18} color="#a0a0a0" />
        </TouchableOpacity>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>About</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuItemTitle, { fontSize }]}>About Sober Dailies</Text>
          <ChevronRight size={18} color="#a0a0a0" />
        </TouchableOpacity>
      </ScrollView>

      {/* Legal Links - above footer */}
      <View style={styles.legalLinksContainer}>
        <TouchableOpacity onPress={handlePrivacyPress}>
          <Text style={styles.legalLink}>Privacy</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>·</Text>
        <TouchableOpacity onPress={handleTermsPress}>
          <Text style={styles.legalLink}>Terms</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>·</Text>
        <TouchableOpacity onPress={handleSupportPress}>
          <Text style={styles.legalLink}>Support</Text>
        </TouchableOpacity>
      </View>

      {/* Footer with version */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          onPress={handleVersionTap}
          onLongPress={toggleLogs}
          activeOpacity={0.6}
          delayLongPress={500}
        >
          <Text style={styles.versionText}>
            Version {appVersion}
            {Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}
            {Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Improved Debug Console Modal (QA screen) */}
      {/* Improved Debug Console Modal (QA screen) */}
      <Modal visible={logsVisible} animationType="slide" onRequestClose={toggleLogs}>
        <SafeAreaView style={styles.logsContainer}>
          {/* Header with gradient */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.logsHeader}
          >
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

          {/* Info Cards */}
          <View style={styles.logsInfoSection}>
            <View style={styles.logsInfoCard}>
              <Text style={styles.logsInfoLabel}>Version</Text>
              <Text style={styles.logsInfoValue}>
                {appVersion}
                {Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}
                {Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}
              </Text>
            </View>
            <View style={styles.logsInfoCard}>
              <Text style={styles.logsInfoLabel}>Platform</Text>
              <Text style={styles.logsInfoValue}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}
              </Text>
            </View>
          </View>

          {/* Developer Mode Toggle */}
          <View style={styles.logsDeveloperSection}>
            <View style={styles.logsDeveloperToggle}>
              <View>
                <Text style={styles.logsDeveloperLabel}>Developer Mode</Text>
                <Text style={styles.logsDeveloperSubtext}>
                  Tag your activity as developer in analytics
                </Text>
              </View>
              <Switch
                value={isDeveloperMode}
                onValueChange={toggleDeveloperMode}
                trackColor={{ false: '#334155', true: '#60a5fa' }}
                thumbColor={isDeveloperMode ? '#fff' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.logsActionsRow}>
            <TouchableOpacity onPress={copyLogs} style={styles.logsActionButton}>
              <Text style={styles.logsActionButtonText}>Copy Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearLogs} style={styles.logsActionButton}>
              <Text style={styles.logsActionButtonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>

          {/* Subscription Debug */}
          <View style={styles.logsActionsRow}>
            <TouchableOpacity onPress={resetSubscriptionState} style={[styles.logsActionButton, { backgroundColor: '#7f1d1d' }]}>
              <Text style={styles.logsActionButtonText}>Reset Subscription State</Text>
            </TouchableOpacity>
          </View>

          {/* Logs Display */}
          <View style={styles.logsDisplayContainer}>
            <Text style={styles.logsDisplayLabel}>Application Logs</Text>
            <ScrollView 
              style={styles.logsScrollView}
              contentContainerStyle={styles.logsScrollContent}
            >
              <Text style={styles.logsText}>
                {logsText || 'No logs yet. Logs will appear here as you use the app.'}
              </Text>
            </ScrollView>
          </View>

          {/* Footer Actions */}
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
        </SafeAreaView>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFeedbackClose}
      >
        <KeyboardAvoidingView 
          style={styles.feedbackContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Teal Header */}
          <View style={styles.feedbackHeader}>
            <Text style={styles.feedbackHeaderTitle}>Send Feedback</Text>
            <TouchableOpacity onPress={handleFeedbackClose} style={styles.feedbackCloseButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.feedbackContent}
            contentContainerStyle={styles.feedbackScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.feedbackLabel}>What's on your mind?</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Share your thoughts, suggestions, or report an issue..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={[styles.feedbackLabel, { marginTop: 20 }]}>
              Contact info (optional)
            </Text>
            <TextInput
              style={styles.feedbackContactInput}
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder="Email if you'd like a response"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.feedbackNote}>
              Your feedback is anonymous unless you provide contact info. We read every message!
            </Text>

            <TouchableOpacity
              style={[styles.feedbackSubmitButton, isSubmitting && styles.feedbackSubmitButtonDisabled]}
              onPress={handleFeedbackSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.feedbackSubmitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Support ID Modal (hidden, revealed by tapping version 7 times) */}
      <Modal
        visible={supportIdModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportIdModalVisible(false)}
      >
        <View style={styles.supportIdModalOverlay}>
          <View style={styles.supportIdModalContent}>
            <Text style={styles.supportIdModalTitle}>Support ID</Text>
            <TouchableOpacity onPress={copySupportId} activeOpacity={0.7}>
              <Text style={styles.supportIdModalValue}>{supportId || 'Not available'}</Text>
            </TouchableOpacity>
            <Text style={styles.supportIdModalHint}>Tap to copy • Provide this ID to support</Text>
            <TouchableOpacity
              style={styles.supportIdModalDoneButton}
              onPress={() => setSupportIdModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.supportIdModalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: adjustFontWeight('600'),
    color: '#6b7c8a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  textSizeSection: {
    marginBottom: 8,
    gap: 16,
  },
  preview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  previewText: {
    color: '#2d3748',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3D8B8B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  sizeButtonText: {
    fontSize: 24,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  sizeButtonTextDisabled: {
    color: '#a0a0a0',
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#3D8B8B',
    fontWeight: adjustFontWeight('500'),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 139, 139, 0.3)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    flex: 1,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f6f8',
  },
  legalLink: {
    fontSize: 14,
    color: '#3D8B8B',
    fontWeight: adjustFontWeight('500'),
  },
  legalSeparator: {
    fontSize: 14,
    color: '#a0a0a0',
    marginHorizontal: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
  },
  versionText: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  logsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  logsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logsHeaderTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#f1f5f9',
  },
  logsCloseButton: {
    padding: 4,
  },
  logsInfoSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  logsInfoCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logsInfoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  logsInfoValue: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: '#f1f5f9',
  },
  logsDeveloperSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logsDeveloperToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logsDeveloperLabel: {
    fontSize: 15,
    fontWeight: adjustFontWeight('600'),
    color: '#f1f5f9',
    marginBottom: 4,
  },
  logsDeveloperSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  logsActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  logsActionButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logsActionButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
  },
  logsDisplayContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logsDisplayLabel: {
    fontSize: 13,
    fontWeight: adjustFontWeight('600'),
    color: '#94a3b8',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logsScrollView: {
    flex: 1,
  },
  logsHeaderRight: {
    flexDirection: 'row',
  },
  logsHeaderButton: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  logsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logsText: {
    color: '#cbd5e1',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  logsFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  logsFooterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logsFooterButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
  },
  // Feedback Modal styles
  feedbackContainer: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  feedbackHeader: {
    backgroundColor: '#3D8B8B',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackHeaderTitle: {
    fontSize: 24,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  feedbackCloseButton: {
    padding: 4,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#2d3748',
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  feedbackContactInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  feedbackNote: {
    fontSize: 13,
    color: '#6b7c8a',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  feedbackSubmitButton: {
    backgroundColor: '#3D8B8B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackSubmitButtonDisabled: {
    opacity: 0.7,
  },
  feedbackSubmitButtonText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  // Support ID Modal styles
  supportIdModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  supportIdModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  supportIdModalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#2d3748',
    marginBottom: 16,
  },
  supportIdModalValue: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: '#3D8B8B',
    backgroundColor: '#f0f4f4',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  supportIdModalHint: {
    fontSize: 12,
    color: '#6b7c8a',
    marginTop: 8,
    marginBottom: 20,
  },
  supportIdModalDoneButton: {
    backgroundColor: '#3D8B8B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  supportIdModalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
});
