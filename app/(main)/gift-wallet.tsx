// Gifts to give — the Pass It On wallet (Pass It On Handoff 2, decided design:
// LEDGER, not chip grid). One row per code with a mini 3-month medallion.
// Cumulative counter: available-of-all-ever-purchased — buying more appends to
// one pool, no batches. Two states only (available / redeemed + date); the app
// never tracks who a code went to (spec §6.2/§9). Running out is the success
// state ("Every gift found a home."). Codes appear here and nowhere else.
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share as ShareIcon, CircleCheck } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useGiftWallet, type GiftCode } from '@/hooks/use-gift-wallet';
import { logEvent } from '@/lib/analytics';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

const redeemedLabel = (iso?: string) => {
  if (!iso) return 'Redeemed';
  const d = new Date(iso);
  return `Redeemed ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// 32px mini 3-month medallion — keeps "what you're giving" visible at 10-pack scale.
function MiniMedallion({ dim }: { dim?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  return (
    <View style={[styles.medallion, dim && { backgroundColor: c.divider, borderColor: c.border }]}>
      <Text style={[styles.medallionNum, dim && { color: c.textMuted }]}>3</Text>
      <Text style={[styles.medallionUnit, dim && { color: c.textMuted }]}>MO</Text>
    </View>
  );
}

function LedgerRow({ item, last, onCopy, onShare, onDevRedeem }: {
  item: GiftCode; last: boolean; onCopy?: () => void; onShare?: () => void; onDevRedeem?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const done = item.status === 'redeemed';
  return (
    <View style={[styles.row, !last && styles.rowDivider, done && { opacity: 0.68 }]}>
      <MiniMedallion dim={done} />
      <Text
        style={[styles.code, done && { color: c.textMuted }]}
        numberOfLines={1}
        onLongPress={__DEV__ && !done ? onDevRedeem : undefined}
      >
        {item.code}
      </Text>
      <View style={styles.rowActions}>
        {done ? (
          <View style={styles.redeemedTag}>
            <CircleCheck size={15} color={colors.primary} />
            <Text style={styles.redeemedText}>{redeemedLabel(item.redeemedAt)}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={onCopy} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Copy code">
              <Copy size={16.5} color={c.textSecondary} strokeWidth={1.9} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRose]} onPress={onShare} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Share code">
              <ShareIcon size={16.5} color={colors.roseDark} strokeWidth={1.9} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function GiftWalletScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const { codes, available, redeemed, totalCount, markRedeemed } = useGiftWallet();

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    logEvent('gift_code_copied');
    showToast('Code copied');
  };

  // Untracked by design — nothing is recorded about the share itself.
  // TODO(backend): include the https://soberdailies.com/gift/<code> universal
  // link once the redeem deep link exists.
  const shareCode = async (code: string) => {
    logEvent('gift_code_share_opened');
    try {
      await Share.share({
        message: `Three months of Sober Dailies, on me — everything in the app, nothing to pay. Get the app and enter this code: ${code}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.eyebrow}>PASS IT ON</Text>
        <Text style={styles.title}>Gifts to give</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {codes.length === 0 ? (
          /* never-bought state — the Give row / tile is the entry */
          <View style={styles.empty}>
            <View style={styles.emptyCoin}>
              <GiftGlyph size={30} color={colors.roseDark} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>No gifts yet</Text>
            <Text style={styles.emptyBody}>
              Buy gift codes and hand them to a sponsee or newcomer — each one unlocks three months
              of everything.
            </Text>
            <TouchableOpacity style={[styles.cta, { alignSelf: 'stretch' }]} onPress={() => router.replace('/(main)/pass-it-on')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.ctaText}>Give Sober Dailies</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* cumulative counter — running out is the success state */}
            <View style={styles.counterCard}>
              <View style={styles.counterCoin}>
                <GiftGlyph size={24} color={colors.roseDark} strokeWidth={1.7} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.counterNumRow}>
                  <Text style={styles.counterNum}>{available.length}</Text>
                  <Text style={styles.counterOf}>of {totalCount} left to give</Text>
                </View>
                <Text style={styles.counterSub}>
                  {available.length === 0 ? 'Every gift found a home.' : 'Each code unlocks 3 months'}
                </Text>
              </View>
            </View>

            {available.length > 0 && (
              <>
                <Text style={styles.groupLabel}>READY TO GIVE</Text>
                <View style={styles.card}>
                  {available.map((item, i) => (
                    <LedgerRow
                      key={item.code}
                      item={item}
                      last={i === available.length - 1}
                      onCopy={() => copyCode(item.code)}
                      onShare={() => shareCode(item.code)}
                      onDevRedeem={() => markRedeemed(item.code)}
                    />
                  ))}
                </View>
              </>
            )}

            {redeemed.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { marginTop: 18 }]}>RECEIVED</Text>
                <View style={styles.card}>
                  {redeemed.map((item, i) => (
                    <LedgerRow key={item.code} item={item} last={i === redeemed.length - 1} />
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.cta, { marginTop: 20 }]} onPress={() => router.push('/(main)/pass-it-on')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.ctaText}>Give more</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>
              The app doesn’t track who you give a code to — that stays between you and them. A code
              is live until someone redeems it.
            </Text>
          </>
        )}
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
    eyebrow: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: colors.roseDark, marginBottom: 4 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    scroll: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 48 },

    counterCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18,
      borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      ...shadows.sm, marginBottom: 16,
    },
    counterCoin: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    counterNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    counterNum: { fontFamily: fontFamily.displayBold, fontSize: 32, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
    counterOf: { fontFamily: fontFamily.medium, fontSize: 14, color: c.textMuted },
    counterSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 4 },

    groupLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.2, color: c.textMuted, marginHorizontal: 6, marginBottom: 8 },
    card: { borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...shadows.sm },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
    medallion: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.roseSoft,
      borderWidth: 1.5, borderColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    },
    medallionNum: { fontFamily: fontFamily.displayBold, fontSize: 11.5, lineHeight: 12, color: colors.roseDark },
    medallionUnit: { fontFamily: fontFamily.bold, fontSize: 5.5, letterSpacing: 0.6, lineHeight: 7, color: colors.roseDark },
    code: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, letterSpacing: 1.5, color: c.text, fontVariant: ['tabular-nums'] },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
      width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    iconBtnRose: { backgroundColor: colors.roseSoft, borderColor: isDark ? 'rgba(217,131,143,0.4)' : '#E3BCC3' },
    redeemedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    redeemedText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: c.textMuted },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    footnote: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 12, marginHorizontal: 6 },

    empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
    emptyCoin: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontFamily: fontFamily.displayBold, fontSize: 20, color: c.text, marginTop: 16 },
    emptyBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 21, color: c.textSecondary, textAlign: 'center', maxWidth: 270, marginTop: 8, marginBottom: 22 },

    toast: {
      position: 'absolute', bottom: 64, alignSelf: 'center',
      backgroundColor: isDark ? c.surfaceRaised : c.text, paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 999, ...shadows.lg,
    },
    toastText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: isDark ? c.text : '#FFFFFF' },
  });
};
