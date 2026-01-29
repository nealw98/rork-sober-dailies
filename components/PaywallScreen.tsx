import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { RefreshCw, MessageCircle, BookOpen, Sparkles, Check } from 'lucide-react-native';
import { adjustFontWeight } from '@/constants/fonts';
import { useSubscription } from '@/hooks/useSubscription';

const DEVELOPER_MODE_KEY = 'sober_dailies_developer_mode';
const PREMIUM_OVERRIDE_KEY = 'sober_dailies_premium_override';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use the current offering from RevenueCat (set as default in dashboard)

// ============================================================================
// HELPERS
// ============================================================================

function formatPackageLabel(pkg: any): string {
  const type = String(pkg?.packageType || '').toUpperCase();
  if (type.includes('ANNUAL') || type.includes('YEAR')) return 'Yearly';
  if (type.includes('MONTH')) return 'Monthly';
  return 'Subscribe';
}

function formatPackagePriceLine(pkg: any): string {
  const price = pkg?.product?.priceString || pkg?.product?.price_string || '';
  const label = formatPackageLabel(pkg);
  if (label === 'Yearly') return price ? `${price}/year` : 'Yearly';
  if (label === 'Monthly') return price ? `${price}/month` : 'Monthly';
  return price || 'Continue';
}

function calculateSavingsPercentage(monthlyPkg: any, yearlyPkg: any): number | null {
  try {
    const monthlyPrice = monthlyPkg?.product?.price || 0;
    const yearlyPrice = yearlyPkg?.product?.price || 0;
    if (monthlyPrice <= 0 || yearlyPrice <= 0) return null;
    const yearlyMonthlyEquivalent = yearlyPrice / 12;
    const savings = ((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice) * 100;
    return savings > 0 ? Math.round(savings) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// PREMIUM BENEFITS
// ============================================================================

const PREMIUM_BENEFITS = [
  { icon: Sparkles, text: 'Daily reflections & gratitude journal' },
  { icon: BookOpen, text: 'Enhanced Big Book reader' },
  { icon: MessageCircle, text: 'AI Sponsor conversations' },
  { icon: Sparkles, text: 'Daily prayers' },
  { icon: Sparkles, text: 'Evening review & spot check inventory' },
];

// ============================================================================
// PAYWALL SCREEN
// ============================================================================

export default function PaywallScreen() {
  const { offerings, isLoading, error, purchasePackage, restorePurchases, refresh } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  // Check for developer mode on mount
  useEffect(() => {
    AsyncStorage.getItem(DEVELOPER_MODE_KEY).then((value) => {
      setIsDeveloperMode(value === 'true');
    });
  }, []);

  // Get packages from the 'default' offering (subscription products)
  // IMPORTANT: Must use 'default' offering, NOT tips_only or legacy offerings
  const defaultOffering = offerings?.all?.['default'];
  const currentOffering = offerings?.current;
  
  // Prefer 'default' offering, but verify current isn't a tip jar
  const subscriptionOffering = defaultOffering ?? 
    (currentOffering?.identifier !== 'tips_only_1_9' && 
     currentOffering?.identifier !== 'tips_only' &&
     currentOffering?.identifier !== 'legacy_offerings' 
      ? currentOffering 
      : null);
  
  const availablePackages = subscriptionOffering?.availablePackages ?? [];

  // Debug logging
  if (offerings) {
    console.log('[Paywall] All offering IDs:', Object.keys(offerings.all || {}));
    console.log('[Paywall] Current offering ID:', currentOffering?.identifier || 'none');
    console.log('[Paywall] Default offering found:', !!defaultOffering);
    console.log('[Paywall] Using offering:', subscriptionOffering?.identifier || 'NONE - NO VALID OFFERING');
    console.log('[Paywall] Available packages count:', availablePackages.length);
    
    // Warn if we couldn't find the default offering
    if (!defaultOffering) {
      console.warn('[Paywall] WARNING: "default" offering not found in RevenueCat!');
      console.warn('[Paywall] Available offerings:', Object.keys(offerings.all || {}));
    }
  }

  // Separate monthly and yearly packages
  const { monthlyPkg, yearlyPkg, otherPkgs, savingsPercentage } = useMemo(() => {
    const pkgs = [...availablePackages];

    console.log('[Paywall] Available packages:', pkgs.length);
    pkgs.forEach((pkg, i) => {
      console.log(`[Paywall] Package ${i}:`, {
        identifier: pkg?.identifier,
        packageType: pkg?.packageType,
        productIdentifier: pkg?.product?.identifier,
        priceString: pkg?.product?.priceString,
      });
    });

    const isYearly = (p: any) => {
      const packageType = String(p?.packageType || '').toUpperCase();
      const identifier = String(p?.identifier || '').toLowerCase();
      return packageType === 'ANNUAL' || packageType.includes('ANNUAL') || identifier === '$rc_annual';
    };

    const isMonthly = (p: any) => {
      const packageType = String(p?.packageType || '').toUpperCase();
      const identifier = String(p?.identifier || '').toLowerCase();
      return packageType === 'MONTHLY' || packageType.includes('MONTH') || identifier === '$rc_monthly';
    };

    const yearly = pkgs.find(isYearly) || null;
    const monthly = pkgs.find(isMonthly) || null;
    const rest = pkgs.filter((p) => p !== yearly && p !== monthly);
    const savings = calculateSavingsPercentage(monthly, yearly);

    console.log('[Paywall] Identified:', { yearly: yearly?.identifier, monthly: monthly?.identifier });

    return { monthlyPkg: monthly, yearlyPkg: yearly, otherPkgs: rest, savingsPercentage: savings };
  }, [availablePackages]);

  const handleBuy = async (pkg: any) => {
    if (!pkg) return;
    try {
      setIsPurchasing(true);
      await purchasePackage(pkg);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const info = await restorePurchases();
      const entitled = !!info?.entitlements?.active?.premium;
      if (!entitled) {
        Alert.alert(
          'No Active Subscription',
          'We couldn\'t find an active subscription. If you believe this is a mistake, please try again.'
        );
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy');

  const isProcessing = isLoading || isPurchasing || isRestoring;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Try 7 Days Free</Text>
            <Text style={styles.subtitle}>
              Unlock all of Sober Dailies Premium
            </Text>
          </View>

          {/* Benefits Card */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>What's Included</Text>
            {PREMIUM_BENEFITS.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <View key={index} style={styles.benefitRow}>
                  <View style={styles.benefitCheck}>
                    <Check size={14} color="#fff" />
                  </View>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              );
            })}
          </View>

          {/* Loading State */}
          {isProcessing && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>
                {isRestoring ? 'Restoring…' : isPurchasing ? 'Processing…' : 'Loading…'}
              </Text>
            </View>
          )}

          {/* Error State */}
          {!!error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.8}>
                <RefreshCw size={16} color="#3D8B8B" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Subscription Options */}
          <View style={styles.optionsContainer}>
            
            {/* Yearly Option */}
            {!!yearlyPkg && (
              <TouchableOpacity
                style={[styles.optionCard, styles.optionPrimary, isProcessing && styles.optionDisabled]}
                disabled={isProcessing}
                onPress={() => handleBuy(yearlyPkg)}
                activeOpacity={0.9}
              >
                {savingsPercentage && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>Save {savingsPercentage}%</Text>
                  </View>
                )}
                <View style={styles.optionHeader}>
                  <Text style={styles.optionPrimaryLabel}>Premium Yearly</Text>
                  <Text style={styles.optionPrimaryPrice}>{formatPackagePriceLine(yearlyPkg)}</Text>
                </View>
                <Text style={styles.optionTrialText}>7 days free, then billed annually</Text>
              </TouchableOpacity>
            )}

            {/* Monthly Option */}
            {!!monthlyPkg && (
              <TouchableOpacity
                style={[styles.optionCard, styles.optionSecondary, isProcessing && styles.optionDisabled]}
                disabled={isProcessing}
                onPress={() => handleBuy(monthlyPkg)}
                activeOpacity={0.9}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionSecondaryLabel}>Premium Monthly</Text>
                  <Text style={styles.optionSecondaryPrice}>{formatPackagePriceLine(monthlyPkg)}</Text>
                </View>
                <Text style={styles.optionTrialTextSecondary}>7 days free, then billed monthly</Text>
              </TouchableOpacity>
            )}

            {/* Fallback */}
            {!yearlyPkg && !monthlyPkg && otherPkgs.map((pkg: any) => (
              <TouchableOpacity
                key={pkg?.identifier || Math.random().toString(16)}
                style={[styles.optionCard, styles.optionSecondary, isProcessing && styles.optionDisabled]}
                disabled={isProcessing}
                onPress={() => handleBuy(pkg)}
                activeOpacity={0.9}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionSecondaryLabel}>{formatPackageLabel(pkg)}</Text>
                  <Text style={styles.optionSecondaryPrice}>{formatPackagePriceLine(pkg)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Trial Info */}
          <Text style={styles.trialInfo}>
            No charge during your 7-day free trial.{'\n'}Cancel anytime in your device settings.
          </Text>

          {/* Legal */}
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link} onPress={openTerms}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={openPrivacy}>Privacy Policy</Text>.
          </Text>

          {/* Dev/Developer Mode bypass button */}
          {(__DEV__ || isDeveloperMode) && (
            <TouchableOpacity
              style={styles.devBypassButton}
              onPress={async () => {
                try {
                  // Set premium override flag that useSubscription checks
                  await SecureStore.setItemAsync(PREMIUM_OVERRIDE_KEY, 'true');
                  Alert.alert(
                    'Developer Mode',
                    'Premium access enabled. Restart the app to continue.',
                    [{ text: 'OK' }]
                  );
                } catch (e) {
                  Alert.alert('Error', 'Failed to set premium override');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.devBypassText}>🛠 DEV: Bypass Paywall</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: adjustFontWeight('700', true),
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },

  // Benefits
  benefitsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#fff',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: adjustFontWeight('500', true),
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: adjustFontWeight('500', true),
  },

  // Error
  errorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  retryButtonText: {
    color: '#3D8B8B',
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
  },

  // Options
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  optionPrimary: {
    backgroundColor: '#fff',
  },
  optionSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionPrimaryLabel: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#3D8B8B',
  },
  optionPrimaryPrice: {
    fontSize: 18,
    fontWeight: adjustFontWeight('700', true),
    color: '#3D8B8B',
  },
  optionTrialText: {
    fontSize: 14,
    color: '#666',
    fontWeight: adjustFontWeight('400', true),
  },
  optionSecondaryLabel: {
    fontSize: 17,
    fontWeight: adjustFontWeight('600', true),
    color: '#fff',
  },
  optionSecondaryPrice: {
    fontSize: 17,
    fontWeight: adjustFontWeight('700', true),
    color: '#fff',
  },
  optionTrialTextSecondary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: adjustFontWeight('400', true),
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: adjustFontWeight('700', true),
  },

  // Restore
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: adjustFontWeight('500', true),
    textDecorationLine: 'underline',
  },

  // Trial Info
  trialInfo: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },

  // Legal
  legalText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontWeight: adjustFontWeight('500', true),
  },

  // Dev-only
  devBypassButton: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.5)',
  },
  devBypassText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
  },
});
