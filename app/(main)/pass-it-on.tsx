// Pass It On — purchase screen (Pass It On Handoff 2, frames-v2/hifi-passiton.jsx).
// The single $9.99 gift is the only tier on screen at first; the 5/10 packs
// sit behind a "Give more and save" reveal (decided Jul 18 — no big number in
// anyone's face on load). The pricing unit is the MONTH, not the gift: each
// tier leads with its per-month rate ($3.33 → $2.67 → $2.00/month, 10-pack
// badged "Best deal"), which quietly undercuts the $3.99 monthly subscription.
// The CTA runs the REAL RevenueCat purchase when the store products resolve
// (ASC products exist as drafts; RC offering pending). Until then, __DEV__
// builds offer a mock purchase so the whole flow is testable on device.
// Codes are minted locally into the wallet for now — when the backend gift
// service lands, the mint moves server-side behind receipt verification.
// Confirmation is a sheet over this screen (decided design), never a screen.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Purchases, { PurchasesStoreProduct } from 'react-native-purchases';
import { ChevronRight, HelpCircle } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import GiftInfoSheet from '@/components/GiftInfoSheet';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useGiftWallet } from '@/hooks/use-gift-wallet';
import { GIFT_SKUS, GIFT_MONTHS, MONTHLY_PRICE_FALLBACK, fetchGiftProducts, type GiftSku } from '@/lib/giftProducts';
import { logEvent } from '@/lib/analytics';

// The CTA keeps full rose chroma in both modes (jewel treatment, like the
// photo heroes) — mode-aware rose is for tints and icons, not the fill.
const ROSE_FILL = lightColors.rose;

// Store name for billing copy — the gift consumables sell through each platform's
// own store (App Store / Google Play).
const STORE_NAME = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';

