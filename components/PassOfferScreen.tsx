import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, RefreshCw, X } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { getPassSubscriptionOption, trialDaysFromSubscriptionOption } from '@/lib/subscriptionOffers';
import { claimAndroidPass } from '@/lib/passOffer';
import { fetchCreditStatus, setPendingAnnouncement } from '@/lib/creditsService';
import { scheduleTrialEndingReminder } from '@/lib/trialReminder';
import { logEvent } from '@/lib/analytics';

function isYearly(pkg: PurchasesPackage): boolean {
  const type = String(pkg.packageType || '').toUpperCase();
  const id = `${pkg.identifier} ${pkg.product?.identifier}`.toLowerCase();
  return type.includes('ANNUAL') || type.includes('YEAR') || id.includes('yearly') || pkg.identifier === '$rc_annual';
}

function claimErrorMessage(reason: string): string {
  if (reason === 'already_claimed') return 'This pass has already been claimed on another account.';
  if (reason === 'invalid_token') return 'This pass link is not valid. Ask your friend to send it again.';
  if (reason === 'legacy_pass') return 'This pass was opened using the retired code system. Ask the sender for a new pass.';
  if (reason === 'network') return 'We could not reach the pass service. Check your connection and try again.';
  return 'We could not prepare this pass. Please try again.';
}

export default function PassOfferScreen({
  token,
  onPurchased,
  onDismiss,
}: {
  token: string;
  onPurchased: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const {
    offerings,
    isLoading,
    error,
    refresh,
    purchasePassPackage,
    applyCustomerInfo,
  } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const offering = offerings?.all?.default ?? offerings?.current ?? null;
  const yearly = useMemo(
    () => (offering?.availablePackages ?? []).find(isYearly) ?? null,
    [offering],
  );
  const passOption = getPassSubscriptionOption(yearly);
  const trialDays = trialDaysFromSubscriptionOption(passOption);
  const trialText = trialDays === 90 ? 'First 3 months free' : trialDays ? `First ${trialDays} days free` : 'First 3 months free';
  const price = yearly?.product?.priceString ?? 'Annual price';

  const purchase = async () => {
    if (!yearly || !passOption || busy) return;
    setBusy(true);
    setClaimError(null);
    logEvent('pass_purchase_tapped', { platform: 'android' });
    try {
      const claim = await claimAndroidPass(token);
      if (!claim.success) {
        setClaimError(claimErrorMessage(claim.reason));
        logEvent('pass_claim_failed', { reason: claim.reason });
        return;
      }

      const info = await purchasePassPackage(yearly);
      if (!info) return; // Cancellation is intentionally quiet.

      await setPendingAnnouncement('annual');
      await scheduleTrialEndingReminder(info);
      fetchCreditStatus();
      applyCustomerInfo(info);
      logEvent('pass_purchase_succeeded', { platform: 'android' });
      await onPurchased();
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    setClaimError(null);
    try { await refresh(); } finally { setRetrying(false); }
  };

  const offerUnavailable = !isLoading && (!yearly || !passOption);
  const processing = busy || retrying || isLoading;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Pressable
          style={styles.close}
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color={c.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.giftCircle}>
          <Gift size={28} color={colors.roseDark} strokeWidth={2} />
        </View>
        <Text style={styles.eyebrow}>A PASS FROM A FRIEND</Text>
        <Text style={styles.title}>Your pass is ready</Text>

        <View style={styles.offerCard}>
          <Text style={styles.plan}>ANNUAL SUBSCRIPTION</Text>
          <Text style={styles.price}>{price}/year</Text>
          <Text style={styles.trial}>{trialText}</Text>
          <Text style={styles.renewal}>
            Google Play will confirm the free period and annual renewal before your subscription begins.
          </Text>
        </View>

        {offerUnavailable ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>This offer isn’t available yet</Text>
            <Text style={styles.unavailableBody}>
              If this account has already had the annual subscription, it cannot use a pass. Otherwise, try refreshing.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={retry} disabled={retrying}>
              {retrying ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
              <Text style={styles.secondaryButtonText}>Refresh offer</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.primaryButton, processing && styles.disabled]}
            onPress={purchase}
            disabled={processing || !yearly || !passOption}
            accessibilityRole="button"
          >
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue to Google Play</Text>}
          </Pressable>
        )}

        {!!claimError && <Text style={styles.error}>{claimError}</Text>}
        {!claimError && !!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.finePrint}>Renews annually until canceled. Manage or cancel in Google Play.</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' },
    headerSpacer: { flex: 1 },
    close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 44 },
    giftCircle: { width: 58, height: 58, borderRadius: 29, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(196,108,124,0.16)' : '#F8E8EB', marginBottom: 14 },
    eyebrow: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.5, color: colors.roseDark, textAlign: 'center' },
    title: { fontFamily: fontFamily.displayBold, fontSize: 31, lineHeight: 36, letterSpacing: -0.6, color: c.text, textAlign: 'center', marginTop: 8, marginBottom: 22 },
    offerCard: { backgroundColor: c.surface, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 22, paddingVertical: 24, alignItems: 'center', ...shadows.md },
    plan: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.3, color: c.textMuted },
    price: { fontFamily: fontFamily.displayBold, fontSize: 36, lineHeight: 42, letterSpacing: -0.8, color: c.text, marginTop: 8 },
    trial: { fontFamily: fontFamily.semiBold, fontSize: 17, color: colors.primaryDark, marginTop: 8 },
    renewal: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 14 },
    primaryButton: { minHeight: 56, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20, ...shadows.md },
    primaryButtonText: { fontFamily: fontFamily.semiBold, fontSize: 17, color: '#fff' },
    disabled: { opacity: 0.55 },
    unavailable: { marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 18, alignItems: 'center' },
    unavailableTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, textAlign: 'center' },
    unavailableBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 7 },
    secondaryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, marginTop: 14 },
    secondaryButtonText: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: colors.primary },
    error: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: colors.roseDark, textAlign: 'center', marginTop: 14 },
    finePrint: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, color: c.textMuted, textAlign: 'center', marginTop: 14, paddingHorizontal: 10 },
  });
};
