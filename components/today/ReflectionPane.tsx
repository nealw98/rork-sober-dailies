/**
 * ReflectionPane — the Today reading pane (3.5 wide layouts, handoff Screen 1).
 *
 * On expanded widths the Daily Reflection renders HERE, beside the dailies
 * list, instead of pushing the full-screen reader. Layout per the handoff
 * mock: eyebrow ("Daily Reflections · <date>"), serif title, then the same
 * reading as the pushed reader — pull-quote on a teal rule, body, the teal
 * Meditation tile — with the shared action row (Mark done, Journal about
 * this) after the body.
 *
 * Typography matches the reader: Lora title, reader serif at the shared "Aa"
 * reading size, and the same *emphasis* markup via withEmphasis.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import ReadingColumn from '@/components/layout/ReadingColumn';
import ReflectionActions from '@/components/today/ReflectionActions';
import { withEmphasis, splitParagraphs, EM_ITALIC, EM_UPRIGHT } from '@/components/DailyReflection';
import { titleCase } from '@/lib/titleCase';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import type { Reflection } from '@/types';

export default function ReflectionPane({ reflection, dateLabel, done, onToggleDone }: {
  reflection: Reflection | null;
  dateLabel: string;
  done: boolean;
  onToggleDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const { readingSize: readSize, readingLineHeight: readLine } = useReadingSize();

  if (!reflection) return <View style={styles.flex} />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ReadingColumn>
        <Text style={styles.eyebrow}>Daily Reflections · {dateLabel}</Text>
        <Text style={styles.title}>{titleCase(reflection.title)}</Text>

        {/* Pull-quote on a teal rule, as in the pushed reader */}
        <View style={styles.quoteWrap}>
          <Text style={[styles.quote, { fontSize: readSize, lineHeight: readLine - Math.round(readSize * 0.1) }]}>
            {withEmphasis(reflection.quote, EM_UPRIGHT)}
          </Text>
          <Text style={styles.source}>— {reflection.source}</Text>
        </View>

        {/* Reflection body */}
        <View style={styles.bodyWrap}>
          {splitParagraphs(reflection.reflection).map((p, i) => (
            <Text key={i} style={[styles.body, { fontSize: readSize, lineHeight: readLine, marginTop: i === 0 ? 0 : 14 }]}>
              {withEmphasis(p, EM_ITALIC)}
            </Text>
          ))}
        </View>

        <ReflectionActions done={done} onToggleDone={onToggleDone} />

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
  const { c, colors } = tk;
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
    // Quote, body and Meditation match the pushed reader (DailyReflection).
    quoteWrap: { paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: colors.primary },
    quote: { ...readerSerifItalic, color: c.text, letterSpacing: -0.05 },
    source: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.textMuted, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
    bodyWrap: { marginTop: 28 },
    body: { fontFamily: readerSerif, color: c.text, letterSpacing: -0.05 },
    medTile: { marginTop: 30, padding: 18, backgroundColor: colors.primarySoft, borderRadius: 18, borderWidth: 1, borderColor: colors.primary + '28' },
    medLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    medLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.4, color: colors.primaryDark },
    medText: { ...readerSerifItalic, color: c.text, letterSpacing: -0.3 },
    copyright: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, marginTop: 24 },
  });
};
