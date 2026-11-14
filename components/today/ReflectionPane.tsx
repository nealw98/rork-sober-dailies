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
 *
 * Top bar: Expand top-left (where every pane keeps it), and the reader's own
 * aA and Share top-right, so the pane has everything the full reader's
 * header does.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Share as ShareIcon } from 'lucide-react-native';

import PaneExpandButton from '@/components/layout/PaneExpandButton';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';

import ReadingColumn from '@/components/layout/ReadingColumn';
import ReflectionActions from '@/components/today/ReflectionActions';
import { withEmphasis, splitParagraphs, shareReflectionText, EM_ITALIC, EM_UPRIGHT } from '@/components/DailyReflection';
import { titleCase } from '@/lib/titleCase';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';
import type { Reflection } from '@/types';

export default function ReflectionPane({ reflection, dateLabel, done, onToggleDone, onExpand }: {
  reflection: Reflection | null;
  dateLabel: string;
  done: boolean;
  onToggleDone: () => void;
  onExpand: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const insets = useSafeAreaInsets();
  const { readingSize: readSize, readingLineHeight: readLine } = useReadingSize();
  const [sizeOpen, setSizeOpen] = useState(false);

  const body = reflection && (
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

  return (
    <View style={styles.flex}>
      <View style={styles.bar}>
        <PaneExpandButton onPress={onExpand} />
        {reflection && (
          <View style={styles.barActions}>
            <Pressable onPress={() => setSizeOpen(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Text size" style={styles.barBtn}>
              <Text style={styles.barAa}>aA</Text>
            </Pressable>
            <Pressable onPress={() => shareReflectionText(reflection)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Share" style={styles.barBtn}>
              <ShareIcon size={16} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
      {body || <View style={styles.flex} />}
      <ReadingSizeSheet visible={sizeOpen} onClose={() => setSizeOpen(false)} bottomInset={insets.bottom} />
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    flex: { flex: 1 },
    // Expand left; aA and Share right — the reader header's 34pt round buttons.
    bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
    barActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    barAa: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },
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
