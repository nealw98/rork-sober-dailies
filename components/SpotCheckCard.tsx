// The spot-check context card rendered inside a sponsor chat thread — the
// entry "rides along" into the conversation when the user taps "Keep talking".
// Per the design canvas chat-handoff frame: bordered surface card, terracotta
// "SPOT CHECK" chip label, the what's-going-on text, and the feelings list.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import type { SpotCheckEntry } from '@/types/spotCheck';
import { fontFamily, families, type Tokens } from '@/constants/designTokens';
import { useThemedStyles } from '@/hooks/useTokens';

export function SpotCheckCard({ entry }: { entry: SpotCheckEntry }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <View style={styles.badge}>
          <Check size={12} color="#fff" strokeWidth={2.6} />
        </View>
        <Text style={styles.label}>SPOT CHECK · JUST NOW</Text>
      </View>
      <Text style={styles.body} numberOfLines={4}>{entry.whatsGoingOn}</Text>
      <Text style={styles.feelings}>{entry.feelings.join(' · ')}</Text>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const terracotta = families.terracotta;
  return StyleSheet.create({
    card: {
      alignSelf: 'center',
      maxWidth: 320,
      width: '100%',
      borderRadius: 14,
      backgroundColor: isDark ? c.surfaceRaised : c.surface,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
    badge: { width: 20, height: 20, borderRadius: 6, backgroundColor: terracotta[500], alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1, color: isDark ? terracotta[300] : terracotta[700] },
    body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19.5, color: c.textSecondary, marginBottom: 8 },
    feelings: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: isDark ? terracotta[300] : terracotta[700] },
  });
};
