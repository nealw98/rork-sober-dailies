// Custom RN paywall (replaces RevenueCat's hosted Paywall UI). Matches the
// "Your first week is free" design: trial timeline (Today / Day 5 / Day 7),
// a select-a-plan-then-one-CTA selector, and store-native subscription
// purchases through react-native-purchases.
//
// Rendered as the paywall gate in app/_layout.tsx. A successful purchase flips
// isPremium via applyCustomerInfo so the gate falls through to Today.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Check, Lock, MessageCircle, RefreshCw, SlidersHorizontal, Star, TrendingUp, Wrench, X } from 'lucide-react-native';
import { type PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { fetchCreditStatus, setPendingAnnouncement } from '@/lib/creditsService';
import { scheduleTrialEndingReminder } from '@/lib/trialReminder';
import { logEvent } from '@/lib/analytics';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { getNormalSubscriptionOption, trialDaysFromSubscriptionOption } from '@/lib/subscriptionOffers';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://soberdailies.com/privacy';

// Decorative rail gradient stops (green → teal → lavender), matched to the design.
const RAIL_GREEN = '#86CBA6';
const RAIL_TEAL = '#74C7D3';
const RAIL_LAV = '#BCB3EA';
const CIRCLE = 48;       // timeline bead diameter
const RAIL_WIDTH = 32;   // rail runs behind the beads
const RAIL_FADE = 72;    // extra length past the last bead center, fading out below the star
const CARD_PAD_H = 20;   // timeline card horizontal padding (rail left aligns to this)
const TILE = 48;         // no-trial benefit icon circle (matches the trial bead)
const BENEFIT_FADE = 56; // rail length past the last tile center, fading out

// No-trial rail: the SAME green → teal → lavender sweep as the trial rail,
// sampled at the four tile centers.
const BENEFIT_RAIL = ['#86CBA6', '#7AC8C4', '#8CC0DB', '#BCB3EA'];

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

// Trial length comes from the STORE, not from us: the offer is configured in
// App Store Connect / Play, and copy that contradicts the sheet the user is
// about to sign is a broken promise. Returns null when the package carries no
// free intro period (or the store hasn't answered yet).
function trialDaysFrom(pkg: PurchasesPackage | null): number | null {
  const intro = (pkg?.product as any)?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = Number(intro.periodNumberOfUnits ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (String(intro.periodUnit || '').toUpperCase()) {
    case 'DAY': return n;
    case 'WEEK': return n * 7;
    case 'MONTH': return n * 30;
    case 'YEAR': return n * 365;
    default: return null;
  }
}

// Deliberately says nothing about price or trial. 3.1.2(c) requires every
// pricing element — free trial included — to sit subordinate in position and
// size to the billed amount, and the old headline ("Your first week is free")
// was the largest thing on the screen by some margin. Making the title a
// direction rather than a claim removes it from that comparison entirely,
// leaving $19.99/yr as the most conspicuous price without shrinking anything.
// The trial is still stated three times below: the timeline, the CTA, and the
// billing disclosure.
const PAYWALL_TITLE = 'Pick your plan and start today';

// Length-neutral on purpose. Someone who is ineligible gets NO intro offer back
// from the store, so trialLen is null and any specific wording ("your free week
// is up") would be a guess from the current default — wrong for anyone who took
// a 14-day or one-month promo. This is the only version we can state truthfully,
// and it covers every trial length we might ever configure.
const TRIAL_OVER_TITLE = 'Your free trial is up';

function savingsPct(monthly: PurchasesPackage | null, yearly: PurchasesPackage | null): number | null {
  const m = (monthly?.product as any)?.price ?? 0;
  const y = (yearly?.product as any)?.price ?? 0;
  if (m <= 0 || y <= 0) return null;
  const pct = Math.round(((m - y / 12) / m) * 100);
  return pct > 0 ? pct : null;
}

interface PaywallScreenProps {
  // Tapping the close (X). Shown in EVERY build when provided — this is the
  // visible dismiss Play's Subscriptions policy asks for, not a dev shortcut.
  onDismiss?: () => void;
  // __DEV__ only: its own control on the LEFT, so the real close on the right
  // keeps a single unambiguous meaning. Jumps past the wall to the screens
  // behind it, so the rest of the flow is reachable on a simulator without a
  // sandbox purchase. Never rendered in a release build.
  onDevBypass?: () => void;
  // Escape hatch for a paywall that CANNOT SELL — offerings failed to load, so
  // there are no plans and the CTA is dead. Holding someone there achieves
  // nothing; this takes precedence over onDismiss when that state is reached.
  onUnavailableDismiss?: () => void;
  preview?: boolean;
  // Developer Console only: force either layout instead of deriving it from
  // real trial history, so both can be reviewed on one device.
  forceTrial?: boolean;
}

export default function PaywallScreen({ onDismiss, onDevBypass, onUnavailableDismiss, preview, forceTrial }: PaywallScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { offerings, isLoading, error, purchasePackage, restorePurchases, refresh, applyCustomerInfo, customerInfo, trialEligible, qaForceNewUser } = useSubscription();

  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState(false);
  // `error` is shared subscription state — a background refresh can set it with
  // no user action behind it. Only a purchase the user actually attempted earns
  // the message under the CTA, so gate on this rather than on `error` alone.
  const [purchaseFailed, setPurchaseFailed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Measured top of each timeline row (relative to the card) so the continuous
  // gradient rail can be positioned to pass through the circle centers exactly.
  const [rowY, setRowY] = useState<number[]>([]);
  const [benefitY, setBenefitY] = useState<number[]>([]); // same, for the no-trial tiles

  const offering = offerings?.all?.['default'] ?? offerings?.current ?? null;
  const packages = offering?.availablePackages ?? [];

  const { yearly, monthly, save } = useMemo(() => {
    const y = packages.find(isYearlyPkg) ?? null;
    const m = packages.find(isMonthlyPkg) ?? null;
    return { yearly: y, monthly: m, save: savingsPct(m, y) };
  }, [packages]);

  const chosen = selected === 'yearly' ? (yearly ?? monthly) : (monthly ?? yearly);

  // A successful SDK response can still contain no product this UI can sell:
  // an empty/current-less offering, or packages other than annual/monthly. Log
  // the exact catalog shape once per shape so production diagnostics distinguish
  // a store/configuration problem from a transport failure.
  const offeringId = offering?.identifier ?? 'none';
  const packageIds = packages
    .map((p: PurchasesPackage) => `${p.identifier}:${String(p.packageType)}:${p.product?.identifier ?? 'no-product'}`)
    .join(',');
  React.useEffect(() => {
    if (isLoading || chosen) return;
    console.warn('[Paywall] No usable subscription plan', { offeringId, packageIds: packageIds || 'none' });
    logEvent('paywall_plans_unavailable', {
      offering_id: offeringId,
      package_ids: packageIds || 'none',
    });
  }, [isLoading, chosen, offeringId, packageIds]);

  // Structure decided 2026-08-13: the trial timeline, NOT a benefits list. The
  // What's Inside carousel sells one screen earlier, so a benefits list here
  // would restate it; the timeline instead answers the one question the
  // carousel can't ("what happens to my money"), and its final step carries the
  // Play-required "a subscription is required" disclosure. A benefits layout
  // existed once, for no-trial users, and was removed with that variant.
  //
  // One paywall for everyone: the trial offer. There is deliberately no
  // "already used your trial" variant — Play can't report eligibility before
  // purchase anyway (it always answers UNKNOWN), so an Android user who'd
  // already had a trial saw this screen regardless and the two layouts only
  // ever diverged on iOS. Both stores state the real terms in their own
  // purchase sheet, which is what a returning user is actually charged on.

  // Trial length comes from the store and drives the timeline/disclosure. The
  // title and CTA deliberately do not advertise the trial, keeping every trial
  // claim visually subordinate to the amount that will actually be billed.
  const normalTrialDays = (pkg: PurchasesPackage | null) => {
    if (!pkg) return null;
    return Platform.OS === 'android'
      ? trialDaysFromSubscriptionOption(getNormalSubscriptionOption(pkg))
      : trialDaysFrom(pkg);
  };
  const trialLen = chosen
    ? normalTrialDays(chosen)
    : (normalTrialDays(yearly) ?? normalTrialDays(monthly));

  // Has this person already used their free trial? If so the store bills them
  // the moment they subscribe, so promising a free week would be a lie.
  // Two signals, because neither covers both platforms on its own:
  //  · trialEligible === false — StoreKit's answer, iOS only (Play always
  //    reports UNKNOWN before purchase, so it never fires on Android).
  //  · any prior purchase on the account — works on both. An ACTIVE subscriber
  //    never reaches this screen, so history here means lapsed or expired.
  const usedTrial =
    trialEligible === false ||
    ((customerInfo as any)?.allPurchasedProductIdentifiers?.length ?? 0) > 0;
  const showTrial = forceTrial !== undefined ? forceTrial : (!usedTrial && trialLen !== null);
  // The reminder fires 48 h before expiry (lib/trialReminder.ts), clamped so it
  // can't land on or before day 1 of a very short trial.
  const trialEndDay = trialLen ?? 7;
  const warnDay = Math.min(Math.max(2, trialEndDay - 2), trialEndDay - 1);

  // White beads with a colored ring matching the rail at that point.
  const STEPS = [
    {
      key: 'today',
      icon: <Lock size={19} color="#2E7A5F" strokeWidth={2.2} />,
      ring: RAIL_GREEN,
      title: 'Today',
      body: 'Everything unlocks — your dailies, literature, speaker tapes, your AI sponsor, and more.',
    },
    {
      key: 'day5',
      icon: <Bell size={18} color={colors.primaryDark} strokeWidth={2} fill={colors.primaryDark} />,
      ring: RAIL_TEAL,
      title: `Day ${warnDay}`,
      body: "We'll notify you that your trial is ending soon.",
    },
    {
      key: 'day7',
      icon: <Star size={18} color={colors.primary} strokeWidth={2} fill={colors.primary} />,
      ring: RAIL_LAV,
      title: `Day ${trialEndDay}`,
      // Price comes from the chosen package, never hardcoded: the copy must not
      // contradict the sheet the user is about to sign. Falls back to the
      // priceless sentence while offerings are still loading.
      // "…is required to maintain access" is the Play Subscriptions disclosure
      // this screen was rejected for missing. It sits here rather than in the
      // subtitle because at Day 7 the subscription genuinely does begin —
      // saying it up front would imply the trial isn't already a subscription.
      body: chosen
        ? `Your subscription starts at ${chosen.product.priceString}/${selected === 'yearly' ? 'year' : 'month'} and is required to maintain access to the app. Cancel before then and you pay nothing.`
        : 'Your subscription starts and is required to maintain access to the app. Cancel before then and you pay nothing.',
    },
  ];

  // No-trial view — what the subscription buys, since there's no trial
  // countdown to show. Icons match the trial beads: white circle, bold colored
  // ring (BENEFIT_RAIL[i]), solid glyph.
  const BENEFITS = [
    {
      key: 'fits',
      icon: <SlidersHorizontal size={20} color={colors.primary} strokeWidth={2} fill={colors.primary} />,
      title: 'A practice that fits your life',
      body: 'Choose the daily habits that fit your program.',
    },
    {
      key: 'tool',
      icon: <Wrench size={19} color={colors.steelDark} strokeWidth={2} fill={colors.steelDark} />,
      title: 'The right tool at every step',
      body: 'Each daily action is paired with its tool — right when you need it.',
    },
    {
      key: 'sponsor',
      icon: <MessageCircle size={20} color={colors.tertiary} strokeWidth={2} fill={colors.tertiary} />,
      title: 'Never alone, day or night',
      body: 'An AI sponsor is always there to talk it through.',
    },
    {
      key: 'progress',
      icon: <TrendingUp size={21} color={colors.roseDark} strokeWidth={2.5} />,
      title: 'See your progress add up',
      body: 'Check off each action and watch your consistency grow, day by day.',
    },
  ];

  const buy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setPurchaseFailed(false);
    logEvent('paywall_purchase_tapped', { plan: selected });
    try {
      const info = await purchasePackage(chosen);
      if (info) {
        // Thank-you handoff (design handoff "gift surfaces" §1): this tree
        // dissolves the moment isPremium flips, so the designed sheet is
        // presented by Today on first mount via a pending flag — written
        // BEFORE applyCustomerInfo so the flag beats the gate drop.
        // fetchCreditStatus() mints the welcome grants server-side
        // (grant-on-read) and fills the badge cache in parallel.
        await setPendingAnnouncement(selected === 'yearly' ? 'annual' : 'monthly');
        // The timeline above promises a day-5 heads-up — schedule it (and ask
        // notification permission) while that promise is still on screen.
        await scheduleTrialEndingReminder(info);
        fetchCreditStatus();
        applyCustomerInfo(info); // flips isPremium next render → gate drops
      } else {
        // Null covers both a real failure and a plain cancellation; the two are
        // told apart by whether useSubscription left a message on `error`.
        setPurchaseFailed(true);
      }
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
        Alert.alert('No active subscription', "We couldn't find a purchase to restore on this account.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const retryPlans = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };

  const processing = isLoading || busy || restoring || retrying;

  // Availability is about having a product we can actually purchase, not just
  // whether the SDK threw. RevenueCat/store calls may succeed with an empty or
  // unsupported catalog, which must not render as a normal paywall with a dead
  // CTA and no explanation.
  const cannotSell = !isLoading && !chosen;
  const closeAction = cannotSell && onUnavailableDismiss ? onUnavailableDismiss : onDismiss;

  if (cannotSell) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.unavailablePage}>
          <View style={styles.header}>
            {__DEV__ && !!onDevBypass && (
              <Pressable
                style={styles.devPass}
                onPress={onDevBypass}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Developer: skip paywall"
              >
                <Text style={styles.devPassText}>DEV SKIP</Text>
              </Pressable>
            )}
            <View style={styles.flex} />
            {closeAction && (
              <Pressable
                style={styles.close}
                onPress={closeAction}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={24} color={c.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          <View style={styles.unavailableBody}>
            <View style={styles.unavailableIcon}>
              <RefreshCw size={25} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.unavailableTitle}>Plans temporarily unavailable</Text>
            <Text style={styles.unavailableText}>
              We couldn&apos;t load a subscription plan right now. Please try again in a moment.
            </Text>
            <Pressable
              style={[styles.unavailableRetry, retrying && styles.ctaDisabled]}
              onPress={retryPlans}
              disabled={retrying}
              accessibilityRole="button"
            >
              {retrying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <RefreshCw size={17} color="#fff" strokeWidth={2.2} />
                  <Text style={styles.unavailableRetryText}>Try again</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.unavailableRestore}
              onPress={restore}
              disabled={restoring}
              accessibilityRole="button"
            >
              <Text style={styles.unavailableRestoreText}>
                {restoring ? 'Checking purchases…' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Don't paint a variant we might have to swap. isLoading clears as soon as
  // offerings land, but eligibility resolves in a SEPARATE effect keyed on
  // those offerings — and on iOS that's an async StoreKit round-trip after it.
  // Rendering in the meantime shows "Your first week is free" and then rewrites
  // the title, the card and the CTA in front of the user, which reads as a bug.
  //
  // Bounded three ways so this can never hang: a forced preview knows its own
  // variant, an offerings failure resolves to the error card rather than
  // waiting forever, and Android settles synchronously with the offering.
  const variantResolved = forceTrial !== undefined || trialEligible !== null || !!error;
  if (!variantResolved) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.resolving}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header — close (X) on the RIGHT, where a dismiss belongs. Play
            rejected this screen for an "unclear or invisible dismiss button",
            so it renders in production wherever the caller supplies a way out;
            during first run that is a return to the start of onboarding.
            The dev pass sits on the left so the two never share a gesture. */}
        <View style={styles.header}>
          {__DEV__ && !!onDevBypass && (
            <Pressable
              style={styles.devPass}
              onPress={onDevBypass}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Developer: skip paywall"
            >
              <Text style={styles.devPassText}>DEV SKIP</Text>
            </Pressable>
          )}
          <View style={styles.flex} />
          {closeAction && (
            <Pressable
              style={styles.close}
              onPress={closeAction}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color={c.textMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* QA: the gate is only up because the Developer Console force-new-user
            flag is hiding grandfather/entitlement — say so, loudly, so a
            forced paywall is never mistaken for a real subscription bug. */}
        {qaForceNewUser && !preview && (
          <View style={styles.qaBanner}>
            <Text style={styles.qaBannerText}>
              QA: Force New-User is ON — your real subscription is hidden and this paywall will return every launch. Turn it off in Settings → Developer Console.
            </Text>
          </View>
        )}

        <Text style={styles.title}>{showTrial ? PAYWALL_TITLE : TRIAL_OVER_TITLE}</Text>
        {/* Trial variant carries no subtitle: the timeline sits directly below
            and already covers what unlocks, when billing starts and how to
            cancel, so a line between the two only repeated it. The no-trial
            face has no timeline, so its line still has to state the
            requirement itself. */}
        {!showTrial && (
          <Text style={styles.subtitle}>Subscribe to access the app.</Text>
        )}

        {/* No-trial view — the benefits list stands in for the timeline. */}
        {!showTrial && (
          <View style={styles.benefits}>
            {benefitY[0] != null && benefitY[1] != null && benefitY[2] != null && benefitY[3] != null && (() => {
              const height = benefitY[3] - benefitY[0] + BENEFIT_FADE;
              return (
                <LinearGradient
                  colors={[BENEFIT_RAIL[0], BENEFIT_RAIL[1], BENEFIT_RAIL[2], BENEFIT_RAIL[3], 'rgba(188,179,234,0)']}
                  locations={[0, (benefitY[1] - benefitY[0]) / height, (benefitY[2] - benefitY[0]) / height, (benefitY[3] - benefitY[0]) / height, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  pointerEvents="none"
                  style={[styles.benefitRail, { top: benefitY[0] + TILE / 2, height }]}
                />
              );
            })()}
            {BENEFITS.map((b, i) => (
              <View
                key={b.key}
                style={styles.benefitRow}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  setBenefitY((prev) => (prev[i] === y ? prev : Object.assign([...prev], { [i]: y })));
                }}
              >
                <View style={[styles.benefitTile, { borderColor: BENEFIT_RAIL[i] }]}>{b.icon}</View>
                <View style={styles.flex}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitBody}>{b.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Trial timeline — continuous gradient rail behind white bead circles.
            Hidden once the trial has been used: there is no countdown left to
            show, and the "Subscribe to use the app" line above already carries
            the Play disclosure that the timeline carried for trial users. */}
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

        {/* Error / loading for packages. This card is the LOAD failure — no
            plans to show, so Retry is the only useful action. A failure during
            a purchase has plans on screen and is reported under the CTA
            instead; see purchaseError below. */}
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
              <Pressable style={[styles.plan, selected === 'yearly' && styles.planOn]} onPress={() => { setSelected('yearly'); setPurchaseFailed(false); }}>
                {save != null && (
                  <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE {save}%</Text></View>
                )}
                <View style={styles.planLeft}>
                  <Radio on={selected === 'yearly'} />
                  <Text style={styles.planName}>Yearly</Text>
                </View>
                {/* The actual charge and its actual period lead; the derived
                    per-month figure is secondary. App Review rejected the
                    reverse (a big "$1.67/mo" over a small "$19.99/yr") on the
                    annual plan — the price shown must be the price billed. */}
                <View style={styles.planRight}>
                  <Text style={styles.planPrice}>{yearly.product.priceString}/yr</Text>
                  <Text style={styles.planSub}>{perMonthFromYearly(yearly)}/mo</Text>
                </View>
              </Pressable>
            )}
            {!!monthly && (
              <Pressable style={[styles.plan, selected === 'monthly' && styles.planOn]} onPress={() => { setSelected('monthly'); setPurchaseFailed(false); }}>
                {/* Monthly's label and price move together: both muted when the
                    row is the road not taken, both full ink when it's chosen.
                    (Yearly is the default pick and always reads full-strength.) */}
                <View style={styles.planLeft}>
                  <Radio on={selected === 'monthly'} />
                  <Text style={[styles.planName, selected !== 'monthly' && styles.planTextMuted]}>Monthly</Text>
                </View>
                <View style={styles.planRight}>
                  <Text style={[styles.planSubOnly, selected === 'monthly' && styles.planTextInk]}>
                    {monthly.product.priceString}/mo
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* CTA — kept directly under the plans so the action cluster stays
            together with no dead space. */}
        <Pressable style={[styles.cta, (!chosen || processing) && styles.ctaDisabled]} onPress={buy} disabled={!chosen || processing}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{showTrial ? 'Continue' : 'Subscribe'}</Text>}
        </Pressable>

        {/* A failed purchase used to say nothing at all: the card above only
            renders when there are NO packages, so with plans on screen the
            store's reason was set on `error` and never drawn — the spinner
            simply stopped and the button looked dead. That's how "you're
            already subscribed to this" read as a broken app. Report it against
            the CTA that failed. User cancellations never land here;
            useSubscription maps those to a null error on purpose. */}
        {purchaseFailed && !!error && (
          <Text style={styles.purchaseError} accessibilityLiveRegion="polite">{error}</Text>
        )}

        {/* Billing disclosure. The timeline says when billing starts but never
            what gets charged, and App Review read that omission as an
            undisclosed renewal price (3.1.2(c)) — so the amount and the period
            are spelled out here, next to the button that commits to them. */}
        {!!chosen && (
          <Text style={styles.billing}>
            {showTrial
              ? `Free for ${trialLen ?? 7} days, then ${chosen.product.priceString}/${selected === 'yearly' ? 'year' : 'month'}. Renews automatically until cancelled. Cancel anytime in Settings.`
              : `Billed ${chosen.product.priceString}/${selected === 'yearly' ? 'year' : 'month'}. Renews automatically until cancelled. Cancel anytime in Settings.`}
          </Text>
        )}

        {/* Footer links */}
        <View style={styles.footer}>
          <Pressable onPress={restore} disabled={restoring}><Text style={styles.footerLink}>{restoring ? 'Checking…' : 'Restore Purchases'}</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.footerLink}>Terms</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.footerLink}>Privacy</Text></Pressable>
        </View>
      </ScrollView>

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

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'center' },
    close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    resolving: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    unavailablePage: { flex: 1, paddingHorizontal: 26, paddingTop: 20, paddingBottom: 32 },
    unavailableBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 52 },
    unavailableIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(45,148,148,0.16)' : '#E8F5F5', marginBottom: 20 },
    unavailableTitle: { fontFamily: fontFamily.displayBold, fontSize: 27, lineHeight: 32, letterSpacing: -0.5, color: c.text, textAlign: 'center' },
    unavailableText: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textSecondary, textAlign: 'center', maxWidth: 320, marginTop: 10 },
    unavailableRetry: { minWidth: 190, minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, paddingHorizontal: 24, ...shadows.sm },
    unavailableRetryText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: '#fff' },
    unavailableRestore: { paddingVertical: 10, paddingHorizontal: 16, marginTop: 8 },
    unavailableRestoreText: { fontFamily: fontFamily.medium, fontSize: 14, color: c.textMuted, textDecorationLine: 'underline' },
    // Deliberately ugly and labelled — this must never be mistaken for shipping UI.
    devPass: { height: 32, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    devPassText: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1, color: c.textMuted },

    qaBanner: { backgroundColor: isDark ? 'rgba(251,146,60,0.16)' : '#FEF0E2', borderWidth: 1, borderColor: isDark ? 'rgba(251,146,60,0.5)' : '#F0B27A', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 },
    qaBannerText: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18, color: isDark ? '#FDBA74' : '#9A5B22' },

    // Inset to CARD_PAD_H so the header starts on the same column as the text
    // inside the cards, not on their outer border. Flush with the border, 32pt
    // display type reads as running to the screen edge while every line beneath
    // it sits 20pt further in — the title looked wider than the cards because
    // it was wider than everything they contain.
    title: { fontFamily: fontFamily.displayBold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: c.text, paddingHorizontal: CARD_PAD_H },
    subtitle: { fontFamily: fontFamily.serifItalic, fontSize: 16, lineHeight: 23, color: c.textSecondary, marginTop: 10, paddingHorizontal: CARD_PAD_H },

    // Sits directly under the title so it is read before the plans, not after.
    // Tinted card rather than muted footnote type — a reviewer looking for the
    // disclosure has to be able to find it at a glance.
    benefits: { position: 'relative', overflow: 'hidden', marginTop: 30, backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, paddingVertical: 22, paddingHorizontal: CARD_PAD_H, gap: 20, ...shadows.sm, ...darkCard },
    benefitRail: { position: 'absolute', left: CARD_PAD_H + TILE / 2 - RAIL_WIDTH / 2, width: RAIL_WIDTH, borderTopLeftRadius: RAIL_WIDTH / 2, borderTopRightRadius: RAIL_WIDTH / 2, zIndex: 0 },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    benefitTile: { width: TILE, height: TILE, borderRadius: TILE / 2, borderWidth: 3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 2, ...shadows.sm },
    benefitTitle: { fontFamily: fontFamily.bold, fontSize: 16.5, letterSpacing: -0.2, color: c.text },
    benefitBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 2 },

    timeline: { position: 'relative', overflow: 'hidden', marginTop: 30, backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, paddingVertical: 22, paddingHorizontal: CARD_PAD_H, ...shadows.sm, ...darkCard },
    rail: { position: 'absolute', left: CARD_PAD_H + CIRCLE / 2 - RAIL_WIDTH / 2, width: RAIL_WIDTH, borderTopLeftRadius: RAIL_WIDTH / 2, borderTopRightRadius: RAIL_WIDTH / 2, zIndex: 0 },
    step: { flexDirection: 'row', gap: 15 },
    stepGap: { marginBottom: 22 },
    iconCol: { width: CIRCLE, alignItems: 'center' },
    circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, borderWidth: 3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 2, ...shadows.sm },
    stepText: { flex: 1, paddingTop: 10 },
    stepTitle: { fontFamily: fontFamily.displayBold, fontSize: 18, letterSpacing: -0.2, color: c.text },
    stepBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 3 },

    // no-trial benefits — tinted icon tiles inside the same card as the trial timeline
    errorCard: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    errorText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    purchaseError: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: colors.destructive, textAlign: 'center', marginTop: 10 },
    retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
    retryText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },

    // plans
    plans: { marginTop: 30, gap: 11 },
    plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, ...darkCard },
    // borderTopColor must be set explicitly: the darkCard spread on `plan`
    // pins a lighter top edge, and the specific side color beats borderColor.
    planOn: { borderWidth: 2, borderColor: colors.primary, borderTopColor: colors.primary },
    planLeft: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    planName: { fontFamily: fontFamily.bold, fontSize: 16.5, color: c.text },
    planRight: { alignItems: 'flex-end' },
    planPrice: { fontFamily: fontFamily.bold, fontSize: 16.5, color: c.text },
    planSub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    // Monthly's only price line — matches Yearly's headline price exactly (size
    // and weight) so the two rows read as the same kind of thing. Both are
    // billed amounts; only the derived per-month figure sits below them.
    planSubOnly: { fontFamily: fontFamily.bold, fontSize: 16.5, color: c.textMuted },
    // Monthly row only — the label and price follow the selection together.
    planTextMuted: { color: c.textMuted },
    planTextInk: { color: c.text },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    saveBadge: { position: 'absolute', top: -10, left: '50%', marginLeft: -46, width: 92, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 4, alignItems: 'center' },
    saveBadgeText: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 0.6, color: '#fff' },

    // cta — sits just below the plans (tighter than the old 28 so there's no
    // dead space between Monthly and the CTA).
    cta: { marginTop: 20, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 16.5, color: '#fff' },

    billing: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 10 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
    footerLink: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textMuted },
    footerDot: { color: c.textMuted, fontSize: 13 },

  });
};
