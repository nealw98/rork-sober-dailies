/**
 * ReflectionPane — the Today reading pane (3.5 wide layouts, handoff Screen 1).
 *
 * On expanded widths the Daily Reflection renders HERE, beside the dailies
 * list, instead of pushing the full-screen reader. Layout per the handoff
 * mock: eyebrow ("Daily Reflections · <date>"), serif title, the pull-quote
 * in a soft teal-tinted block, the reflection body at reading width, then an
 * action row — Mark done (filled pill) and Journal about this (outline pill).
 * The meditation tile and copyright follow the pushed reader so the pane is a
 * complete, faithful reading of the day.
 *
 * Typography matches the reader: Lora title, reader serif at the shared "Aa"
 * reading size, and the same *emphasis* markup via withEmphasis.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Check, PenLine, Sparkles } from 'lucide-react-native';

import ReadingColumn from '@/components/layout/ReadingColumn';
import { withEmphasis, EM_ITALIC, EM_UPRIGHT } from '@/components/DailyReflection';
import { titleCase } from '@/lib/titleCase';
import { fontFamily, radii, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import type { Reflection } from '@/types';

export default function ReflectionPane({ reflection, dateLabel, done, onToggleDone }: {
  reflection: Reflection | null;
  dateLabel: string;
  done: boolean;
  onToggleDone: () => void;
}) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const { readingSize: readSize, readingLineHeight: readLine } = useReadingSize();

  if (!reflection) return <View style={styles.flex} />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ReadingColumn>
        <Text style={styles.eyebrow}>Daily Reflections · {dateLabel}</Text>
        <Text style={styles.title}>{titleCase(reflection.title)}</Text>

        {/* Pull-quote in a soft teal-tinted block (handoff Screen 1) */}
        <View style={styles.quoteBlock}>
          <Text style={[styles.quote, { fontSize: readSize, lineHeight: readLine - Math.round(readSize * 0.1) }]}>
            {withEmphasis(reflection.quote, EM_UPRIGHT)}
          </Text>
          <Text style={styles.source}>— {reflection.source}</Text>
        </View>

        {/* Reflection body */}
        <View style={styles.bodyWrap}>
          {reflection.reflection.split('\n\n').map((p, i) => (
            <Text key={i} style={[styles.body, { fontSize: readSize, lineHeight: readLine, marginTop: i === 0 ? 0 : 14 }]}>
              {withEmphasis(p, EM_ITALIC)}
            </Text>
          ))}
        </View>

        {/* Action row — completion stays manual, same rule as the Today list. */}
        <View style={styles.actions}>
          <Pressable
            onPress={onToggleDone}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            style={[styles.doneBtn, done ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.primary }]}
          >
            {done && <Check size={14} color="#fff" strokeWidth={3} />}
            <Text style={[styles.doneBtnText, { color: done ? '#fff' : colors.primaryDark }]}>
              {done ? 'Done' : 'Mark done'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/journal' as Href)}
            accessibilityRole="button"
            style={styles.journalBtn}
          >
            <PenLine size={14} color={colors.primaryDark} strokeWidth={2} />
            <Text style={styles.journalText}>Journal about this</Text>
          </Pressable>
        </View>

        {/* Meditation tile + copyright — parity with the pushed reader. */}
        <View style={styles.medTile}>
          <View style={styles.medLabelRow}>
            <Sparkles size={11} color={colors.primaryDark} strokeWidth={2} />
            <Text style={styles.medLabel}>MEDITATION</Text>
          </View>
          <Text style={[styles.medText, { fontSize: readSize, lineHeight: Math.round(readSize * 1.4) }]}>
            &ldquo;{withEmphasis(reflection.thought, EM_UPRIGHT)}&rdquo;
          </Text>
        </View>
        <Text style={styles.copyright}>
          Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
        </Text>
      </ReadingColumn>
    </ScrollView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 48 },
    eyebrow: {
      fontFamily: fontFamily.bold,
      fontSize: 11,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: c.textMuted,
      marginBottom: 10,
    },
    title: {
      fontFamily: fontFamily.serifMedium,
      fontSize: 30,
      lineHeight: 37,
      color: c.text,
      marginBottom: 20,
    },
    quoteBlock: {
      backgroundColor: colors.primarySoft,
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginBottom: 22,
    },
    quote: { fontFamily: readerSerif, fontStyle: 'italic', color: c.text },
    source: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 10 },
    bodyWrap: {},
    body: { fontFamily: readerSerif, color: c.text },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    doneBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14 },
    journalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radii.full,
      borderWidth: 1.5,
      borderColor: isDark ? c.border : colors.primaryDark + '55',
    },
    journalText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primaryDark },
    medTile: {
      marginTop: 30,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    medLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    medLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.2, color: colors.primaryDark },
    medText: { fontFamily: readerSerif, fontStyle: 'italic', color: c.text },
    copyright: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, marginTop: 24 },
  });
};
