// Pass It On — the gift screen (credits model, docs/invite-rewards-design.md §0).
// Gifts are EARNED with membership (annual 5/yr · monthly 1 per 3 months ·
// founding members 5/yr), never bought — the purchase tiers this screen used
// to sell are retired (2026-07-20, acquisition pivot). Each gift is a private
// soberdailies.com/get link that gives the recipient 3 free months via an
// Apple offer code (Android recipients get a classic in-app code on /get).
//
// Give flow: mint/reuse a share token (a cancelled composer never burns a
// credit — the unsent token is cached and reused) → Messages composer with the
// text ready and To: blank, addressed in Messages itself (typed number or
// contact — decided 2026-07-27, replacing the contact picker). Falls back to
// the OS share sheet when SMS isn't available. "Invite friends" (the free,
// unlimited path) is a peer button here — decided 2026-07-20.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import GiftSentSheet from '@/components/GiftSentSheet';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useGiftCredits } from '@/hooks/use-gift-credits';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useSubscription } from '@/hooks/useSubscription';
import { getShareLink, confirmShareSent, giftMessage, PASSES_ENABLED } from '@/lib/creditsService';
import { shareApp } from '@/lib/shareApp';
import { logEvent, DEVELOPER_MODE_KEY } from '@/lib/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The CTA keeps full rose chroma in both modes (jewel treatment).
const ROSE_FILL = lightColors.rose;

// expo-sms is a native module older installed clients don't contain — resolve
// lazily and fall back to the share sheet.
//
// The try/catch alone is NOT the guard: Metro's guardedLoadModule hands a
// module-init throw to ErrorUtils.reportFatalError (RCTFatal), which aborts the
// app before any catch here runs — and giveGift() calls this from an event
// handler, exactly the case that killed every purchaser on build 130 (see
// lib/trialReminder.ts). Probe the native side first so the require is skipped
// entirely on a binary that predates expo-sms.
let smsModule: typeof import('expo-sms') | null | undefined;
function getSMS() {
  if (smsModule !== undefined) return smsModule;
  try {
    if (requireOptionalNativeModule('ExpoSMS') == null) {
      smsModule = null; // binary predates expo-sms
      return smsModule;
    }
    smsModule = require('expo-sms');
  } catch {
    smsModule = null;
  }
  return smsModule;
}

type PlanKind = 'annual' | 'monthly' | 'founding' | 'none';

