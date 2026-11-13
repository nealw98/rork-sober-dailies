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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Bell, BookOpen, Check, CircleCheck, Clock, Heart, Lock, Mic, Moon, NotebookPen, RefreshCw, SquareCheckBig, Star, Users, X } from 'lucide-react-native';
import { ChatCircleDots, HandsPraying } from 'phosphor-react-native';
import { type PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { fetchCreditStatus, setPendingAnnouncement } from '@/lib/creditsService';
import { scheduleTrialEndingReminder } from '@/lib/trialReminder';
import { logEvent } from '@/lib/analytics';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { hasUsedTrial, isMonthlyPkg, isYearlyPkg, packageTrialDays } from '@/hooks/useTrialAvailable';
import { termsUrl } from '@/lib/storeLinks';
import { SPONSORS } from '@/constants/sponsors';
import { resolveTone, type GlyphComponent } from '@/components/dailyTokens';
import { SunriseGlyph } from '@/components/navigation/TabGlyphs';

const TERMS_URL = termsUrl();
const PRIVACY_URL = 'https://soberdailies.com/privacy';

// Decorative rail gradient stops (green → teal → lavender), matched to the design.
const RAIL_GREEN = '#86CBA6';
const RAIL_TEAL = '#74C7D3';
const RAIL_LAV = '#BCB3EA';
const BEAD = 30;         // compact trial-timeline bead diameter
const CARD_PAD_H = 20;   // card horizontal padding (the title aligns to this)

// ── helpers ──────────────────────────────────────────────────────────────
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

// Deliberately says nothing about price or trial. 3.1.2(c) requires every
// pricing element — free trial included — to sit subordinate in position and
// size to the billed amount, and the old headline ("Your first week is free")
// was the largest thing on the screen by some margin. Making the title a
// direction rather than a claim removes it from that comparison entirely,
// leaving $19.99/yr as the most conspicuous price without shrinking anything.
// The trial is still stated three times below: the timeline, the CTA, and the
// billing disclosure.
//
// "Unlock every tool" (onboarding redesign, 2026-11-08) keeps that rule: it
// names what is bought, not a price or a trial.
const PAYWALL_TITLE = 'Unlock every tool';
// Only after the onboarding tour, which this line points back to.
const ONBOARDING_SUBTITLE = 'Everything you just saw, plus your count and your daily program.';

// What "every tool" means, in the same imagery the onboarding tour just showed.
// The Big Book reader tile is drawn from the two covers — no photo shows both
// books inside a square tile. The sponsor tile is Steady Eddie himself, so it
// reads as *your sponsor* rather than a meeting.
const BIG_BOOK_COVER = require('@/assets/images/big-book_cover.webp');
const TWELVE_TWELVE_COVER = require('@/assets/images/new_12x12_cover.webp');
// The left (people) side of the meeting photo, blurred, then shaded darker
// toward the bottom right so the covers stand off it. Fixed in both modes,
// like the photos beside it.
const MEETING_PHOTO = require('@/assets/images/literature_hero2.webp');
const LIT_TILE_SHADE = ['rgba(18,26,38,0.15)', 'rgba(18,26,38,0.45)', 'rgba(18,26,38,0.75)'] as const;
const EDDIE_AVATAR = SPONSORS.find((s) => s.id === 'supportive')?.avatar;
const TOOL_TILES = [
  { key: 'sponsor', label: 'AI sponsor', source: EDDIE_AVATAR, position: 'top' as const },
  // Green, so it doesn't read as the same warm photo as the Speakers tile next to it.
  { key: 'reflections', label: 'Reflections', source: require('@/assets/reflections_images/reflection_bg3.webp') },
  { key: 'speakers', label: 'Speakers', source: require('@/assets/images/speakers_hero2.webp') },
  { key: 'literature', label: 'Big Book reader', source: null },
];

// No-trial view: what the subscription includes, named plainly. Someone who has
// already had a trial (or a lapsed subscriber) knows why these matter. Tones
// follow toolFamily; glyphs are the ones each tool uses elsewhere in the app.
const FEATURES: { label: string; tone: string; Icon: GlyphComponent }[] = [
  { label: 'Daily program planner', tone: 'teal', Icon: SquareCheckBig },
  { label: 'Sobriety counter', tone: 'teal', Icon: Clock },
  { label: 'Daily Reflections', tone: 'teal', Icon: SunriseGlyph },
  { label: 'Big Book & 12&12', tone: 'steel', Icon: BookOpen },
  { label: 'Speaker tapes', tone: 'steel', Icon: Mic },
  { label: 'AI sponsors', tone: 'periwinkle', Icon: ChatCircleDots },
  { label: 'Spot check inventory', tone: 'terracotta', Icon: CircleCheck },
  { label: 'Prayers & meditation', tone: 'teal', Icon: HandsPraying },
  { label: 'Gratitude list', tone: 'terracotta', Icon: Heart },
  { label: 'Journal', tone: 'teal', Icon: NotebookPen },
  { label: 'Nightly review', tone: 'periwinkle', Icon: Moon },
  { label: 'Meeting finder', tone: 'steel', Icon: Users },
];

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
  // Where it is shown from. 'onboarding' adds the subtitle that refers back to
  // the tour; the lapsed-user backstop and previews show none.
  context?: 'onboarding';
}

