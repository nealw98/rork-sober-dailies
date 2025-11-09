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
import {
  fetchPackages,
  purchasePackage,
  purchasesAvailable,
  type PurchasesPackage,
} from '@/lib/purchases';

const AboutSupportScreen = () => {
  // Silence verbose logs in production to avoid any UI jank
  const log = __DEV__ ? console.log : (..._args: any[]) => {};
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [packagesById, setPackagesById] = useState<Record<string, PurchasesPackage>>({});
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [logsVisible, setLogsVisible] = useState(false);
  const [logsText, setLogsText] = useState('');
  const insets = useSafeAreaInsets();

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
        if (!purchasesAvailable) {
          console.log('[Offerings] Purchases disabled for this build');
          if (mounted) {
            setErrorMessage('In-app purchases are temporarily unavailable.');
            setIsLoadingOfferings(false);
          }
          return;
        }

        const offeringsStartTime = Date.now();
        const allPkgs = await fetchPackages();
        const offeringsTime = Date.now() - offeringsStartTime;
        log(`[Offerings] fetchPackages() took ${offeringsTime}ms and returned ${allPkgs.length} packages`);
        log('[Offerings] All packages:', allPkgs.map((p: any) => ({ 
          pkgId: p.identifier, 
          storeId: p.storeProduct?.identifier, 
          price: p.storeProduct?.price 
        })));

        // Look for tier1, tier2, tier3 packages (case-insensitive)
        const wantedTiers = new Set(['tier1', 'tier2', 'tier3', 'Tier1', 'Tier2', 'Tier3']);
        
        // Filter packages by identifier - accept any that match tier pattern
        const filtered: PurchasesPackage[] = allPkgs.filter((p: any) => 
          wantedTiers.has(p.identifier) || 
          /^tier[123]$/i.test(p.identifier) ||
          p.identifier?.startsWith('$rc_') // Also accept RevenueCat default package IDs
        );
        
        log(`[Offerings] Filtered to ${filtered.length} tier packages:`, 
          filtered.map((p: any) => `${p.identifier}:${p.storeProduct?.identifier}`));

        const byId: Record<string, PurchasesPackage> = {};
        
        // Map packages by tier identifier (normalized to lowercase)
        // Accept packages even if they don't have storeProduct yet (for testing)
        filtered.forEach((p: any) => {
          const normalizedId = p.identifier.toLowerCase();
          
          // Map tier1, tier2, tier3 (any case)
          if (normalizedId === 'tier1' || normalizedId === 'tier2' || normalizedId === 'tier3') {
            byId[normalizedId] = p;
            log(`[Offerings] Mapped package: ${normalizedId} -> ${p.storeProduct?.identifier || 'no storeProduct yet'}`);
          }
          // Map RevenueCat default package IDs if present
          else if (normalizedId === '$rc_monthly' && !byId['tier1']) {
            byId['tier1'] = p;
            log(`[Offerings] Mapped $rc_monthly to tier1`);
          }
          else if (normalizedId === '$rc_six_month' && !byId['tier2']) {
            byId['tier2'] = p;
            log(`[Offerings] Mapped $rc_six_month to tier2`);
          }
          else if (normalizedId === '$rc_annual' && !byId['tier3']) {
            byId['tier3'] = p;
            log(`[Offerings] Mapped $rc_annual to tier3`);
          }
        });
        
        log('[Offerings] Final package mapping:', Object.keys(byId));
        log('[Offerings] Packages available:', Object.entries(byId).map(([id, pkg]) => 
          `${id}: ${(pkg as any).storeProduct?.identifier || 'pending'}`
        ));
        
        const totalTime = Date.now() - loadStartTime;
        log(`[Offerings] Successfully processed packages in ${totalTime}ms`);
        
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
            setErrorMessage('Unable to load products. Please check your connection and try again.');
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

  const handleTierPress = async (tierId: string) => {
    const startTime = Date.now();
    log(`[Purchase] Starting purchase flow for ${tierId} at ${new Date().toISOString()}`);

    // Immediate haptic feedback to acknowledge tap
    try { await Haptics.selectionAsync(); } catch {}
    
    if (isLoadingOfferings) {
      console.log('[Purchase] Offerings still loading, blocking purchase');
      setErrorMessage('Loading products...');
      return;
    }
    
    if (!purchasesAvailable) {
      setErrorMessage('In-app purchases are temporarily unavailable.');
      return;
    }

    log(`[Purchase] Looking for tier: ${tierId} in packagesById:`, Object.keys(packagesById));
    const pkg = packagesById[tierId];
    
    if (!pkg) {
      console.log(`[Purchase] Package not found for tier: ${tierId}`);
      setErrorMessage('Product not available. Please try again or check your connection.');
      return;
    }
    
    try {
      setErrorMessage(null);
      setPurchasingId(tierId);
      
      const purchaseStartTime = Date.now();
      log(`[Purchase] Preparing purchasePackage for ${tierId} at ${new Date().toISOString()}`);

      // Allow UI to render first, then invoke purchase in next tick
      await Promise.resolve();

      // Hide the in-button message shortly after invoking StoreKit so it disappears when the sheet appears
      const hideTimer = setTimeout(() => {
        setPurchasingId(null);
      }, 1500);

      try {
        await purchasePackage(pkg);
      } finally {
        clearTimeout(hideTimer);
      }
      
      const purchaseEndTime = Date.now();
      const totalTime = purchaseEndTime - startTime;
      const purchaseTime = purchaseEndTime - purchaseStartTime;
      
      log(`[Purchase] Success! Total time: ${totalTime}ms, Purchase time: ${purchaseTime}ms`);
      Alert.alert('Thank you!', 'Your support helps keep Sober Dailies running smoothly.');
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

  const appVersion = Constants.expoConfig?.version ?? '—';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber ?? undefined;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode ?? undefined;

  // Get tier packages with fallback labels
  const tier1Pkg = packagesById['tier1'];
  const tier2Pkg = packagesById['tier2'];
  const tier3Pkg = packagesById['tier3'];
  
  const tier1Label = (tier1Pkg as any)?.storeProduct?.priceString || '$4.99';
  const tier2Label = (tier2Pkg as any)?.storeProduct?.priceString || '$9.99';
  const tier3Label = (tier3Pkg as any)?.storeProduct?.priceString || '$19.99';
  
  const areProductsAvailable = !isLoadingOfferings && (tier1Pkg || tier2Pkg || tier3Pkg);

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

          {/* About Card - TOP SECTION */}
          <View style={styles.aboutCard}>
            <Text style={styles.aboutCardTitle}>About the App</Text>
            <Text style={styles.aboutCardText}>
              Hi friends,{"\n\n"}
               I created Sober Dailies because I wanted a simple way to stay consistent with my recovery practices. I needed something that would guide me through my daily habits and bring all the tools I used into one app. I'm grateful to share it with anyone who finds it helpful.{"\n\n"}
              Your contribution is completely voluntary, but it truly helps. It goes toward covering my development costs, keeping the app running smoothly, and funding future updates and improvements. My goal is to keep the core features free for anyone who wants to use them.{"\n\n"}
              Whether or not you contribute, I'm just glad you're here and that the app supports your journey.{"\n\n"}
              — Neal
            </Text>
          </View>

          {/* Support Card - MIDDLE SECTION */}
          <View style={styles.supportCard}>
            <Text style={styles.supportCardTitle}>Support Sober Dailies</Text>
            <Text style={styles.supportCardText}>
              These are one-time voluntary support options. No extra content is unlocked.
            </Text>

            <View style={styles.buttonSpacer} />
            
            {isLoadingOfferings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#4A90E2" />
                <Text style={styles.loadingText}>Loading products…</Text>
              </View>
            ) : !areProductsAvailable ? (
              <Text style={styles.unavailableText}>Support options unavailable right now.</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.tierButton, !tier1Pkg && styles.tierButtonDisabled]}
                  onPress={() => tier1Pkg && handleTierPress('tier1')}
                  disabled={!tier1Pkg || purchasingId === 'tier1'}
                >
                  {purchasingId === 'tier1' ? (
                    <ActivityIndicator color="#F5F5F5" />
                  ) : (
                    <Text style={styles.tierButtonText}>{tier1Label} – Supporter</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tierButton, !tier2Pkg && styles.tierButtonDisabled]}
                  onPress={() => tier2Pkg && handleTierPress('tier2')}
                  disabled={!tier2Pkg || purchasingId === 'tier2'}
                >
                  {purchasingId === 'tier2' ? (
                    <ActivityIndicator color="#F5F5F5" />
                  ) : (
                    <Text style={styles.tierButtonText}>{tier2Label} – Sustainer</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tierButton, !tier3Pkg && styles.tierButtonDisabled]}
                  onPress={() => tier3Pkg && handleTierPress('tier3')}
                  disabled={!tier3Pkg || purchasingId === 'tier3'}
                >
                  {purchasingId === 'tier3' ? (
                    <ActivityIndicator color="#F5F5F5" />
                  ) : (
                    <Text style={styles.tierButtonText}>{tier3Label} – Champion</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {errorMessage ? (
              <Text style={styles.inlineError}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* Rate / Share actions and legal links - BOTTOM SECTION */}
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

          {/* Privacy Policy and Terms Links */}
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={handlePrivacyPress}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={handleTermsPress}>
              <Text style={styles.legalLink}>Terms</Text>
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
    fontWeight: '400',
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
    textAlign: 'center',
  },
  buttonSpacer: {
    height: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  tierButton: {
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
  tierButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  tierButtonText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#F5F5F5',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
  versionTextCentered: {
    fontSize: 12,
    color: '#98a2b3',
    marginTop: 12,
  },
});

export default AboutSupportScreen;