export default function PassItOnScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { balance, loading, refresh } = useGiftCredits({ alwaysFresh: true });
  const { customerInfo, isGrandfathered, isEntitled } = useSubscription();

  const [busy, setBusy] = useState(false);
  // Gift-sent sheet (design handoff §4): name null = OS share sheet path.
  const [sent, setSent] = useState<{ name: string | null; balance: number } | null>(null);

  // Loading shimmer (design handoff §2): two bars pulsing 1 → 0.35, 1.4s,
  // the second 0.2s behind.
  const shimmer = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, shimmer]);

  const productId = customerInfo?.entitlements?.active?.premium?.productIdentifier ?? '';
  const realPlan: PlanKind = isEntitled
    ? (/year|annual/i.test(productId) ? 'annual' : 'monthly')
    : isGrandfathered
      ? 'founding'
      : 'none';
  // While passes are suspended (TestFlight — see creditsService.PASSES_ENABLED)
  // the balance reads 0, so plan-specific zero-state copy ("your next pass is
  // on its way") would be a false promise. Show the neutral subscriber line.
  const plan: PlanKind = PASSES_ENABLED ? realPlan : 'none';

  // Receipt voice (decided 2026-07-20): the screen shows what you HOLD; the
  // announcement of new gifts happens post-subscribe (PaywallScreen) — this
  // copy never has to explain the program, just the inventory.
  const earnCopy: Record<PlanKind, string> = {
    annual: 'You receive 5 passes each subscription year',
    monthly: 'You received a pass when you joined — a new one arrives every 3 months',
    founding: 'You’ve been here from the start — 5 passes a year, from us',
    none: 'Subscribers receive passes to give',
  };

  const hero = loading
    ? { title: 'Checking your passes…', sub: ' ' }
    : balance > 0
      ? {
          title: `You have ${balance} ${balance === 1 ? 'pass' : 'passes'} to give`,
          sub: balance === 1
            ? 'Send it to someone who could use 3 free months — a sponsee, a newcomer, a friend'
            : 'Send them to people who could use 3 free months — sponsees, newcomers, friends',
        }
      : plan === 'monthly'
        ? { title: 'Your next pass is on its way', sub: 'A new one arrives every 3 months you’re subscribed' }
        : plan === 'none'
          ? { title: 'Subscribers receive passes to give', sub: '3 free months for someone who needs it' }
          : { title: 'All your passes are out in the world', sub: 'Fresh ones arrive with your next subscription year' };

  // Send one gift: token (minted or reused) → contact → individually
  // addressed text. Only a composer that actually SENDS consumes the pending
  // token; cancel at any step keeps the credit "in the envelope".
  const giveGift = async () => {
    if (busy || balance <= 0) return;
    setBusy(true);
    try {
      const pending = await getShareLink();
      if (!pending) {
        Alert.alert('Not right now', 'We couldn’t prepare your pass. Check your connection and try again.');
        return;
      }
      const message = giftMessage(pending.link);

      // Developer Mode: skip SMS for the OS share sheet. A SIM-less test
      // device passes isAvailableAsync (an SMS app exists) but the OS then
      // refuses to compose, which reads as "cancelled" — leaving no way to
      // get the link off the device (Neal, 2026-08-03, Android E2E). Text
      // stays the ONLY path for production users.
      const devShare = (await AsyncStorage.getItem(DEVELOPER_MODE_KEY).catch(() => null)) === 'true';

      const SMS = getSMS();
      if (!devShare && SMS && (await SMS.isAvailableAsync().catch(() => false))) {
        // Open the composer with the To: field BLANK (Neal, 2026-07-27) — the
        // Messages field itself takes a typed number or a contact name, which
        // covers the meeting case without making the recipient a Contact
        // first. Replaces the in-app contact picker; the sent sheet already
        // handles an unknown recipient (name: null).
        const { result } = await SMS.sendSMSAsync([], message);
        if (result === 'sent' || result === 'unknown') {
          await confirmShareSent();
          logEvent('gift_shared', { via: 'sms' });
          const fresh = await refresh();
          setSent({ name: null, balance: fresh?.balance ?? Math.max(0, balance - 1) });
        }
        return;
      }

      // No SMS (iPad / no SIM / module missing) — the share sheet still works.
      const res = await Share.share({ message });
      if (res.action === Share.sharedAction) {
        await confirmShareSent();
        logEvent('gift_shared', { via: 'share_sheet' });
        const fresh = await refresh();
        setSent({ name: null, balance: fresh?.balance ?? Math.max(0, balance - 1) });
      }
    } catch (e) {
      console.warn('[pass-it-on] give failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        {/* No "Learn more" sheet (Neal, 2026-07-20): the offer is simple
            enough — the footnote carries what a recipient gets. */}
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Pass It On</Text>
        <Text style={styles.sub}>Give someone their first 90 days</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Credits hero */}
        <View style={styles.hero}>
          <View style={styles.heroCoin}>
            <GiftGlyph size={26} color={colors.roseDark} strokeWidth={1.6} />
          </View>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          {loading ? (
            // Shimmer bars instead of a blank sub while the balance resolves.
            <View style={{ alignItems: 'center', marginTop: 10, gap: 7 }}>
              <Animated.View style={[styles.shimmerBar, { width: 210, opacity: shimmer }]} />
              <Animated.View style={[styles.shimmerBar, { width: 150, opacity: shimmer }]} />
            </View>
          ) : (
            <Text style={styles.heroSub}>{hero.sub}</Text>
          )}
          {!loading && balance > 0 && (
            // One dot per gift you're holding — the inventory, made visible.
            <View style={styles.dotRow}>
              {Array.from({ length: Math.min(balance, 10) }, (_, i) => (
                <View key={i} style={styles.dot}>
                  <GiftGlyph size={13} color={colors.roseDark} strokeWidth={2} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Give vs Share rows (design handoff §3): rose means "a gift is
            involved" — sharing the app is deliberately neutral. */}
        {!loading && (
          <View style={{ gap: 10 }}>
            {balance > 0 && (
              <TouchableOpacity
                style={[styles.giveRow, busy && { opacity: 0.6 }]}
                onPress={giveGift}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={styles.giveRowIcon}>
                  <GiftGlyph size={19} color="#FFFFFF" strokeWidth={1.9} />
                </View>
                <Text style={styles.giveRowText}>{busy ? 'One moment…' : 'Give someone 3 months free'}</Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.shareRow}
              onPress={shareApp}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.shareRowIcon}>
                <UserPlus size={18} color={c.textSecondary} strokeWidth={2} />
              </View>
              <Text style={styles.shareRowText}>Share the app with your friends</Text>
              <ChevronRight size={16} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* How gifts are earned. Skipped when there's no plan: the hero
            already says "Subscribers receive passes to give" and this row
            would repeat it word for word. */}
        {plan !== 'none' && (
          <View style={styles.earnRow}>
            <Text style={styles.earnText}>{earnCopy[plan]}</Text>
          </View>
        )}

        {/* Annual-upsell pitch removed (Neal, 2026-07-20): nobody switches
            plans to give more passes. Buying passes may return in a future
            release instead. */}

        <Text style={styles.footnote}>
          A pass is a private link that unlocks 3 free months for someone new — a sponsee, a
          newcomer, anyone who could use it. They pick their own plan; nothing is charged for
          3 months and they can cancel anytime.
        </Text>
      </ScrollView>

      {sent && (
        <GiftSentSheet
          name={sent.name}
          balance={sent.balance}
          onGiveAnother={() => { setSent(null); giveGift(); }}
          onClose={() => setSent(null)}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    sub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: c.textMuted, marginTop: 6 },
    scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },

    hero: {
      alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20,
      borderRadius: 16, backgroundColor: colors.roseSoft, marginBottom: 14,
    },
    heroCoin: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadows.sm,
    },
    heroTitle: { fontFamily: fontFamily.displayBold, fontSize: 20, letterSpacing: -0.3, color: c.text, textAlign: 'center' },
    heroSub: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: colors.roseDark, textAlign: 'center', marginTop: 5 },

    shimmerBar: { height: 9, borderRadius: 5, backgroundColor: colors.rose + '2E' },

    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 12 },
    dot: {
      width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface,
      borderWidth: 1.5, borderColor: colors.rose + '66',
      alignItems: 'center', justifyContent: 'center',
    },

    giveRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      width: '100%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
      backgroundColor: ROSE_FILL,
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    giveRowIcon: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
    },
    giveRowText: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, color: '#FFFFFF' },

    shareRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      width: '100%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    shareRowIcon: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: c.divider,
      alignItems: 'center', justifyContent: 'center',
    },
    shareRowText: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },

    earnRow: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 14, marginTop: 16,
    },
    earnText: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: c.textSecondary },

    footnote: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 19, color: c.textMuted, marginTop: 18, marginHorizontal: 6 },
  });
};
