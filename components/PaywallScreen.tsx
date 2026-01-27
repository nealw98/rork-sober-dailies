import React, { useMemo, useState } from 'react';
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
import { Crown, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { adjustFontWeight } from '@/constants/fonts';
import { useSubscription } from '@/hooks/useSubscription';

function formatPackageLabel(pkg: any): string {
  const type = String(pkg?.packageType || '').toUpperCase();
  if (type.includes('ANNUAL') || type.includes('YEAR')) return 'Yearly';
  if (type.includes('MONTH')) return 'Monthly';
  return 'Subscribe';
}

function formatPackagePriceLine(pkg: any): string {
  const price = pkg?.product?.priceString || pkg?.product?.price_string || '';
  const label = formatPackageLabel(pkg);
  if (label === 'Yearly') return price ? `${price} / year` : 'Yearly';
  if (label === 'Monthly') return price ? `${price} / month` : 'Monthly';
  return price || 'Continue';
}

export default function PaywallScreen() {
  const { offerings, isLoading, error, purchasePackage, restorePurchases, refresh } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const availablePackages = offerings?.current?.availablePackages ?? [];

  const { monthlyPkg, yearlyPkg, otherPkgs } = useMemo(() => {
    const pkgs = [...availablePackages];
    const isYearly = (p: any) => {
      const t = String(p?.packageType || '').toUpperCase();
      const id = String(p?.product?.identifier || '').toLowerCase();
      return t.includes('ANNUAL') || t.includes('YEAR') || id.includes('yearly_support') || id.includes(':yearly');
    };
    const isMonthly = (p: any) => {
      const t = String(p?.packageType || '').toUpperCase();
      const id = String(p?.product?.identifier || '').toLowerCase();
      return t.includes('MONTH') || id.includes('monthly_support') || id.includes(':monthly');
    };

    const yearly = pkgs.find(isYearly) || null;
    const monthly = pkgs.find(isMonthly) || null;
    const rest = pkgs.filter((p) => p !== yearly && p !== monthly);
    return { monthlyPkg: monthly, yearlyPkg: yearly, otherPkgs: rest };
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
        Alert.alert('No active subscription found', 'If you believe this is a mistake, please try again in a moment.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const openTerms = async () => {
    const url = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open Terms of Use.');
    }
  };

  const openPrivacy = async () => {
    const url = 'https://soberdailies.com/privacy';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open Privacy Policy.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f172a', '#0b3b3b', '#0f172a']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Crown size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Start your free 7-day trial</Text>
            <Text style={styles.subtitle}>Full access to Sober Dailies. Cancel anytime.</Text>
          </View>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <ShieldCheck size={18} color="#cbd5e1" />
              <Text style={styles.benefitText}>Everything included — reflections, chat, gratitude, and more.</Text>
            </View>
            <View style={styles.benefitRow}>
              <ShieldCheck size={18} color="#cbd5e1" />
              <Text style={styles.benefitText}>7-day free trial via App Store / Play Store.</Text>
            </View>
            <View style={styles.benefitRow}>
              <ShieldCheck size={18} color="#cbd5e1" />
              <Text style={styles.benefitText}>Restore purchases anytime.</Text>
            </View>
          </View>

          {(isLoading || isPurchasing || isRestoring) && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>
                {isRestoring ? 'Restoring…' : isPurchasing ? 'Processing…' : 'Loading…'}
              </Text>
            </View>
          )}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.8}>
                <RefreshCw size={16} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttons}>
            {!!yearlyPkg && (
              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || isPurchasing || isRestoring) && styles.buttonDisabled]}
                disabled={isLoading || isPurchasing || isRestoring}
                onPress={() => handleBuy(yearlyPkg)}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonTitle}>Continue Yearly</Text>
                <Text style={styles.primaryButtonSub}>{formatPackagePriceLine(yearlyPkg)} after trial</Text>
              </TouchableOpacity>
            )}

            {!!monthlyPkg && (
              <TouchableOpacity
                style={[styles.secondaryButton, (isLoading || isPurchasing || isRestoring) && styles.buttonDisabled]}
                disabled={isLoading || isPurchasing || isRestoring}
                onPress={() => handleBuy(monthlyPkg)}
                activeOpacity={0.9}
              >
                <Text style={styles.secondaryButtonTitle}>Continue Monthly</Text>
                <Text style={styles.secondaryButtonSub}>{formatPackagePriceLine(monthlyPkg)} after trial</Text>
              </TouchableOpacity>
            )}

            {/* Fallback if RevenueCat offering doesn’t mark monthly/yearly as expected */}
            {!yearlyPkg && !monthlyPkg && otherPkgs.map((pkg: any) => (
              <TouchableOpacity
                key={pkg?.identifier || pkg?.product?.identifier || Math.random().toString(16)}
                style={[styles.secondaryButton, (isLoading || isPurchasing || isRestoring) && styles.buttonDisabled]}
                disabled={isLoading || isPurchasing || isRestoring}
                onPress={() => handleBuy(pkg)}
                activeOpacity={0.9}
              >
                <Text style={styles.secondaryButtonTitle}>{formatPackageLabel(pkg)}</Text>
                <Text style={styles.secondaryButtonSub}>{formatPackagePriceLine(pkg)} after trial</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isLoading || isPurchasing || isRestoring}
              activeOpacity={0.8}
            >
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link} onPress={openTerms}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={openPrivacy}>Privacy Policy</Text>
            .
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: adjustFontWeight('700', true),
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500', true),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    gap: 10,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: adjustFontWeight('500', true),
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: adjustFontWeight('500', true),
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: adjustFontWeight('500', true),
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
  },
  buttons: { gap: 12 },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonTitle: {
    color: '#06210f',
    fontSize: 16,
    fontWeight: adjustFontWeight('700', true),
    textAlign: 'center',
  },
  primaryButtonSub: {
    color: 'rgba(6, 33, 15, 0.85)',
    fontSize: 13,
    fontWeight: adjustFontWeight('600', true),
    textAlign: 'center',
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  secondaryButtonTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('700', true),
    textAlign: 'center',
  },
  secondaryButtonSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: adjustFontWeight('600', true),
    textAlign: 'center',
    marginTop: 4,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: 'rgba(255,255,255,0.85)',
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: adjustFontWeight('600', true),
  },
  buttonDisabled: { opacity: 0.6 },
  legalText: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontWeight: adjustFontWeight('700', true),
  },
});

