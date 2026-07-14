// Custom RN paywall (replaces RevenueCat's hosted Paywall UI). Matches the
// "Your first week is free" design: trial timeline (Today / Day 5 / Day 7),
// a select-a-plan-then-one-CTA selector, and a footer that includes a
// "Have a code?" entry wired straight into our Pass It On gift redemption
// (redeemGiftCode → Supabase). Purchases/entitlements still run through
// react-native-purchases via useSubscription — only the UI is ours.
//
// Rendered as the paywall gate in app/_layout.tsx: there's no navigator mounted
// behind the gate, so "Have a code?" opens redemption as a Modal (not a route),
// and a successful redeem/purchase flips isPremium via refresh()/applyCustomerInfo
// so the gate falls through to Today.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Check, Lock, RefreshCw, Star, X } from 'lucide-react-native';
import { type PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { redeemGiftCode, type RedeemReason } from '@/lib/giftService';
import { logEvent } from '@/lib/analytics';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://soberdailies.com/privacy';

// Decorative rail gradient stops (green → teal → lavender), matched to the design.
const RAIL_GREEN = '#86CBA6';
const RAIL_TEAL = '#74C7D3';
const RAIL_LAV = '#BCB3EA';
const CIRCLE = 56;       // timeline bead diameter
const RAIL_WIDTH = 38;   // rail runs behind the beads
const RAIL_FADE = 80;    // extra length past the last bead center, fading out below the star

// Shown in the no-trial (ineligible) view in place of the trial timeline.
const BENEFITS = [
  'Daily reflections & gratitude journal',
  'Big Book & Twelve & Twelve reader',
  'AI Sponsor conversations',
  'Speaker tapes & guided meditations',
  'Evening review & spot-check inventory',
];

// ── helpers ──────────────────────────────────────────────────────────────
const isYearlyPkg = (p: PurchasesPackage) => {
  const type = String(p?.packageType || '').toUpperCase();
  const id = String(p?.identifier || '').toLowerCase();
  return type.includes('ANNUAL') || type.includes('YEAR') || id === '$rc_annual';
};
const isMonthlyPkg = (p: PurchasesPackage) => {
  const type = String(p?.packageType || '').toUpperCase();
  const id = String(p?.identifier || '').toLowerCase();
  return type.includes('MONTH') || id === '$rc_monthly';
};

// "$0.83/mo" from an annual package — divide the numeric price by 12 and reuse
// the store's own currency symbol from priceString (avoids Intl in Hermes).
function perMonthFromYearly(pkg: PurchasesPackage | null): string {
  const price = (pkg?.product as any)?.price;
  const priceString = pkg?.product?.priceString || '';
  if (typeof price !== 'number' || price <= 0) return priceString;
  const symbol = priceString.replace(/[0-9.,\s ]/g, '') || '$';
  const symbolBefore = priceString.trim().indexOf(symbol) === 0;
  const num = (price / 12).toFixed(2);
  return symbolBefore ? `${symbol}${num}` : `${num}${symbol}`;
}

function savingsPct(monthly: PurchasesPackage | null, yearly: PurchasesPackage | null): number | null {
  const m = (monthly?.product as any)?.price ?? 0;
  const y = (yearly?.product as any)?.price ?? 0;
  if (m <= 0 || y <= 0) return null;
  const pct = Math.round(((m - y / 12) / m) * 100);
  return pct > 0 ? pct : null;
}

interface PaywallScreenProps {
  onDismiss?: () => void;
  // QA preview (Debug Console): always allow closing, and force the trial vs
  // no-trial layout instead of deriving it from real store eligibility.
  preview?: boolean;
  forceTrial?: boolean;
}

export default function PaywallScreen({ onDismiss, preview, forceTrial }: PaywallScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { offerings, isLoading, error, purchasePackage, restorePurchases, refresh, applyCustomerInfo, trialEligible } = useSubscription();

  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  // Measured top of each timeline row (relative to the card) so the continuous
  // gradient rail can be positioned to pass through the circle centers exactly.
  const [rowY, setRowY] = useState<number[]>([]);

  const offering = offerings?.all?.['default'] ?? offerings?.current ?? null;
  const packages = offering?.availablePackages ?? [];

  const { yearly, monthly, save } = useMemo(() => {
    const y = packages.find(isYearlyPkg) ?? null;
    const m = packages.find(isMonthlyPkg) ?? null;
    return { yearly: y, monthly: m, save: savingsPct(m, y) };
  }, [packages]);

  const chosen = selected === 'yearly' ? (yearly ?? monthly) : (monthly ?? yearly);

  // Trial vs no-trial view. Eligibility is resolved early in the provider (during
  // onboarding), so it's already known by the time the gate renders — no flash.
  // Treat "not yet resolved" (null) as trial (the common new-user case). A QA
  // preview can force either layout.
  const showTrial = forceTrial !== undefined ? forceTrial : trialEligible !== false;

  // White beads with a colored ring matching the rail at that point.
  const STEPS = [
    {
      key: 'today',
      icon: <Lock size={23} color="#2E7A5F" strokeWidth={2.2} />,
      ring: RAIL_GREEN,
      title: 'Today',
      body: 'Everything unlocks — your dailies, literature, speaker tapes, your AI sponsor, and more.',
    },
    {
      key: 'day5',
      icon: <Bell size={22} color={colors.primaryDark} strokeWidth={2} fill={colors.primaryDark} />,
      ring: RAIL_TEAL,
      title: 'Day 5',
      body: "We'll notify you that your trial is ending soon.",
    },
    {
      key: 'day7',
      icon: <Star size={22} color={colors.primary} strokeWidth={2} fill={colors.primary} />,
      ring: RAIL_LAV,
      title: 'Day 7',
      body: 'Your subscription starts. Cancel before then and you pay nothing.',
    },
  ];

  const buy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    logEvent('paywall_purchase_tapped', { plan: selected });
    try {
      const info = await purchasePackage(chosen);
      if (info) applyCustomerInfo(info); // flips isPremium next render → gate drops
      refresh();
    } catch {
      // RC surfaces user-cancel as a throw; nothing to do.
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    logEvent('paywall_restore_tapped');
    try {
      const info = await restorePurchases();
      if (info?.entitlements.active?.premium) {
        applyCustomerInfo(info);
        refresh();
      } else {
        Alert.alert('No active subscription', "We couldn't find a purchase to restore on this account. If you have a code, tap “Have a code?”.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const processing = isLoading || busy || restoring;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {(preview || __DEV__) && onDismiss && (
          <Pressable style={styles.close} onPress={onDismiss} hitSlop={10}>
            <X size={24} color={c.textMuted} strokeWidth={2} />
          </Pressable>
        )}

        <Text style={styles.title}>{showTrial ? 'Your first week is free' : 'Unlock everything'}</Text>
        <Text style={styles.subtitle}>
          {showTrial
            ? 'Your program is set up and waiting. Start the trial to open it.'
            : 'Get full access to every tool in Sober Dailies.'}
        </Text>

        {/* No-trial (ineligible) view — benefits list instead of the trial timeline */}
        {!showTrial && (
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <View style={styles.benefitCheck}><Check size={13} color="#fff" strokeWidth={3} /></View>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Trial timeline — continuous gradient rail behind white bead circles */}
        {showTrial && (
        <View style={styles.timeline}>
          {rowY[0] != null && rowY[1] != null && rowY[2] != null && (() => {
            const height = rowY[2] - rowY[0] + RAIL_FADE;
            return (
              <LinearGradient
                colors={[RAIL_GREEN, RAIL_TEAL, RAIL_LAV, 'rgba(188,179,234,0)']}
                // Stops pinned to the measured circle centers; last one fades out
                // below the star bead.
                locations={[0, (rowY[1] - rowY[0]) / height, (rowY[2] - rowY[0]) / height, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
                style={[styles.rail, { top: rowY[0] + CIRCLE / 2, height }]}
              />
            );
          })()}
          {STEPS.map((s, i) => (
            <View
              key={s.key}
              style={[styles.step, i < STEPS.length - 1 && styles.stepGap]}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setRowY((prev) => (prev[i] === y ? prev : Object.assign([...prev], { [i]: y })));
              }}
            >
              <View style={styles.iconCol}>
                <View style={[styles.circle, { borderColor: s.ring }]}>{s.icon}</View>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
        )}

        {/* Error / loading for packages */}
        {!!error && !packages.length && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={refresh}>
              <RefreshCw size={15} color={colors.primary} strokeWidth={2} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {isLoading && !packages.length && (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        )}

        {/* Plan selector */}
        {!!packages.length && (
          <View style={styles.plans}>
            {!!yearly && (
              <Pressable style={[styles.plan, selected === 'yearly' && styles.planOn]} onPress={() => setSelected('yearly')}>
                {save != null && (
                  <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE {save}%</Text></View>
                )}
                <View style={styles.planLeft}>
                  <Radio on={selected === 'yearly'} />
                  <Text style={styles.planName}>Yearly</Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{perMonthFromYearly(yearly)}/mo</Text>
                  <Text style={styles.planSub}>{yearly.product.priceString}/yr</Text>
                </View>
              </Pressable>
            )}
            {!!monthly && (
              <Pressable style={[styles.plan, selected === 'monthly' && styles.planOn]} onPress={() => setSelected('monthly')}>
                <View style={styles.planLeft}>
                  <Radio on={selected === 'monthly'} />
                  <Text style={styles.planName}>Monthly</Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planSubOnly}>{monthly.product.priceString}/mo</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* CTA */}
        <Pressable style={[styles.cta, (!chosen || processing) && styles.ctaDisabled]} onPress={buy} disabled={!chosen || processing}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{showTrial ? 'Start my free week' : 'Subscribe'}</Text>}
        </Pressable>

        {/* Have a code? */}
        <Pressable onPress={() => setShowRedeem(true)} style={styles.haveCode} hitSlop={8}>
          <Text style={styles.haveCodeText}>Have a code?</Text>
        </Pressable>

        {/* Footer links */}
        <View style={styles.footer}>
          <Pressable onPress={restore} disabled={restoring}><Text style={styles.footerLink}>{restoring ? 'Checking…' : 'Restore Purchases'}</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.footerLink}>Terms</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.footerLink}>Privacy</Text></Pressable>
        </View>
      </ScrollView>

      <HaveACodeModal
        visible={showRedeem}
        onClose={() => setShowRedeem(false)}
        onRedeemed={() => { setShowRedeem(false); refresh(); }}
      />
    </SafeAreaView>
  );
}

function Radio({ on }: { on: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.radio, on && styles.radioOn]}>
      {on && <Check size={13} color="#fff" strokeWidth={3} />}
    </View>
  );
}

// ── "Have a code?" redemption — bottom sheet over the gate ─────────────────
function HaveACodeModal({ visible, onClose, onRedeemed }: { visible: boolean; onClose: () => void; onRedeemed: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRedeem = code.replace(/[^A-Z0-9]/gi, '').length >= 8 && !busy;

  const submit = async () => {
    if (!canRedeem) return;
    setBusy(true);
    setError(null);
    logEvent('gift_redeem_attempted', { from: 'paywall' });
    try {
      const res = await redeemGiftCode(code);
      if (res.success) {
        logEvent('gift_redeem_succeeded', { from: 'paywall' });
        onRedeemed();
      } else {
        logEvent('gift_redeem_failed', { from: 'paywall', reason: res.reason });
        setError(redeemMessage(res.reason, res.message));
      }
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setCode(''); setError(null); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.sheetBackdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Have a code?</Text>
          <Pressable onPress={close} hitSlop={8} style={styles.sheetClose}><X size={18} color={c.textSecondary} strokeWidth={2} /></Pressable>
        </View>
        <Text style={styles.sheetBody}>If someone gave you a Sober Dailies code, enter it here to unlock everything for three months.</Text>
        <TextInput
          style={[styles.codeField, error && styles.codeFieldError]}
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); if (error) setError(null); }}
          placeholder="SD-XXXX-XXXX"
          placeholderTextColor={c.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
          editable={!busy}
          textAlign="center"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {!!error && <Text style={styles.codeError}>{error}</Text>}
        <Pressable style={[styles.sheetCta, !canRedeem && styles.ctaDisabled]} onPress={submit} disabled={!canRedeem}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetCtaText}>Redeem</Text>}
        </Pressable>
        <Text style={styles.sheetNote}>Nothing to pay. Nothing renews.</Text>
      </View>
    </Modal>
  );
}

function redeemMessage(reason: RedeemReason | undefined, fallback: string): string {
  if (reason === 'already_redeemed') return 'This code has already been used. Check with the person who gave it to you — they may have another.';
  if (reason === 'invalid') return "That code isn't valid. Double-check the letters and numbers, then try again.";
  return fallback;
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 },
    close: { alignSelf: 'flex-end', width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

    title: { fontFamily: fontFamily.displayBold, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: c.text },
    subtitle: { fontFamily: fontFamily.regularItalic, fontSize: 18, lineHeight: 25, color: c.textSecondary, marginTop: 14 },

    // timeline card
    timeline: { position: 'relative', overflow: 'hidden', marginTop: 26, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, paddingVertical: 24, paddingHorizontal: 22, ...shadows.sm, ...darkCard },
    rail: { position: 'absolute', left: 22 + CIRCLE / 2 - RAIL_WIDTH / 2, width: RAIL_WIDTH, borderTopLeftRadius: RAIL_WIDTH / 2, borderTopRightRadius: RAIL_WIDTH / 2, zIndex: 0 },
    step: { flexDirection: 'row', gap: 16 },
    stepGap: { marginBottom: 20 },
    iconCol: { width: CIRCLE, alignItems: 'center' },
    circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, borderWidth: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 2, ...shadows.sm },
    stepText: { flex: 1, paddingTop: 13 },
    stepTitle: { fontFamily: fontFamily.displayBold, fontSize: 21, letterSpacing: -0.3, color: c.text },
    stepBody: { fontFamily: fontFamily.regular, fontSize: 15.5, lineHeight: 22, color: c.textSecondary, marginTop: 4 },

    // no-trial benefits list
    benefits: { marginTop: 26, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, paddingVertical: 20, paddingHorizontal: 20, gap: 16, ...shadows.sm, ...darkCard },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    benefitCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    benefitText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 15.5, lineHeight: 21, color: c.text },

    // error / retry
    errorCard: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    errorText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
    retryText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },

    // plans
    plans: { marginTop: 26, gap: 12 },
    plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, ...darkCard },
    planOn: { borderWidth: 2, borderColor: colors.primary },
    planLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    planName: { fontFamily: fontFamily.bold, fontSize: 18, color: c.text },
    planRight: { alignItems: 'flex-end' },
    planPrice: { fontFamily: fontFamily.bold, fontSize: 18, color: c.text },
    planSub: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 2 },
    planSubOnly: { fontFamily: fontFamily.regular, fontSize: 16, color: c.textMuted },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    saveBadge: { position: 'absolute', top: -11, left: '50%', marginLeft: -46, width: 92, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 4, alignItems: 'center' },
    saveBadgeText: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.6, color: '#fff' },

    // cta
    cta: { marginTop: 22, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 18, color: '#fff' },

    haveCode: { alignSelf: 'center', marginTop: 18, paddingVertical: 6 },
    haveCodeText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
    footerLink: { fontFamily: fontFamily.medium, fontSize: 13.5, color: c.textMuted },
    footerDot: { color: c.textMuted, fontSize: 13.5 },

    // have-a-code sheet
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? c.overlay : 'rgba(20,18,14,0.4)' },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: isDark ? c.surface : c.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 34, ...(isDark ? { borderWidth: 1, ...darkCard } : null) },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 20, letterSpacing: -0.3, color: c.text },
    sheetClose: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    sheetBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textSecondary, marginTop: 10 },
    codeField: { fontFamily: fontFamily.semiBold, fontSize: 19, letterSpacing: 2.5, color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 16, marginTop: 16, ...shadows.sm },
    codeFieldError: { borderWidth: 1.5, borderColor: colors.rose ?? '#B55A68' },
    codeError: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: 'center', marginTop: 12 },
    sheetCta: { marginTop: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sheetCtaText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: '#fff' },
    sheetNote: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 12 },
  });
};
