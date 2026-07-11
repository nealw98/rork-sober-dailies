// "How Pass It On works" — a shared instructions sheet for the purchase screen
// and the wallet (opened by the ? button in each header). Four steps, including
// how the recipient redeems a code. NOTE: step 3 describes the "Have a code?"
// redemption entry point, which is built in the paywall sprint — these
// instructions assume it exists before Pass It On ships to real users.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

const STEPS: { t: string; d: string }[] = [
  { t: 'Buy gift codes', d: 'One, five, or ten at a time. Each code is a 3-month pass to everything in the app.' },
  { t: 'Share a code', d: 'Hand it out however you like — in person, by text, or at a meeting.' },
  { t: 'They redeem it', d: 'They install the free Sober Dailies app and tap “Have a code?” on the subscribe screen, then enter the code. Three months of full access unlock right away — no charge, and nothing renews.' },
  { t: 'When it runs out', d: 'After three months, they’re asked to subscribe on their own — or redeem another code from you.' },
  { t: 'Track your gifts', d: 'Your wallet shows which codes are still available and which have been redeemed. Add a private note to remember who each one is for.' },
];

export default function GiftInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>How Pass It On works</Text>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.badge}><Text style={styles.badgeNum}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepBody}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.ctaText}>Got it</Text>
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
    handle: { width: 40, height: 4.5, borderRadius: 3, backgroundColor: c.divider, alignSelf: 'center', marginBottom: 20 },
    title: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
    steps: { marginTop: 18, gap: 18 },
    step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    badge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    badgeNum: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.roseDark },
    stepTitle: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: c.text },
    stepBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textSecondary, marginTop: 3 },
    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center', marginTop: 26,
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
  });
};
