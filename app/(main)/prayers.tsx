import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Heart } from 'lucide-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import TopLevelHeader from '@/components/navigation/TopLevelHeader';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { aaPrayers } from '@/constants/prayers';
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
} from '@/constants/designTokens';

const sem = semanticColors.light;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PrayersScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const params = useLocalSearchParams<{ prayer?: string }>();

  useScreenTimeTracking('Prayers');

  // Handle deep link from home screen (e.g., ?prayer=morning)
  useEffect(() => {
    if (params.prayer) {
      const q = params.prayer.toLowerCase();
      const matchIndex = aaPrayers.findIndex((p) => {
        const title = p.title.toLowerCase();
        if (q === 'morning') return title.includes('morning');
        if (q === 'evening') return title.includes('evening');
        return title.includes(q);
      });
      if (matchIndex >= 0) {
        setExpandedIndex(matchIndex);
      }
    }
  }, [params.prayer]);

  const handleToggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.secondary }]}>
        <TopLevelHeader title="" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page intro */}
          <View style={styles.pageIntro}>
            <View style={styles.introLabelRow}>
              <Heart size={14} color={sem.textMuted} />
              <Text style={styles.introLabel}>DAILY PRACTICE</Text>
            </View>
            <Text style={styles.introTitle}>Prayers</Text>
          </View>

          {/* Prayer cards */}
          {aaPrayers.map((prayer, index) => {
            const isExpanded = expandedIndex === index;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleToggle(index)}
                activeOpacity={0.85}
                style={styles.card}
              >
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{prayer.title}</Text>
                  <View style={[styles.chevronWrap, isExpanded && styles.chevronRotated]}>
                    <ChevronDown size={18} color={sem.textMuted} />
                  </View>
                </View>

                {/* Preview or full text */}
                {isExpanded ? (
                  <View style={styles.expandedContent}>
                    <Text style={styles.prayerText}>{prayer.content}</Text>
                    {prayer.source && (
                      <Text style={styles.source}>— {prayer.source}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.previewText} numberOfLines={3}>
                    {prayer.content}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Page Intro ──
  pageIntro: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  introLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  introLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: sem.textMuted,
    letterSpacing: 1.5,
  },
  introTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    color: sem.text,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: sem.text,
    flex: 1,
    paddingRight: spacing.md,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: sem.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },

  // ── Preview ──
  previewText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: sem.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  // ── Expanded ──
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: sem.border,
  },
  prayerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    color: sem.text,
    lineHeight: 26,
  },
  source: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: sem.textMuted,
    textAlign: 'right',
    marginTop: spacing.md,
  },
});
