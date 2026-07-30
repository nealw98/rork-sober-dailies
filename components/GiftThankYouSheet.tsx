// Post-subscribe thank-you — the designed announcement moment (design handoff
// "gift surfaces" §1, decided with Neal in Claude design 2026-07-20).
//
// ANNOUNCEMENT, not inventory: this sheet informs the new member of the gifts
// they've received; the Pass It On screen shows what they hold. Presented by
// the Today screen on first mount after buy() sets the pending flag — it
// cannot live in the paywall tree, which dissolves the moment isPremium flips.
//
// Annual = five overlapping coins, "5 gifts". Monthly = one coin, "a gift".
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import GiftGlyph from '@/components/GiftGlyph';
import type { AnnouncePlan } from '@/lib/creditsService';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

export default function GiftThankYouSheet({
  plan,
  onSeeGifts,
  onClose,
}: {
  plan: AnnouncePlan;
  onSeeGifts: () => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const annual = plan === 'annual';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={{ alignItems: 'center' }}>
          {annual ? (
            // Five overlapping coins — one per gift.
            <View style={styles.coinRow}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.coinSmall, i > 0 && { marginLeft: -10 }, { zIndex: 5 - i }]}>
                  <GiftGlyph size={22} color={colors.roseDark} strokeWidth={1.7} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.coinLarge}>
              <GiftGlyph size={30} color={colors.roseDark} strokeWidth={1.6} />
            </View>
          )}

          <Text style={styles.title}>Welcome to the family</Text>
          <Text style={styles.serifLine}>
            We hope that using Sober Dailies every day deepens and strengthens your sobriety.
          </Text>
          <Text style={styles.body}>
            {annual ? (
              <>
                <Text style={styles.bodyBold}>Five passes</Text> to give away. Each one is 3 free
                months of Sober Dailies.
              </>
            ) : (
              <>
                <Text style={styles.bodyBold}>One pass</Text> to give away. 3 free months of
                Sober Dailies. Another arrives every 3 months.
              </>
            )}
          </Text>
        </View>

        <TouchableOpacity style={styles.cta} onPress={onSeeGifts} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.ctaText}>{annual ? 'See your passes' : 'See your pass'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quietBtn} onPress={onClose} activeOpacity={0.6} accessibilityRole="button">
          <Text style={styles.quietBtnText}>Later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    scrim: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 10, paddingHorizontal: 24, paddingBottom: 34, ...shadows.lg,
    },
    handle: { width: 40, height: 4.5, borderRadius: 3, backgroundColor: c.divider, alignSelf: 'center', marginBottom: 22 },

    coinRow: { flexDirection: 'row', alignItems: 'center' },
    coinSmall: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: colors.roseSoft,
      borderWidth: 2.5, borderColor: c.surface, alignItems: 'center', justifyContent: 'center',
    },
    coinLarge: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseSoft,
      alignItems: 'center', justifyContent: 'center',
    },

    title: { fontFamily: fontFamily.displayBold, fontSize: 23, letterSpacing: -0.4, color: c.text, marginTop: 16 },
    serifLine: {
      fontFamily: fontFamily.serifItalic, fontSize: 15.5, lineHeight: 23, color: c.textSecondary,
      textAlign: 'center', maxWidth: 300, marginTop: 10,
    },
    body: {
      fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textSecondary,
      textAlign: 'center', maxWidth: 300, marginTop: 14,
    },
    bodyBold: { fontFamily: fontFamily.semiBold, color: colors.roseDark },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center', marginTop: 24,
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    quietBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    quietBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: c.textMuted },
  });
};