function SkuCard({ sku, price, perMonth, on, onPick }: {
  sku: GiftSku; price: string; perMonth: string; on: boolean; onPick: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  return (
    <Pressable
      style={[styles.skuCard, on && styles.skuCardOn]}
      onPress={onPick}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      <View style={[styles.radio, on && { borderColor: colors.rose, borderWidth: 6.5 }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.skuLabelRow}>
          <Text style={styles.skuLabel}>{sku.label}</Text>
          {sku.badge ? <Text style={styles.skuBadge}>{sku.badge}</Text> : null}
        </View>
        <Text style={styles.skuSub}>{sku.sub}</Text>
      </View>
      <View style={styles.skuPriceCol}>
        <Text style={styles.skuPrice}>{price}</Text>
        <Text style={styles.skuPerMonth}>{perMonth}</Text>
      </View>
    </Pressable>
  );
}

function ConfirmSheet({ n, onSeeGifts, onDone }: { n: number; onSeeGifts: () => void; onDone: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDone}>
      <Pressable style={styles.sheetScrim} onPress={onDone} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={{ alignItems: 'center' }}>
          <View style={styles.sheetCoin}>
            <GiftGlyph size={30} color={colors.roseDark} strokeWidth={1.6} />
          </View>
          <Text style={styles.sheetTitle}>{n * GIFT_MONTHS} months added</Text>
          <Text style={styles.sheetBody}>
            Your {n === 1 ? 'code is' : 'codes are'} ready in <Text style={styles.sheetBodyBold}>Gifts to give</Text>.
            Each code unlocks three months for whoever redeems it.
          </Text>
        </View>
        <TouchableOpacity style={styles.cta} onPress={onSeeGifts} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.ctaText}>See your gifts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quietBtn} onPress={onDone} activeOpacity={0.6} accessibilityRole="button">
          <Text style={styles.quietBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function PassItOnScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { applyPurchase, mintLocalDev, unsharedCount } = useGiftWallet();

  const [pick, setPick] = useState(0);          // single gift preselected — $9.99 is the first price anyone sees
  // Load shows only the 3-month card; "Give more and save" reveals BOTH packs
  // at once. Bigger numbers never appear before they're asked for.
  const [moreOpen, setMoreOpen] = useState(false);
  const [monthly, setMonthly] = useState<{ price: number; currency: string } | null>(null);
  const [products, setProducts] = useState<Record<string, PurchasesStoreProduct>>({});
  const [busy, setBusy] = useState(false);
  const [bought, setBought] = useState<number | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    fetchGiftProducts().then(setProducts).catch(() => {});
    // Live monthly subscription price — feeds the crossed-out anchors so the
    // savings math always matches the real paywall price.
    if (Platform.OS !== 'web') {
      Purchases.getOfferings()
        .then((o) => {
          const p = o.current?.monthly?.product;
          if (p) setMonthly({ price: p.price, currency: p.currencyCode });
        })
        .catch(() => {});
    }
  }, []);

  const sku = GIFT_SKUS[pick];
  const product = products[sku.productId];
  const priceFor = (s: GiftSku) => products[s.productId]?.priceString ?? s.price;

  const monthlyPrice = monthly?.price ?? MONTHLY_PRICE_FALLBACK;
  const fmt = (amount: number, currency?: string) => {
    const cur = currency ?? monthly?.currency;
    if (cur) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount);
      } catch {}
    }
    return `$${amount.toFixed(2)}`;
  };
  // The buyer's unit is the month: $9.99 buys 3 months, so "$3.33/month".
  // Follows the LIVE gift price when it resolves. Packs get an "only" —
  // the single's rate sets the ladder they undercut.
  const perMonthFor = (s: GiftSku) => {
    const p = products[s.productId];
    const price = p?.price ?? parseFloat(s.price.replace(/[^0-9.]/g, ''));
    const rate = fmt(price / (s.n * GIFT_MONTHS), p?.currencyCode);
    return s.n === 1 ? `${rate}/month` : `only ${rate}/month`;
  };

  const buy = async () => {
    if (busy) return;
    if (product) {
      setBusy(true);
      // 1) The native payment sheet. A cancel here is not an error.
      try {
        await Purchases.purchaseStoreProduct(product);
      } catch (e: any) {
        if (!e?.userCancelled) {
          console.error('[Gifts] Purchase error:', e);
          Alert.alert('Purchase didn’t go through', e?.message || 'Please try again.');
        }
        setBusy(false);
        return;
      }
      // 2) The purchase succeeded — verify it server-side and mint the codes.
      //    Minting is idempotent, so if RC hasn't propagated the transaction
      //    yet the wallet's next sync (or a re-tap) picks the codes up.
      try {
        await applyPurchase(sku.productId);
        logEvent('gift_purchase_completed', { product_id: sku.productId, codes: sku.n });
        setBought(sku.n);
      } catch (e: any) {
        console.error('[Gifts] Mint error after purchase:', e);
        Alert.alert(
          'Almost there',
          'Your purchase went through. We couldn’t add the codes just yet — open your wallet in a moment and they’ll appear.',
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    if (__DEV__ || Platform.OS === 'web') {
      // Store products aren't resolving (no sandbox / web) — seed local codes so
      // the wallet UI is testable. These never touch the server.
      Alert.alert(
        'Test purchase',
        `The store products aren’t resolving here. Seed ${sku.n === 1 ? '1 test code' : `${sku.n} test codes`} locally?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Seed codes',
            onPress: async () => {
              await mintLocalDev(sku.n);
              logEvent('gift_purchase_completed', { product_id: sku.productId, codes: sku.n, dev: true });
              setBought(sku.n);
            },
          },
        ],
      );
      return;
    }
    Alert.alert('Not available yet', 'Gifts aren’t available right now. Please try again later.');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton onPress={() => router.back()} />
          <TouchableOpacity
            style={styles.howBtn}
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="How Pass It On works"
          >
            <HelpCircle size={15} color={colors.roseDark} strokeWidth={2} />
            <Text style={styles.howBtnText}>Learn more</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Pass It On</Text>
        <Text style={styles.sub}>Give someone their first 90 days</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* What it is + how it works — lead with the mechanics, this is new to most people */}
        <Text style={styles.intro}>
          You’re filling a bank of months to give away. Each code you share unlocks three months of
          Sober Dailies for someone else — a sponsee, a newcomer, anyone who could use it.
          New to this? Tap <Text style={styles.introLink} onPress={() => setInfoVisible(true)}>Learn more</Text>.
        </Text>

        {/* Always visible — lets anyone see the wallet, even before buying */}
        <TouchableOpacity
          style={styles.walletLink}
          onPress={() => router.push('/(main)/gift-wallet')}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.walletLinkIcon}>
            <GiftGlyph size={18} color={colors.roseDark} strokeWidth={1.7} />
          </View>
          <Text style={styles.walletLinkText}>
            {unsharedCount > 0
              ? `You have ${unsharedCount * GIFT_MONTHS} months to give`
              : 'See your gift wallet'}
          </Text>
          <ChevronRight size={18} color={c.textMuted} />
        </TouchableOpacity>

        <View style={{ gap: 10 }}>
          {(moreOpen ? GIFT_SKUS : GIFT_SKUS.slice(0, 1)).map((s, i) => (
            <SkuCard
              key={s.productId}
              sku={s}
              price={priceFor(s)}
              perMonth={perMonthFor(s)}
              on={i === pick}
              onPick={() => setPick(i)}
            />
          ))}
        </View>

        {!moreOpen && (
          <TouchableOpacity
            style={styles.moreLink}
            onPress={() => setMoreOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.moreLinkText}>Give more and save</Text>
            <ChevronRight size={15} color={colors.roseDark} strokeWidth={2} />
          </TouchableOpacity>
        )}

        <Text style={styles.footnote}>
          Once you buy, your codes are saved in a wallet where you can share them and see which
          ones have been redeemed. One-time purchase — nothing renews, for you or for them.
          (The regular subscription is {fmt(monthlyPrice)}/month.)
        </Text>

        <TouchableOpacity
          style={[styles.cta, { marginTop: 20 }, busy && { opacity: 0.6 }]}
          onPress={buy}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {busy ? 'One moment…' : `Add ${sku.n * GIFT_MONTHS} months · ${priceFor(sku)}`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.billedNote}>Billed once through {STORE_NAME}</Text>
      </ScrollView>

      {bought != null && (
        <ConfirmSheet
          n={bought}
          onSeeGifts={() => { setBought(null); router.replace('/(main)/gift-wallet'); }}
          onDone={() => setBought(null)}
        />
      )}

      <GiftInfoSheet visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    howBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12,
      borderRadius: 999, backgroundColor: colors.roseSoft, borderWidth: 1,
      borderColor: isDark ? 'rgba(217,131,143,0.4)' : '#E3BCC3',
    },
    howBtnText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.roseDark },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    sub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: c.textMuted, marginTop: 6 },
    scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },

    intro: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 22, color: c.textSecondary, marginHorizontal: 2, marginTop: 4, marginBottom: 16 },
    introLink: { fontFamily: fontFamily.bold, color: colors.roseDark },

    // Wallet shortcut — rose-soft pill row, only when the user holds codes
    walletLink: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
      borderRadius: 12, backgroundColor: colors.roseSoft, marginBottom: 18,
    },
    walletLinkIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    walletLinkText: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.roseDark },

    skuCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16,
      borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm,
    },
    skuCardOn: {
      borderWidth: 2, borderColor: colors.rose,
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
      // 2px border replaces the 1px one — pull padding in so the row doesn't jump.
      paddingVertical: 14, paddingHorizontal: 15,
    },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: c.textMuted, backgroundColor: c.surface },
    skuLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    skuLabel: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
    skuBadge: {
      fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.roseDark,
      backgroundColor: colors.roseSoft, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999,
      overflow: 'hidden',
    },
    skuSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    skuPriceCol: { alignItems: 'flex-end' },
    skuPrice: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, fontVariant: ['tabular-nums'] },
    skuPerMonth: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.roseDark, marginTop: 2 },

    moreLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, marginTop: 2 },
    moreLinkText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: colors.roseDark },

    footnote: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 19, color: c.textMuted, marginTop: 16, marginHorizontal: 6 },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    billedNote: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, textAlign: 'center', marginTop: 10 },

    sheetScrim: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 10, paddingHorizontal: 26, paddingBottom: 40, ...shadows.lg,
    },
    sheetHandle: { width: 40, height: 4.5, borderRadius: 3, backgroundColor: c.divider, alignSelf: 'center', marginBottom: 22 },
    sheetCoin: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 24, letterSpacing: -0.4, color: c.text, marginTop: 16 },
    sheetBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 22, color: c.textSecondary, textAlign: 'center', maxWidth: 280, marginTop: 8, marginBottom: 22 },
    sheetBodyBold: { fontFamily: fontFamily.semiBold, color: c.text },
    quietBtn: { paddingVertical: 13, alignItems: 'center', marginTop: 6 },
    quietBtnText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: c.textMuted },
  });
};
