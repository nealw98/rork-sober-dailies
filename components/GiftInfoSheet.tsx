// "How Pass It On works" — the instructions sheet behind the ? button on the
// Pass It On screen. Credits model (docs/invite-rewards-design.md §0): gifts
// are earned with membership, each one is a link that unlocks 3 free months
// for someone new, and the whole thing runs through the recipient's own
// app store — no codes to read out, nothing for the giver to track.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

const STEPS: { t: string; d: string }[] = [
  { t: 'You receive passes with membership', d: 'Annual members receive 5 passes a year. Monthly members receive one at signup and another every 3 months. Each pass is 3 free months of everything in the app.' },
  { t: 'Give one away', d: 'Pick someone from your contacts and a personal text goes to them — a sponsee, a newcomer, anyone who could use it. Each pass is a private link, just for them.' },
  { t: 'They get 3 months free', d: 'Your friend opens the link, picks a plan, and their app store sets them up — 3 months free, nothing charged, cancel anytime. They install the app and everything is already unlocked.' },
  { t: 'Sent it to the wrong person?', d: 'A pass belongs to whoever uses it first — if your friend already has the app, they can pass the same link along to someone who needs it.' },
  { t: 'After the 3 months', d: 'They decide for themselves whether to keep going — their app store reminds them before anything is billed.' },
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
