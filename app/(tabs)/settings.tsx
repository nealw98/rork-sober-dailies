import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Share, ScrollView, Modal, SafeAreaView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { requestReviewNow } from '@/lib/reviewPrompt';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import { Logger } from '@/lib/logger';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { fontSize, setFontSize, minFontSize, maxFontSize } = useTextSettings();
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsText, setLogsText] = useState('');
  
  const step = 2;
  const increase = () => setFontSize(fontSize + step);
  const decrease = () => setFontSize(fontSize - step);

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
      try {
        const didShowNativePrompt = await requestReviewNow();
        if (didShowNativePrompt) {
          console.log('[settings] Successfully showed native review prompt');
          return;
        }
        console.log('[settings] Native review prompt not available, falling back to store URL');
      } catch (error) {
        console.warn('[settings] Native review prompt failed, falling back to store URL', error);
      }

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
          ? 'https://apps.apple.com/app/sober-dailies/id6738032000'
          : 'https://play.google.com/store/apps/details?id=com.nealwagner.soberdailies';

      await Share.share({
        message: 'Sober Dailies helps me stay sober one day at a time. Check it out: ' + appStoreUrl,
      });
    } catch {
      // no-op
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
            onPress={() => router.back()} 
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
          onPress={() => router.push('/about-support')}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuItemTitle, { fontSize }]}>Support the Developer</Text>
          <ChevronRight size={18} color="#a0a0a0" />
        </TouchableOpacity>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>About</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => router.push('/about-support')}
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
          onLongPress={toggleLogs} 
          activeOpacity={0.6}
        >
          <Text style={styles.versionText}>
            Version {appVersion}
            {Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}
            {Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hidden in-app log viewer modal (QA screen) */}
      <Modal visible={logsVisible} animationType="slide" onRequestClose={toggleLogs}>
        <SafeAreaView style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <TouchableOpacity onPress={toggleLogs}>
              <Text style={styles.logsHeaderButton}>Close</Text>
            </TouchableOpacity>
            <View style={styles.logsHeaderRight}>
              <TouchableOpacity onPress={copyLogs} style={{ marginRight: 16 }}>
                <Text style={styles.logsHeaderButton}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearLogs}>
                <Text style={styles.logsHeaderButton}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.logsScrollContent} style={{ flex: 1 }}>
            <Text style={styles.logsText}>
              {logsText || 'No logs yet.'}
            </Text>
          </ScrollView>
          <View style={styles.logsFooter}>
            <TouchableOpacity onPress={checkForOta}>
              <Text style={styles.logsHeaderButton}>Check for Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reloadApp}>
              <Text style={styles.logsHeaderButton}>Restart Now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
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
    backgroundColor: '#0b1220',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logsHeaderRight: {
    flexDirection: 'row',
  },
  logsHeaderButton: {
    color: 'white',
    fontSize: 16,
  },
  logsScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  logsText: {
    color: '#c7d2fe',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
  },
  logsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
});
