import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PenLine } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, getSemanticColors } from '@/constants/designTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

/**
 * Journey tab — the look-back surface (day feed + Trends).
 * Deferred for this build pass (net-new analytics, computed from local stores).
 * Branded placeholder for now so the tab is navigable.
 */
export default function JourneyScreen() {
  useScreenTimeTracking('Journey');
  const c = getSemanticColors('light');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Journey</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Your path of recovery.</Text>
      </View>
      <View style={styles.empty}>
        <View style={styles.medallion}>
          <PenLine size={26} color="#fff" strokeWidth={2} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Coming soon</Text>
        <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
          Your day-by-day feed and trends will live here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.displayBold, fontSize: fontSize.hero, letterSpacing: -0.5 },
  subtitle: { fontFamily: fontFamily.serifItalic, fontSize: fontSize.lg, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  medallion: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, textAlign: 'center', lineHeight: 21 },
});
