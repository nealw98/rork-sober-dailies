// Pass It On — recipient side: "Have a code?" redemption (spec §6.4/§6.5).
//
// Standalone screen for this round (the RC paywall swap that will also host a
// "Have a code?" entry is deferred; this decouples redemption from it). Entry
// point lives in Settings → Pass It On. Two real actions, kept distinct per
// spec §6.5: Redeem talks to OUR backend (gifts-redeem → grants a 3-month
// `premium` promotional entitlement), while Restore Purchase asks Apple/RC
// about THIS Apple ID — different systems, both surfaced here.
//
// On success we refresh the subscription so the granted entitlement takes hold
// immediately (drops the paywall once it's on). Server enforces first-redeemer-
// wins, self-redemption block, and already-subscribed decline; this screen just
// renders the outcome.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, type Href } from 'expo-router';
import { CircleCheck, Check, AlertCircle } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useSubscription } from '@/hooks/useSubscription';
import { redeemGiftCode, type RedeemReason } from '@/lib/giftService';
import { logEvent } from '@/lib/analytics';

const ROSE_FILL = lightColors.rose;
const HOME: Href = '/(main)/(tabs)' as Href;

// Restore asks the platform's own store about the current account (spec §6.5).
const RESTORE_ACCOUNT = Platform.OS === 'ios' ? 'Apple ID' : 'Google account';

// Light-touch normalize for display: uppercase only. The server does the real
// normalization (trims, strips spaces). Placeholder shows the SD-XXXX-XXXX shape.
const clean = (s: string) => s.toUpperCase();

const expiryLabel = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Reasons that describe THIS code specifically get the inline warning box;
// everything else is shown as a plain message under the field.
const isCodeSpecific = (r?: RedeemReason) => r === 'invalid' || r === 'already_redeemed';

