/**
 * MeetingReadingContent — one meeting reading's body, extracted from the
 * pushed reader screen (app/(main)/meeting-reading.tsx) so the 3.5 wide
 * layouts can render the same reading in the Literature tab's detail pane.
 *
 * Renders the title, source, and the three paragraph forms the readings use:
 * numbered lists (Steps/Traditions) with a hanging indent, "Header\nbody"
 * blocks (the format guide), and prose — all in the reader serif at the
 * shared "Aa" reading size. Pure content: the caller owns the chrome
 * (back button, aA control, scroll container).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import type { MeetingReading } from '@/constants/meeting-readings';

const AMBER_INK = '#B27330';

export default function MeetingReadingContent({ reading }: { reading: MeetingReading }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const { readingSize: size, readingLineHeight: lineHeight } = useReadingSize();
  // The reader serif matches the Big Book reader's optical size (Lora reads a step larger).
  const body = { fontFamily: readerSerif, fontSize: size, lineHeight, color: c.text } as const;

  const paragraphs = reading.content.split('\n\n');

  return (
    <>
      <Text style={styles.title}>{reading.title}</Text>
      <Text style={styles.source}>{reading.source}</Text>
      <View style={styles.divider} />

      {paragraphs.map((p, i) => {
        const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
        const isNumbered = lines.length > 1 && lines.every((l) => /^\d+\.\s/.test(l));

        if (isNumbered) {
          return (
            <View key={i} style={{ marginTop: i === 0 ? 18 : 22 }}>
              {lines.map((l, j) => {
                const m = l.match(/^(\d+)\.\s+([\s\S]*)$/);
                const num = m ? m[1] : '';
                const rest = m ? m[2] : l;
                return (
                  <View key={j} style={[styles.numRow, j > 0 && { marginTop: 11 }]}>
                    <Text style={[body, styles.numLabel, { width: size * 1.6 }]}>{num}.</Text>
                    <Text style={[body, styles.flex]}>{rest}</Text>
                  </View>
                );
              })}
            </View>
          );
        }

        // "Header\nbody" block — short first line with no terminal punctuation.
        const headerLike = lines.length > 1 && lines[0].length <= 28 && !/[.?!"”)]$/.test(lines[0]);
        if (headerLike) {
          return (
            <View key={i} style={{ marginTop: i === 0 ? 20 : 28 }}>
              <Text style={styles.blockLabel}>{lines[0].toUpperCase()}</Text>
              <Text style={[body, { marginTop: 8 }]}>{lines.slice(1).join('\n')}</Text>
            </View>
          );
        }

        return (
          <Text key={i} style={[body, { marginTop: i === 0 ? 20 : 18 }]}>{lines.join('\n')}</Text>
        );
      })}
    </>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    title: { fontFamily: fontFamily.display, fontSize: 25, letterSpacing: -0.3, color: c.text, lineHeight: 30 },
    source: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 5, letterSpacing: 0.2 },
    divider: { height: 1, backgroundColor: c.divider, marginTop: 20 },
    numRow: { flexDirection: 'row' },
    numLabel: { textAlign: 'left' },
    // Section labels: warm amber on light; on dark the amber alias is the
    // brightened teal (tokens.md — legacy amber alias = teal in the ramp).
    blockLabel: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.2, color: isDark ? colors.amber : AMBER_INK },
  });
};