export default function PaywallScreen({ onDismiss, onDevBypass, onUnavailableDismiss, preview, forceTrial, context }: PaywallScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors, mode } = useTokens();
  const { offerings, isLoading, autoRetrying, error, purchasePackage, restorePurchases, refresh, applyCustomerInfo, customerInfo, trialEligible, qaForceNewUser } = useSubscription();

  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState(false);
  // `error` is shared subscription state — a background refresh can set it with
  // no user action behind it. Only a purchase the user actually attempted earns
  // the message under the CTA, so gate on this rather than on `error` alone.
  const [purchaseFailed, setPurchaseFailed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retrying, setRetrying] = useState(false);

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
  // Denominator for the failure rate: every render of this screen, success or
  // not. Without it `paywall_plans_unavailable` is a count with no base and
  // "how often does the paywall fail" is unanswerable (as it was on 2026-08-18).
  React.useEffect(() => {
    logEvent('paywall_view', { preview: !!preview });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Only log the SETTLED failure — after the silent launch retries have run
    // out, not between attempts.
    if (isLoading || autoRetrying || chosen) return;
    console.warn('[Paywall] No usable subscription plan', { offeringId, packageIds: packageIds || 'none', error });
    logEvent('paywall_plans_unavailable', {
      offering_id: offeringId,
      package_ids: packageIds || 'none',
      // Transport failure vs the store vending nothing — the distinction the
      // 2026-08-18 App Review rejection made us wish we had recorded.
      error_message: error ?? 'none',
      offerings_received: offerings ? 'yes' : 'no',
    });
  }, [isLoading, autoRetrying, chosen, offeringId, packageIds, error, offerings]);

  // Two faces. With a trial: the tool tiles and the trial timeline, which
  // answers "what happens to my money" and whose final step carries the
  // Play-required "a subscription is required" disclosure. Without one
  // (showTrial false, below): a plain list of everything the subscription
  // includes. Both stores state the real terms in their own purchase sheet,
  // which is what a returning user is actually charged on.

  // Trial length comes from the store and drives the timeline/disclosure. The
  // title and CTA deliberately do not advertise the trial, keeping every trial
  // claim visually subordinate to the amount that will actually be billed.
  const trialLen = chosen
    ? packageTrialDays(chosen)
    : (packageTrialDays(yearly) ?? packageTrialDays(monthly));

  // Already had a trial (see hasUsedTrial): the store bills them the moment
  // they subscribe, so promising a free week would be a lie.
  const usedTrial = hasUsedTrial(trialEligible, customerInfo);
  const showTrial = forceTrial !== undefined ? forceTrial : (!usedTrial && trialLen !== null);
  // The reminder fires 48 h before expiry (lib/trialReminder.ts), clamped so it
  // can't land on or before day 1 of a very short trial.
  const trialEndDay = trialLen ?? 7;
  const warnDay = Math.min(Math.max(2, trialEndDay - 2), trialEndDay - 1);

  // White beads with a colored ring matching the rail at that point.
  const STEPS = [
    {
      key: 'today',
      icon: <Lock size={13} color="#2E7A5F" strokeWidth={2.4} />,
      ring: RAIL_GREEN,
      title: 'Today',
      body: 'everything unlocks.',
    },
    {
      key: 'day5',
      icon: <Bell size={13} color={colors.primaryDark} strokeWidth={2} fill={colors.primaryDark} />,
      ring: RAIL_TEAL,
      title: `Day ${warnDay}`,
      body: "we'll remind you the trial is ending.",
    },
    {
      key: 'day7',
      icon: <Star size={13} color={colors.primary} strokeWidth={2} fill={colors.primary} />,
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

  const buy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setPurchaseFailed(false);
    logEvent('paywall_purchase_tapped', { plan: selected });
    try {
      const info = await purchasePackage(chosen);
      // The tap alone said nothing about how it ended; these close the funnel.
      // null covers both a store failure and a plain cancel.
      logEvent(info ? 'paywall_purchase_completed' : 'paywall_purchase_not_completed', { plan: selected });
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
  // CTA and no explanation. While the hook's silent launch retries are still
  // running this is NOT yet a verdict — hold the spinner, not the fail screen.
  const cannotSell = !isLoading && !autoRetrying && !chosen;
  const closeAction = cannotSell && onUnavailableDismiss ? onUnavailableDismiss : onDismiss;

  // Horizontal safe-area edges (the Duo's 84pt side inset, where the close X
  // once hid under the system clock) are applied once by the root
  // SideInsetGuard in app/_layout.tsx — adding 'left'/'right' here again
  // would double-inset this screen.

  // Nothing to sell yet but retries are still in flight — same resolving
  // spinner the variant gate uses, so a transient blip never flashes the fail
  // screen on its way to a working paywall.
  if (autoRetrying && !chosen) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.resolving}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
        {/* The trial variant's only subtitle is the onboarding one, which
            points back at the tour rather than restating the timeline (that
            already covers what unlocks, when billing starts and how to
            cancel). The no-trial face has no timeline, so its line still has
            to state the requirement itself. */}
        {!showTrial && (
          <Text style={styles.subtitle}>Subscribe to access the app.</Text>
        )}
        {showTrial && context === 'onboarding' && (
          <Text style={styles.onboardingSubtitle}>{ONBOARDING_SUBTITLE}</Text>
        )}

        {/* What "every tool" is — static tiles, not links. */}
        {showTrial && (
          <View style={styles.tiles}>
            {TOOL_TILES.map((t) => (
              <View key={t.key} style={styles.tile}>
                {t.source ? (
                  <Image source={t.source} style={styles.tileImage} contentFit="cover" contentPosition={'position' in t ? t.position : 'center'} />
                ) : (
                  // The Big Book in front and centered, running off the bottom;
                  // the Twelve and Twelve tucked behind it, peeking out at the
                  // upper right. The tile clips both.
                  <View style={[styles.tileImage, styles.litTile]}>
                    {/* A meeting room, blurred and darkened, behind the books —
                        so the tile reads as a photo like the three beside it. */}
                    <Image
                      source={MEETING_PHOTO}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      // Top-left: the room and the people, clear of the
                      // photo's own books at the bottom right.
                      contentPosition="top left"
                      // In source pixels — the photo is 2848px wide, so it
                      // takes a large radius to read as blurred at tile size.
                      blurRadius={40}
                    />
                    <LinearGradient
                      colors={LIT_TILE_SHADE}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.litCover, styles.litBack]}>
                      <Image source={TWELVE_TWELVE_COVER} style={styles.litImg} contentFit="cover" />
                    </View>
                    <View style={[styles.litCover, styles.litFront]}>
                      <Image source={BIG_BOOK_COVER} style={styles.litImg} contentFit="cover" />
                    </View>
                  </View>
                )}
                <Text style={styles.tileLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* No-trial view — the features list stands in for the timeline. */}
        {!showTrial && (
          <View style={styles.features}>
            <Text style={styles.featuresLabel}>EVERYTHING IN SOBER DAILIES</Text>
            <View style={styles.featureGrid}>
              {FEATURES.map((f) => {
                const tone = resolveTone(f.tone, mode);
                return (
                  <View key={f.label} style={styles.feature}>
                    <View style={[styles.featureIcon, { backgroundColor: tone.soft }]}>
                      <f.Icon size={14} color={tone.ink} />
                    </View>
                    <Text style={styles.featureName}>{f.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Trial timeline — compact: one line per step, small ringed beads,
            so the plans and the button fit on a standard iPhone without
            scrolling. The Day 7 sentence is the Play disclosure ("…required to
            maintain access…") with the real price; keep it word for word.
            Hidden once the trial has been used: there is no countdown left to
            show, and the "Subscribe to access the app" line above already
            carries the disclosure. */}
        {showTrial && (
          <View style={styles.timeline}>
            {STEPS.map((st) => (
              <View key={st.key} style={styles.step}>
                <View style={[styles.bead, { borderColor: st.ring }]}>{st.icon}</View>
                <Text style={styles.stepLine}>
                  <Text style={styles.stepTitle}>{st.title}</Text> — {st.body}
                </Text>
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
    // Capped and centered like the onboarding screens before it, so on an
    // iPad or an unfolded Duo the plans and tiles don't stretch edge to edge.
    scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
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
    onboardingSubtitle: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 20, color: c.textSecondary, marginTop: 6, paddingHorizontal: CARD_PAD_H },

    tiles: { flexDirection: 'row', gap: 8, marginTop: 16 },
    tile: { flex: 1, alignItems: 'center', gap: 6 },
    tileImage: { width: '100%', height: 76, borderRadius: 12, backgroundColor: c.border },
    litTile: { backgroundColor: '#121A26', overflow: 'hidden' },
    litCover: { position: 'absolute', width: '60%', aspectRatio: 0.76 },
    litImg: { width: '100%', height: '100%', borderRadius: 4 },
    litBack: { left: '46%', top: '-4%', transform: [{ rotate: '10deg' }] },
    litFront: { left: '8%', top: '22%', transform: [{ rotate: '-6deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 2, height: 2 } },
    tileLabel: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.text },

    // No-trial features: a two-column grid, small enough that the plans and
    // the button still fit on a standard iPhone without scrolling.
    features: { marginTop: 22, backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, ...shadows.sm, ...darkCard },
    featuresLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.6, color: c.textMuted, marginBottom: 10 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
    feature: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
    featureIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    featureName: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 16, color: c.text },

    timeline: { marginTop: 16, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, paddingVertical: 14, paddingHorizontal: 16, gap: 12, ...shadows.sm, ...darkCard },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    bead: { width: BEAD, height: BEAD, borderRadius: BEAD / 2, borderWidth: 2.5, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    stepLine: { flex: 1, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.text, paddingTop: 5 },
    stepTitle: { fontFamily: fontFamily.bold },

    errorCard: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    errorText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    purchaseError: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: colors.destructive, textAlign: 'center', marginTop: 10 },
    retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
    retryText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },

    // plans
    plans: { marginTop: 18, gap: 10 },
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
    cta: { marginTop: 16, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 16.5, color: '#fff' },

    billing: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 10 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
    footerLink: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textMuted },
    footerDot: { color: c.textMuted, fontSize: 13 },

  });
};
