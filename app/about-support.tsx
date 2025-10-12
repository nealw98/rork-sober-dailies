import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  Share,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Star, Share2, ChevronLeft } from 'lucide-react-native';
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
  // Silence verbose logs in production to avoid any UI jank
  const log = __DEV__ ? console.log : (..._args: any[]) => {};
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
    1.99: Platform.select({ ios: 'monthly_support', android: 'monthly_support' }),
    19.99: Platform.select({ ios: 'yearly_support', android: 'yearly_support' }),
  }), []);

  // Preload offerings/prices on mount so purchase can be immediate
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadOfferings = async () => {
      const loadStartTime = Date.now();
      const log = __DEV__ ? console.log : (..._args: any[]) => {};
      log(`[Offerings] Starting to load offerings (attempt ${retryCount + 1}) at ${new Date().toISOString()}`);
      
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
        log(`[Offerings] getOfferings() took ${offeringsTime}ms`);
        
        const current = offs?.current;
        const allPkgs = current?.availablePackages ?? [];
        log(`[Offerings] Found ${allPkgs.length} total packages`);
        log('[Offerings] All packages:', allPkgs.map((p: any) => ({ pkgId: p.identifier, storeId: p.storeProduct?.identifier, price: p.storeProduct?.price })));

        // Look for our specific subscription products
        const wanted = new Set(['monthly_support', 'yearly_support']);
        
        // Also map RevenueCat default package IDs to our products
        const rcPackageMap: Record<string, string> = {
          '$rc_monthly': 'monthly_support',
          '$rc_annual': 'yearly_support'
        };
        
        // Log all packages for debugging
        log('[Offerings] All packages with details:', allPkgs.map((p: any) => ({
          pkgId: p.identifier,
          storeId: p.storeProduct?.identifier,
          price: p.storeProduct?.price,
          priceString: p.storeProduct?.priceString
        })));
        
        // First try to filter by store product identifier (the App Store product ID)
        let filtered: PurchasesPackage[] = allPkgs.filter((p: any) => 
          p.storeProduct && wanted.has(p.storeProduct.identifier)
        );
        let usingFallback = false;
        // If we didn't find any products by identifier, try to match by package identifier
        if (filtered.length === 0 && allPkgs.length > 0) {
          log('[Offerings] No products found by store identifier, trying package identifier');
          filtered = allPkgs.filter((p: any) => wanted.has(p.identifier));
          
          if (filtered.length > 0) {
            log('[Offerings] Found products by package identifier:', filtered.map((p: any) => p.identifier));
            usingFallback = true;
          }
        }
        
        // Android fallback: Try RevenueCat's default package identifiers
        if (filtered.length === 0 && allPkgs.length > 0) {
          log('[Offerings] Trying RevenueCat default package IDs ($rc_monthly, $rc_annual)');
          filtered = allPkgs.filter((p: any) => p.identifier in rcPackageMap);
          
          if (filtered.length > 0) {
            log('[Offerings] Found products by RevenueCat package ID:', filtered.map((p: any) => p.identifier));
            usingFallback = true;
          }
        }
        
        // If we still don't have any products, fall back to using the first two by price
        if (filtered.length === 0 && allPkgs.length > 0) {
          usingFallback = true;
          filtered = [...allPkgs].sort((a: any, b: any) => (a.storeProduct?.price ?? 0) - (b.storeProduct?.price ?? 0)).slice(0, 2);
          log('[Offerings] Fallback mapping by price rank due to missing monthly_support/yearly_support identifiers');
        }
        log(`[Offerings] Filtered to ${filtered.length} wanted packages:`, filtered.map((p: any) => `${p.identifier}:${p.storeProduct?.identifier}`));

        const byId: Record<string, PurchasesPackage> = {};
        
        // Map packages by both package ID and store product ID when available
        filtered.forEach((p: any) => {
          // Always map by package ID
          if (p.identifier) {
            if (p.identifier === 'monthly_support' || p.identifier === 'yearly_support') {
              byId[p.identifier] = p;
              log(`[Offerings] Mapped package by identifier: ${p.identifier}`);
            }
            // Map RevenueCat default package IDs to our expected keys
            else if (p.identifier in rcPackageMap) {
              const mappedKey = rcPackageMap[p.identifier];
              byId[mappedKey] = p;
              log(`[Offerings] Mapped RevenueCat package ${p.identifier} to ${mappedKey}`);
            }
          }
          
          // Also map by store product ID if available
          if (p.storeProduct && p.storeProduct.identifier) {
            byId[p.storeProduct.identifier] = p;
            log(`[Offerings] Mapped package by store identifier: ${p.storeProduct.identifier}`);
          }
        });
        
        // If we still don't have the required keys, use fallback mapping
        if (!byId['monthly_support'] || !byId['yearly_support']) {
          log('[Offerings] Missing required keys, using fallback mapping');
          const keys = ['monthly_support', 'yearly_support'];
          filtered.forEach((p: any, idx: number) => { 
            if (idx < keys.length) {
              byId[keys[idx]] = p;
              log(`[Offerings] Fallback mapped ${keys[idx]} to ${p.identifier}`);
            }
          });
        }
        
        log('[Offerings] Final package mapping:', Object.keys(byId));
        
        const totalTime = Date.now() - loadStartTime;
        log(`[Offerings] Successfully loaded offerings in ${totalTime}ms`);
        
        if (mounted) {
          setPackagesById(byId);
          setErrorMessage(null);
          setIsLoadingOfferings(false);
        }
      } catch (error: any) {
        const errorTime = Date.now();
        const totalTime = errorTime - loadStartTime;
        log(`[Offerings] Failed to load offerings after ${totalTime}ms:`, error?.message);
        
        if (mounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = 2000 * retryCount;
            log(`[Offerings] Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
            setTimeout(() => {
              if (mounted) loadOfferings();
            }, retryDelay);
          } else {
            log('[Offerings] Max retries reached, giving up');
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

  // Maintain compatibility: we still track a connecting flag, but UI will only show 'Connecting...'
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
    log(`[Purchase] Starting purchase flow for ${amount} at ${new Date().toISOString()}`);

    // Immediate haptic feedback to acknowledge tap
    try { await Haptics.selectionAsync(); } catch {}
    
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
    
    log(`[Purchase] Looking for product ID: ${productId} in packagesById:`, Object.keys(packagesById));
    let pkg = packagesById[productId];
    if (!pkg) {
      console.log(`[Purchase] Package not found for productId: ${productId}. Available packages:`, 
        Object.entries(packagesById).map(([id, p]) => ({ 
          id, 
          pkgId: p.identifier, 
          storeId: p.storeProduct?.identifier,
          price: p.storeProduct?.price 
        }))
      );
      
      // Fallback: choose closest by price
      const all = Object.values(packagesById);
      if (all.length > 0) {
        const target = amount;
        pkg = all.reduce((best: any, cur: any) => {
          const b = Math.abs((best?.storeProduct?.price ?? Infinity) - target);
          const c = Math.abs((cur?.storeProduct?.price ?? Infinity) - target);
          return c < b ? cur : best;
        }, all[0]);
        log('[Purchase] Using fallback package selection by price. Selected', pkg?.identifier, pkg?.storeProduct?.identifier, pkg?.storeProduct?.price);
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
      log(`[Purchase] Preparing purchasePackage for ${productId} at ${new Date().toISOString()}`);

      // Allow UI to render first, then invoke purchase in next tick
      await Promise.resolve();

      // Hide the in-button message shortly after invoking StoreKit so it disappears when the sheet appears
      const hideTimer = setTimeout(() => {
        setPurchasingId(null);
        setIsPurchaseInProgress(false);
      }, 1500);

      try {
        await Purchases.purchasePackage(pkg);
      } finally {
        clearTimeout(hideTimer);
      }
      
      const purchaseEndTime = Date.now();
      const totalTime = purchaseEndTime - startTime;
      const purchaseTime = purchaseEndTime - purchaseStartTime;
      
      log(`[Purchase] Success! Total time: ${totalTime}ms, Purchase time: ${purchaseTime}ms`);
      // Success: silent
    } catch (e: any) {
      const errorTime = Date.now();
      const totalTime = errorTime - startTime;
      log(`[Purchase] Error after ${totalTime}ms:`, e?.message || 'Unknown error');
      
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
    // Open Apple's standard EULA
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  const handleSupportPress = () => {
    // Open support in browser
    Linking.openURL('https://soberdailies.com/support');
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:support@soberdailies.com');
  };

  const handleRestorePurchases = async () => {
    try {
      if (!Purchases) {
        setErrorMessage('RevenueCat not available in this environment');
        return;
      }
      
      setErrorMessage(null);
      console.log('[Restore] Starting restore purchases');
      
      const customerInfo = await Purchases.restorePurchases();
      console.log('[Restore] Restore completed successfully');
      
      // Check if user has any active subscriptions
      const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveSubscription) {
        Alert.alert('Success', 'Your purchases have been restored successfully!');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error: any) {
      console.log('[Restore] Error:', error?.message);
      setErrorMessage(error?.message ?? 'Failed to restore purchases. Please try again.');
    }
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
      const appStoreUrl = Platform.OS === 'ios' 
        ? 'https://apps.apple.com/app/sober-dailies/id6738032000'
        : 'https://play.google.com/store/apps/details?id=com.nealwagner.soberdailies';
      
      await Share.share({
        message:
          'Sober Dailies helps me stay sober one day at a time. Check it out: ' + appStoreUrl,
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
    <>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />
      <View style={styles.container}>
      {/* Status Bar Spacer */}
      <View style={[styles.statusBarSpacer, { height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : insets.top }]} />
      
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.customBackButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft color={Colors.light.tint} size={24} />
          <Text style={styles.customBackText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      {/* Gradient Background */}
      <LinearGradient
        colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 20, paddingBottom: insets.bottom + 96 }]}>

          {/* Support Card */}
          <View style={styles.supportCard}>
            <Text style={styles.supportCardTitle}>Support Sober Dailies</Text>
            <Text style={styles.supportCardText}>
              Supporting the app helps me keep it running smoothly and add new features.
            </Text>
            
            <View style={styles.bulletContainer}>
              <View style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletContent}>
                  <Text style={styles.boldText}>Monthly Support:</Text> $1.99/month. Auto-renews monthly. Cancel anytime.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletContent}>
                  <Text style={styles.boldText}>Yearly Support:</Text> $19.99/year. Auto-renews yearly. Cancel anytime.
                </Text>
              </View>
            </View>
            
            <Text style={styles.supportCardText}>
              Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings.
            </Text>

            <View style={styles.buttonSpacer} />
            <TouchableOpacity
              style={styles.subscriptionButton}
              onPress={() => handleTipPress(19.99)}
              disabled={purchasingId === 'yearly_support'}
            >
              {purchasingId === 'yearly_support' ? (
                <Text style={styles.subscriptionButtonText}>Connecting...</Text>
              ) : (
                <Text style={styles.subscriptionButtonText}>$1.99/Month</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subscriptionButton}
              onPress={() => handleTipPress(1.99)}
              disabled={purchasingId === 'monthly_support'}
            >
              {purchasingId === 'monthly_support' ? (
                <Text style={styles.subscriptionButtonText}>Connecting...</Text>
              ) : (
                <Text style={styles.subscriptionButtonText}>$19.99/Year</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>

            {/* Privacy Policy and Terms Links */}
            <View style={styles.restoreLegalLinksContainer}>
              <TouchableOpacity onPress={handlePrivacyPress}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity onPress={handleTermsPress}>
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.inlineError}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* About Card */}
          <View style={styles.aboutCard}>
            <Text style={styles.aboutCardTitle}>About the App</Text>
            <Text style={styles.aboutCardText}>
              Hi friends,{"\n\n"}
               I created Sober Dailies because I wanted a simple way to stay consistent with my recovery practices. I needed something that would guide me through my daily habits and bring all the tools I used into one app. I'm grateful to share it with anyone who finds it helpful.{"\n\n"}
              Your contribution is completely voluntary, but it truly helps. It goes toward covering my development costs, keeping the app running smoothly, and funding future updates and improvements. My goal is to keep the core features free for anyone who wants to use them.{"\n\n"}
              Whether or not you subscribe, I'm just glad you're here and that the app supports your journey.{"\n\n"}
              — Neal
            </Text>
          </View>

          {/* Rate / Share actions (below about section) */}
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
      <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) }]}>
        <View style={styles.footerCenter}>
          <View style={styles.footerLinksRowCentered}>
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
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statusBarSpacer: {
    backgroundColor: '#ffffff',
    width: '100%',
    zIndex: 10,
    position: 'relative',
  },
  customHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
    position: 'relative',
  },
  customBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customBackText: {
    fontSize: 16,
    color: Colors.light.tint,
    marginLeft: 4,
    fontWeight: adjustFontWeight('500'),
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
  supportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  supportCardTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  supportCardText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'left',
  },
  boldText: {
    fontWeight: adjustFontWeight('600'),
  },
  bulletContainer: {
    marginVertical: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 15,
    color: '#555',
    marginRight: 8,
    lineHeight: 22,
  },
  bulletContent: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  buttonSpacer: {
    height: 20,
  },
  subscriptionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  subscriptionButtonText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#F5F5F5',
  },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: adjustFontWeight('500'),
    textDecorationLine: 'underline',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  restoreLegalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  legalLink: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: adjustFontWeight('500'),
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 12,
    fontWeight: adjustFontWeight('400'),
  },
  supportSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  aboutCardTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  aboutCardText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'left',
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
    paddingTop: 16,
    paddingBottom: 16,
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
