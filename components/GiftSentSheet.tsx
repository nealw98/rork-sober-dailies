// Gift sent — the confirmation moment after a gift text actually goes out
// (design handoff "gift surfaces" §4). Fires ONLY on the sent path, after
// confirmShareSent() + refresh() — never implies a cancelled share spent a
// gift. Rose coin with a teal check badge: teal takes the handoff once the
// rose gift moment completes.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import GiftGlyph from '@/components/GiftGlyph';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

export default function GiftSentSheet({
  name,
  balance,
  onGiveAnother,
  onClose,
}: {
  name: string | null; // null = went out via the OS share sheet, recipient unknown
  balance: number;
  onGiveAnother: () => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={{ alignItems: 'center' }}>
          <View style={styles.coin}>
            <GiftGlyph size={30} color={colors.roseDark} strokeWidth={1.6} />
            <View style={styles.checkBadge}>
              <Check size={13} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
          <Text style={styles.title}>Pass sent</Text>
          <Text style={styles.body}>
            {name
              ? `${name} just got 3 months of Sober Dailies from you. When they open your link, everything unlocks — nothing to pay.`
              : 'Your pass is on its way. When they open your link, everything unlocks — nothing to pay.'}
          </Text>
          {balance > 0 && (
            <Text style={styles.receipt}>
              You have {balance} {balance === 1 ? 'pass' : 'passes'} to give
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.ctaText}>Done</Text>
        </TouchableOpacity>
        {balance > 0 && (
          <TouchableOpacity style={styles.quietBtn} onPress={onGiveAnother} activeOpacity={0.6} accessibilityRole="button">
            <Text style={styles.quietBtnText}>Give another pass</Text>
          </TouchableOpacity>
        )}
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

    coin: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    checkBadge: {
      position: 'absolute', bottom: -2, right: -4,
      width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary,
      borderWidth: 2.5, borderColor: c.surface, alignItems: 'center', justifyContent: 'center',
    },

    title: { fontFamily: fontFamily.displayBold, fontSize: 23, letterSpacing: -0.4, color: c.text, marginTop: 16 },
    body: {
      fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textSecondary,
      textAlign: 'center', maxWidth: 300, marginTop: 9,
    },
    receipt: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.roseDark, marginTop: 14 },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center', marginTop: 22,
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    quietBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    quietBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: colors.roseDark },
  });
};
