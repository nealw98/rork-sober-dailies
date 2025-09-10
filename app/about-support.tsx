import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Star, Share2 } from 'lucide-react-native';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();

  const productIds = useMemo(() => ({
    1.99: Platform.select({ ios: 'Tier1', android: 'Tier1' }),
    4.99: Platform.select({ ios: 'Tier2', android: 'Tier2' }),
    8.99: Platform.select({ ios: 'Tier3', android: 'Tier3' }),
  }), []);

  const handleCoffeeSupportPress = async (amount: number, description: string) => {
    const productId = (productIds as any)[amount];
    if (!productId) {
      Alert.alert('Unavailable', 'This product is not available.');
      return;
    }
    try {
      setIsProcessing(true);
      if (!Purchases) {
        throw new Error('Purchases SDK not available in this environment');
      }
      const products = await Purchases.getProducts([productId], 'consumable');
      const product = products.find((p: any) => p.identifier === productId || p.storeProduct?.identifier === productId);
      if (!product) {
        throw new Error('Product not found');
      }
      await Purchases.purchaseProduct(product.identifier ?? product.storeProduct.identifier);
      Alert.alert('Thank you!', 'Your contribution helps keep Sober Dailies free for everyone.');
    } catch (e: any) {
      // Ignore cancellations
      if (e?.userCancelled) return;
      Alert.alert('Purchase failed', e?.message ?? 'Something went wrong processing your contribution.');
    } finally {
      setIsProcessing(false);
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
              I built Sober Dailies as a simple daily program with all the tools I need in one place. Your support helps cover costs and keeps it free for everyone.
            </Text>
          </View>

          <View style={styles.supportContainer}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(1.99, 'Show your appreciation')}
              disabled={isProcessing}
            >
              <Text style={styles.supportButtonText}>Show your appreciation — $1.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(4.99, 'Support the App')}
              disabled={isProcessing}
            >
              <Text style={styles.supportButtonText}>Support the App — $4.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(8.99, 'Keep it Free')}
              disabled={isProcessing}
            >
              <Text style={styles.supportButtonText}>Keep it Free — $8.99</Text>
            </TouchableOpacity>

            <Text style={styles.supportNote}>
              Contributions are optional and don't unlock features.
            </Text>
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
  supportNote: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
