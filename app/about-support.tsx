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
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Star, Share2 } from 'lucide-react-native';
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
  const insets = useSafeAreaInsets();

  const productIds = useMemo(() => ({
    1.99: Platform.select({ ios: 'Tier1', android: 'Tier1' }),
    4.99: Platform.select({ ios: 'Tier2', android: 'Tier2' }),
    8.99: Platform.select({ ios: 'Tier3', android: 'Tier3' }),
  }), []);

  // Preload offerings/prices on mount so purchase can be immediate
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!Purchases) return;
        const offs: Offerings = await Purchases.getOfferings();
        const current = offs?.current;
        const allPkgs = current?.availablePackages ?? [];
        const wanted = new Set(['Tier1', 'Tier2', 'Tier3']);
        const filtered: PurchasesPackage[] = allPkgs.filter((p: any) => wanted.has(p.storeProduct?.identifier));
        const byId: Record<string, PurchasesPackage> = {};
        filtered.forEach((p) => {
          const id = p.storeProduct.identifier;
          if (id) byId[id] = p;
        });
        if (mounted) setPackagesById(byId);
      } catch {
        // Silent; UI will fallback to static price copy
      }
    })();
    return () => { mounted = false; };
  }, []);

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
    const productId = (productIds as any)[amount];
    if (!productId) return;
    const pkg = packagesById[productId];
    if (!pkg) {
      setErrorMessage('Store not ready. Please try again.');
      return;
    }
    try {
      setErrorMessage(null);
      setPurchasingId(productId);
      await Purchases.purchasePackage(pkg);
      // Success: silent
    } catch (e: any) {
      if (e?.userCancelled) return;
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
              onPress={() => handleTipPress(8.99)}
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
                  Keep it Free — {packagesById['Tier3']?.storeProduct?.priceString ?? '$8.99'}
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
          <Text style={styles.versionTextCentered}>
            Version {appVersion}
            {Platform.OS === 'ios' && iosBuild ? ` (${iosBuild})` : ''}
            {Platform.OS === 'android' && androidVersionCode ? ` (${androidVersionCode})` : ''}
          </Text>
        </View>
      </View>
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
