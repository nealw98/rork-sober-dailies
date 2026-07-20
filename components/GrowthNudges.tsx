// Growth nudges on Today (schedule + gating: lib/growthPrompts.ts).
//
// One alternating use-day schedule — 30 invite · 60 gift · 90 invite · … every
// 30 use-days for six months, then every 90. Each slot renders as either:
//  • Invite card — inline under the sobriety counter, persists until
//    dismissed/acted → Invite Friends.
//  • Gift sheet — a bottom sheet at app open (requires 60+ days sober, else
//    the slot downgrades to an invite card): points at Pass It On, or at the
//    wallet when unshared months remain. One showing consumes the slot.
//
// At most one nudge appears per app session (claimNudgeSession). The
// app-review prompt is a separate, non-promotional system (lib/reviewPrompt.ts).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, X } from 'lucide-react-native';
import GiftGlyph from '@/components/GiftGlyph';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useGiftCredits } from '@/hooks/use-gift-credits';
import { logEvent } from '@/lib/analytics';
import { shareApp } from '@/lib/shareApp';
import {
  recordUseDay, pendingGrowthSlot, markGrowthSlotDone, claimNudgeSession,
} from '@/lib/growthPrompts';

export default function GrowthNudges() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const sobriety = useSobriety();
  const { balance } = useGiftCredits();

  const [inviteThreshold, setInviteThreshold] = useState<number | null>(null);
  const [giftVisible, setGiftVisible] = useState(false);

  const soberDays = sobriety.sobrietyDate ? sobriety.calculateDaysSober() : null;
  const ready = !sobriety.isLoading;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      const useDays = await recordUseDay();
      const slot = await pendingGrowthSlot(useDays, soberDays);
      if (!slot || !alive) return;
      if (slot.type === 'invite') {
        // The card persists across sessions until dismissed/acted — either
        // resolves the slot. It claims the session, so nothing else shows.
        claimNudgeSession();
        setInviteThreshold(slot.threshold);
        logEvent('growth_nudge', { type: 'invite', action: 'shown', threshold: slot.threshold });
        return;
      }
      if (claimNudgeSession()) {
        // Gift sheet: one showing consumes the slot (dismissing is resolving).
        setGiftVisible(true);
        markGrowthSlotDone(slot.threshold);
        logEvent('growth_nudge', { type: 'gift', action: 'shown', threshold: slot.threshold });
      }
    })();
    return () => { alive = false; };
    // Run once when sobriety data is ready — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const inviteAct = () => {
    if (inviteThreshold != null) {
      markGrowthSlotDone(inviteThreshold);
      logEvent('growth_nudge', { type: 'invite', action: 'tap', threshold: inviteThreshold });
    }
    setInviteThreshold(null);
    shareApp();
  };
  const inviteDismiss = () => {
    if (inviteThreshold != null) {
      markGrowthSlotDone(inviteThreshold);
      logEvent('growth_nudge', { type: 'invite', action: 'dismiss', threshold: inviteThreshold });
    }
    setInviteThreshold(null);
  };

  const hasGifts = balance > 0;
  const giftAct = () => {
    logEvent('growth_nudge', { type: 'gift', action: 'tap', gifts: balance });
    setGiftVisible(false);
    router.push('/(main)/pass-it-on');
  };
  const giftDismiss = () => {
    logEvent('growth_nudge', { type: 'gift', action: 'dismiss' });
    setGiftVisible(false);
  };

  return (
    <>
      {inviteThreshold != null && (
        <View style={styles.inviteCard}>
          <View style={styles.inviteIcon}>
            <UserPlus size={18} color={colors.roseDark} strokeWidth={2} />
          </View>
          <View style={styles.inviteBody}>
            <Text style={styles.inviteTitle}>Know someone who could use this?</Text>
            <Text style={styles.inviteSub}>
              If Sober Dailies is helping, a personal invite from you means more than any ad.
            </Text>
            <Pressable onPress={inviteAct} hitSlop={6} accessibilityRole="button">
              <Text style={styles.inviteCta}>Invite a friend</Text>
            </Pressable>
          </View>
          <Pressable onPress={inviteDismiss} hitSlop={10} style={styles.inviteClose} accessibilityRole="button" accessibilityLabel="Dismiss">
            <X size={15} color={c.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>
      )}

      {giftVisible && (
        <Modal visible transparent animationType="slide" onRequestClose={giftDismiss}>
          <Pressable style={styles.sheetScrim} onPress={giftDismiss} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={{ alignItems: 'center' }}>
              <View style={styles.sheetCoin}>
                <GiftGlyph size={28} color={colors.roseDark} strokeWidth={1.6} />
              </View>
              <Text style={styles.sheetTitle}>Pass it on</Text>
              <Text style={styles.sheetBody}>
                {hasGifts
                  ? `You have ${balance} ${balance === 1 ? 'pass' : 'passes'} to give — 3 free months each. Know a sponsee or newcomer who could use one?`
                  : 'Know a sponsee or newcomer who could use three months of Sober Dailies? Members receive passes to give.'}
              </Text>
            </View>
            <TouchableOpacity style={styles.sheetCta} onPress={giftAct} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.sheetCtaText}>{hasGifts ? 'Give a pass' : 'Pass It On'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quietBtn} onPress={giftDismiss} activeOpacity={0.6} accessibilityRole="button">
              <Text style={styles.quietBtnText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    inviteCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      marginTop: 14, padding: 13, borderRadius: 14,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard,
    },
    inviteIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    inviteBody: { flex: 1 },
    inviteTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text, letterSpacing: -0.2 },
    inviteSub: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: c.textMuted, marginTop: 2 },
    inviteCta: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.roseDark, marginTop: 8 },
    inviteClose: { padding: 2 },

    sheetScrim: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 10, paddingHorizontal: 26, paddingBottom: 40, ...shadows.lg,
    },
    sheetHandle: { width: 40, height: 4.5, borderRadius: 3, backgroundColor: c.divider, alignSelf: 'center', marginBottom: 20 },
    sheetCoin: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 23, letterSpacing: -0.4, color: c.text, marginTop: 14 },
    sheetBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textSecondary, textAlign: 'center', maxWidth: 300, marginTop: 8, marginBottom: 20 },
    sheetCta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: colors.rose,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.rose, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    sheetCtaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    quietBtn: { paddingVertical: 13, alignItems: 'center', marginTop: 6 },
    quietBtnText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.textMuted },
  });
};
