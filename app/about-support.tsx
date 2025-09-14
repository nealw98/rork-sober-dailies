import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Linking,
  Platform,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Star, Share2 } from 'lucide-react-native';
import { Logger } from '@/lib/logger';
import * as Clipboard from 'expo-clipboard';
import type { Offerings, PurchasesPackage } from 'react-native-purchases';
let Purchases: any = null;
try {
  const { NativeModules } = require('react-native');
  if (NativeModules && NativeModules.RNPurchases) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    Purchases = (mod && mod.default) ? mod.default : mod;
  }
} catch {}

const AboutSupportScreen = () => {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [packagesById, setPackagesById] = useState<Record<string, PurchasesPackage>>({});
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchaseInProgress, setIsPurchaseInProgress] = useState(false);
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsText, setLogsText] = useState('');
  const insets = useSafeAreaInsets();

  const productIds = useMemo(() => ({
    1.99: Platform.select({ ios: 'Tier1', android: 'Tier1' }),
    4.99: Platform.select({ ios: 'Tier2', android: 'Tier2' }),
    7.99: Platform.select({ ios: 'Tier3', android: 'Tier3' }),
  }), []);

  // Preload offerings/prices on mount so purchase can be immediate
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadOfferings = async () => {
      const loadStartTime = Date.now();
      console.log(`[Offerings] Starting to load offerings (attempt ${retryCount + 1}) at ${new Date().toISOString()}`);
      
      try {
        if (!Purchases) {
          console.log('[Offerings] RevenueCat not available');
          if (mounted) {
            setErrorMessage('RevenueCat not available in this environment');
            setIsLoadingOfferings(false);
          }
          return;
        }
        
        const offeringsStartTime = Date.now();
        const offs: Offerings = await Purchases.getOfferings();
        const offeringsTime = Date.now() - offeringsStartTime;
        console.log(`[Offerings] getOfferings() took ${offeringsTime}ms`);
        
        const current = offs?.current;
        const allPkgs = current?.availablePackages ?? [];
        console.log(`[Offerings] Found ${allPkgs.length} total packages`);
        console.log('[Offerings] All packages:', allPkgs.map((p: any) => ({ pkgId: p.identifier, storeId: p.storeProduct?.identifier, price: p.storeProduct?.price })));

        // Prefer RevenueCat package identifiers (Tier1, Tier2, Tier3). If not present, fall back by price rank.
        const wanted = new Set(['Tier1', 'Tier2', 'Tier3']);
        let filtered: PurchasesPackage[] = allPkgs.filter((p: any) => wanted.has(p.identifier));
        let usingFallback = false;
        if (filtered.length === 0 && allPkgs.length > 0) {
          usingFallback = true;
          filtered = [...allPkgs].sort((a: any, b: any) => (a.storeProduct?.price ?? 0) - (b.storeProduct?.price ?? 0)).slice(0, 3);
          console.log('[Offerings] Fallback mapping by price rank due to missing Tier1-3 package identifiers');
        }
        console.log(`[Offerings] Filtered to ${filtered.length} wanted packages:`, filtered.map((p: any) => `${p.identifier}:${p.storeProduct?.identifier}`));

        const byId: Record<string, PurchasesPackage> = {};
        if (!usingFallback) {
          filtered.forEach((p: any) => { byId[p.identifier] = p; });
        } else {
          const keys = ['Tier1', 'Tier2', 'Tier3'];
          filtered.forEach((p: any, idx: number) => { byId[keys[idx]] = p; });
        }
        
        const totalTime = Date.now() - loadStartTime;
        console.log(`[Offerings] Successfully loaded offerings in ${totalTime}ms`);
        
        if (mounted) {
          setPackagesById(byId);
          setErrorMessage(null);
          setIsLoadingOfferings(false);
        }
      } catch (error: any) {
        const errorTime = Date.now();
        const totalTime = errorTime - loadStartTime;
        console.log(`[Offerings] Failed to load offerings after ${totalTime}ms:`, error?.message);
        
        if (mounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = 2000 * retryCount;
            console.log(`[Offerings] Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
            setTimeout(() => {
              if (mounted) loadOfferings();
            }, retryDelay);
          } else {
            console.log('[Offerings] Max retries reached, giving up');
            setErrorMessage('Unable to load store products. Please check your connection and try again.');
            setIsLoadingOfferings(false);
          }
        }
      }
    };

    loadOfferings();
    return () => { mounted = false; };
  }, []);

  // Update in-app logs when viewer is open
  useEffect(() => {
    if (!logsVisible) return;
    setLogsText(Logger.toClipboardText());
    const unsub = Logger.subscribe(() => {
      setLogsText(Logger.toClipboardText());
    });
    return () => unsub();
  }, [logsVisible]);

  // After ~2s of pending, show connecting hint
  useEffect(() => {
    if (!purchasingId) {
      setConnecting(false);
      return;
    }
    const t = setTimeout(() => setConnecting(true), 2000);
    return () => {
      clearTimeout(t);
      setConnecting(false);
    };
  }, [purchasingId]);

  const handleTipPress = async (amount: number) => {
    const startTime = Date.now();
    console.log(`[Purchase] Starting purchase flow for ${amount} at ${new Date().toISOString()}`);
    
    const productId = (productIds as any)[amount];
    if (!productId) {
      console.log('[Purchase] No product ID found for amount:', amount);
      return;
    }
    
    if (isLoadingOfferings) {
      console.log('[Purchase] Offerings still loading, blocking purchase');
      setErrorMessage('Loading store products...');
      return;
    }
    
    let pkg = packagesById[productId];
    if (!pkg) {
      // Fallback: choose closest by price
      const all = Object.values(packagesById);
      if (all.length > 0) {
        const target = amount;
        pkg = all.reduce((best: any, cur: any) => {
          const b = Math.abs((best?.storeProduct?.price ?? Infinity) - target);
          const c = Math.abs((cur?.storeProduct?.price ?? Infinity) - target);
          return c < b ? cur : best;
        }, all[0]);
        console.log('[Purchase] Using fallback package selection by price. Selected', pkg?.identifier, pkg?.storeProduct?.identifier, pkg?.storeProduct?.price);
      }
    }
    if (!pkg) {
      console.log('[Purchase] Package not found for productId:', productId);
      setErrorMessage('Product not available. Please try again or check your connection.');
      return;
    }
    
    try {
      setErrorMessage(null);
      setPurchasingId(productId);
      setIsPurchaseInProgress(true);
      
      const purchaseStartTime = Date.now();
      console.log(`[Purchase] Calling purchasePackage for ${productId} at ${new Date().toISOString()}`);
      
      // Hide spinner when Apple purchase sheet appears
      const purchasePromise = Purchases.purchasePackage(pkg);
      setPurchasingId(null);
      setIsPurchaseInProgress(false);
      
      await purchasePromise;
      
      const purchaseEndTime = Date.now();
      const totalTime = purchaseEndTime - startTime;
      const purchaseTime = purchaseEndTime - purchaseStartTime;
      
      console.log(`[Purchase] Success! Total time: ${totalTime}ms, Purchase time: ${purchaseTime}ms`);
      // Success: silent
    } catch (e: any) {
      const errorTime = Date.now();
      const totalTime = errorTime - startTime;
      console.log(`[Purchase] Error after ${totalTime}ms:`, e?.message || 'Unknown error');
      
      if (e?.userCancelled) {
        console.log('[Purchase] User cancelled purchase');
        return;
      }
      setErrorMessage(e?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchasingId(null);
      setIsPurchaseInProgress(false);
    }
  };

  const handlePrivacyPress = () => {
    // Open privacy policy in browser
    Linking.openURL('https://soberdailies.com/privacy');
  };

  const handleTermsPress = () => {
    // Open terms of use in browser
    Linking.openURL('https://soberdailies.com/terms');
  };

  const handleSupportPress = () => {
    // Open support in browser
    Linking.openURL('https://soberdailies.com/support');
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:support@soberdailies.com');
  };

  const handleRateAppPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Apple ID from App Store Connect (ascAppId in eas.json)
        const appStoreId = '6749869819';
        const url = `itms-apps://itunes.apple.com/app/id${appStoreId}?action=write-review`;
        await Linking.openURL(url);
      } else {
        const packageName = 'com.nealwagner.soberdailies';
        const url = `market://details?id=${packageName}`;
        const fallback = `https://play.google.com/store/apps/details?id=${packageName}`;
        const supported = await Linking.canOpenURL(url);
        await Linking.openURL(supported ? url : fallback);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open the store page right now.');
    }
  };

  const handleSharePress = async () => {
    try {
      await Share.share({
        message:
          'Sober Dailies helps me stay grounded one day at a time. Check it out: https://soberdailies.com',
      });
    } catch (error) {
      // no-op
    }
  };

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
      const result = await Updates.checkForUpdateAsync({ requestHeaders: { 'expo-channel-name': 'production' } as any });
      console.log('[OTA] manualCheck result', result);
      if (result.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync({ requestHeaders: { 'expo-channel-name': 'production' } as any });
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

    const appVersion = Constants.expoConfig?.version ?? '—';
    const iosBuild = Constants.expoConfig?.ios?.buildNumber ?? undefined;
    const androidVersionCode = Constants.expoConfig?.android?.versionCode ?? undefined;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerTitle: '' }} />
      {/* Gradient Background */}
      <LinearGradient
        colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}>
          {/* Profile */}
          <View style={styles.photoContainer}>
            <Image
              source={require('@/assets/images/about_neal.png')}
              style={styles.profilePhoto}
            />
          </View>

          {/* Intro */}
          <View style={styles.introContainer}>
            <Text style={styles.introText}>
              I built Sober Dailies as a simple way to practice the daily actions that keep me sober. Your support helps me cover the costs and keep it free for everyone who needs it.
            </Text>
          </View>

          <View style={styles.supportContainer}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleTipPress(1.99)}
              disabled={purchasingId === 'Tier1'}
            >
              {purchasingId === 'Tier1' ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator />
                  <Text style={styles.supportButtonText}>Opening Apple…</Text>
                  {connecting ? (
                    <Text style={styles.supportSubtext}>Connecting to App Store…</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.supportButtonText}>
                  Show your appreciation — {packagesById['Tier1']?.storeProduct?.priceString ?? '$1.99'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleTipPress(4.99)}
              disabled={purchasingId === 'Tier2'}
            >
              {purchasingId === 'Tier2' ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator />
                  <Text style={styles.supportButtonText}>Opening Apple…</Text>
                  {connecting ? (
                    <Text style={styles.supportSubtext}>Connecting to App Store…</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.supportButtonText}>
                  Support the App — {packagesById['Tier2']?.storeProduct?.priceString ?? '$4.99'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleTipPress(7.99)}
              disabled={purchasingId === 'Tier3'}
            >
              {purchasingId === 'Tier3' ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator />
                  <Text style={styles.supportButtonText}>Opening Apple…</Text>
                  {connecting ? (
                    <Text style={styles.supportSubtext}>Connecting to App Store…</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.supportButtonText}>
                  Help it Grow — {packagesById['Tier3']?.storeProduct?.priceString ?? '$7.99'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.supportNote}>
              Contributions are optional and don't unlock features.
            </Text>
            {errorMessage ? (
              <Text style={styles.inlineError}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* Rate / Share actions (below disclaimer) */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionPill} onPress={handleRateAppPress}>
              <Star size={16} color={'white'} style={styles.pillIcon} />
              <Text style={styles.actionPillText}>Rate the App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={handleSharePress}>
              <Share2 size={16} color={'white'} style={styles.pillIcon} />
              <Text style={styles.actionPillText}>Share</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Footer with centered links and version */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.footerCenter}>
          <View style={styles.footerLinksRowCentered}>
            <TouchableOpacity onPress={handlePrivacyPress}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>·</Text>
            <TouchableOpacity onPress={handleTermsPress}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>·</Text>
            <TouchableOpacity onPress={handleSupportPress}>
              <Text style={styles.footerLink}>Support</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onLongPress={toggleLogs} activeOpacity={0.6}>
            <Text style={styles.versionTextCentered}>
              Version {appVersion}
              {Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}
              {Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Hidden in-app log viewer modal */}
      <Modal visible={logsVisible} animationType="slide" onRequestClose={toggleLogs}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
            <TouchableOpacity onPress={toggleLogs}>
              <Text style={{ color: 'white', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={copyLogs} style={{ marginRight: 16 }}>
                <Text style={{ color: 'white', fontSize: 16 }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearLogs}>
                <Text style={{ color: 'white', fontSize: 16 }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }} style={{ flex: 1 }}>
            <Text style={{ color: '#c7d2fe', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 12, lineHeight: 18 }}>
              {logsText || 'No logs yet.'}
            </Text>
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
            <TouchableOpacity onPress={checkForOta}>
              <Text style={{ color: 'white', fontSize: 16 }}>Check for Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reloadApp}>
              <Text style={{ color: 'white', fontSize: 16 }}>Restart Now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  photoContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  profilePhoto: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  nameText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: adjustFontWeight('700'),
    color: '#222',
  },
  taglineText: {
    marginTop: 4,
    fontSize: 14,
    color: '#556',
  },
  introContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  introText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
    textAlign: 'center',
  },
  sectionHeaderRow: {
  },
  sectionHeader: {
  },
  supportContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  supportButton: {
    backgroundColor: '#E8F4F8',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1E7ED',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#333',
  },
  supportSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  supportNote: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inlineError: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  pillIcon: {
    marginRight: 6,
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: 'white',
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  footerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLinksRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: adjustFontWeight('400'),
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 13,
    color: '#6c757d',
    marginHorizontal: 16,
    fontWeight: adjustFontWeight('400'),
  },
  versionTextCentered: {
    fontSize: 12,
    color: '#98a2b3',
    marginTop: 12,
  },
  footerDivider: {
  },
});

export default AboutSupportScreen;