export default function RedeemScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { refresh, restorePurchases } = useSubscription();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<{ reason?: RedeemReason; message: string } | null>(null);
  const [done, setDone] = useState(false);

  const canRedeem = code.replace(/[^A-Z0-9]/gi, '').length >= 8 && !busy;

  const submit = async () => {
    if (!canRedeem) return;
    setBusy(true);
    setError(null);
    logEvent('gift_redeem_attempted');
    try {
      const res = await redeemGiftCode(code);
      if (res.success) {
        logEvent('gift_redeem_succeeded');
        await refresh(); // adopt the freshly-granted entitlement
        setDone(true);
      } else {
        logEvent('gift_redeem_failed', { reason: res.reason });
        setError({ reason: res.reason, message: res.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const active = !!info?.entitlements.active?.premium;
      if (active) {
        await refresh();
        setDone(true);
      } else {
        setError({ message: `No previous purchase found on this ${RESTORE_ACCOUNT}. If you have a code, enter it above.` });
      }
    } finally {
      setRestoring(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <View style={styles.headerTop}><BackButton onPress={() => router.replace(HOME)} /></View>
        </View>
        <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.successCoin}>
            <CircleCheck size={42} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.successTitle}>You’re in</Text>
          <Text style={styles.successQuote}>
            A gift from someone in the fellowship. One day at a time — starting today.
          </Text>

          <View style={styles.detailCard}>
            {[
              ['Everything unlocked', `through ${expiryLabel()}`],
              ['No charge', 'and no card on file'],
              ['Nothing renews', 'when it ends, it simply ends'],
            ].map((r, i) => (
              <View key={r[0]} style={[styles.detailRow, i < 2 && styles.detailDivider]}>
                <Check size={16} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.detailLabel}>{r[0]}</Text>
                <Text style={styles.detailValue}>{r[1]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.cta, styles.ctaBrand]} onPress={() => router.replace(HOME)} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.ctaText}>Start your day</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerTop}><BackButton onPress={() => router.back()} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <View style={styles.coin}>
            <GiftGlyph size={32} color={colors.roseDark} strokeWidth={1.6} />
          </View>
          <Text style={styles.title}>Have a code?</Text>
          <Text style={styles.body}>
            If someone gave you a Sober Dailies code, enter it here. It unlocks everything for three
            months — their gift to you.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.codeField, error && isCodeSpecific(error.reason) && styles.codeFieldError]}
            value={code}
            onChangeText={(t) => { setCode(clean(t)); if (error) setError(null); }}
            placeholder="SD-XXXX-XXXX"
            placeholderTextColor={c.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            maxLength={14}
            onSubmitEditing={submit}
            editable={!busy}
            textAlign="center"
          />

          {error && isCodeSpecific(error.reason) ? (
            <View style={styles.warnBox}>
              <AlertCircle size={16} color={colors.roseDark} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>
                  {error.reason === 'already_redeemed' ? 'This code has already been used' : 'That code isn’t valid'}
                </Text>
                <Text style={styles.warnBody}>
                  {error.reason === 'already_redeemed'
                    ? 'Codes work once. Check with the person who gave it to you — they may have another.'
                    : 'Double-check the letters and numbers, then try again.'}
                </Text>
              </View>
            </View>
          ) : error ? (
            <Text style={styles.plainError}>{error.message}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.cta, { marginTop: 12 }, !canRedeem && { opacity: 0.5 }]}
            onPress={submit}
            disabled={!canRedeem}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{busy ? 'One moment…' : 'Redeem'}</Text>
          </TouchableOpacity>
          <Text style={styles.subNote}>Nothing to pay. Nothing renews.</Text>
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.restoreWrap}>
            <Text style={styles.restoreLead}>Already paid for Sober Dailies on this {RESTORE_ACCOUNT}?</Text>
            <TouchableOpacity onPress={restore} disabled={restoring} activeOpacity={0.6} accessibilityRole="button">
              <Text style={styles.restoreLink}>{restoring ? 'Checking…' : 'Restore Purchase'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scroll: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },

    intro: { alignItems: 'center', textAlign: 'center', paddingTop: 22 },
    coin: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fontFamily.displayBold, fontSize: 26, letterSpacing: -0.4, color: c.text, marginTop: 18 },
    body: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 300, marginTop: 10 },

    form: { marginTop: 30 },
    codeField: {
      fontFamily: fontFamily.semiBold, fontSize: 19, letterSpacing: 2.5, color: c.text,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingVertical: 16, paddingHorizontal: 16, ...shadows.sm,
    },
    codeFieldError: { borderWidth: 1.5, borderColor: colors.roseDark },

    warnBox: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 12, marginHorizontal: 2,
      padding: 12, borderRadius: 12, backgroundColor: colors.roseSoft,
      borderWidth: 1, borderColor: isDark ? 'rgba(217,131,143,0.35)' : 'rgba(181,90,104,0.2)',
    },
    warnTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: colors.roseDark },
    warnBody: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: c.textSecondary, marginTop: 3 },
    plainError: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: 'center', marginTop: 12, marginHorizontal: 6 },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaBrand: { backgroundColor: colors.primary, shadowColor: colors.primary },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    subNote: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 12 },

    restoreWrap: { marginTop: 'auto', paddingTop: 40, alignItems: 'center' },
    restoreLead: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
    restoreLink: { fontFamily: fontFamily.semiBold, fontSize: 13, color: c.textSecondary, marginTop: 2 },

    // Success
    successScroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 40, flexGrow: 1 },
    successCoin: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 26 },
    successTitle: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5, color: c.text, textAlign: 'center', marginTop: 20 },
    successQuote: { fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 17, lineHeight: 26, color: c.textSecondary, textAlign: 'center', maxWidth: 300, alignSelf: 'center', marginTop: 12 },
    detailCard: {
      marginTop: 30, paddingHorizontal: 18, paddingVertical: 4, borderRadius: 14,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm,
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    detailDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
    detailLabel: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.text },
    detailValue: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginLeft: 'auto', textAlign: 'right', flexShrink: 1 },
  });
};
