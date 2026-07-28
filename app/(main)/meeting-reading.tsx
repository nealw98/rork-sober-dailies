// Single Meeting Reading (redesign 3.0), per hifi-literature.jsx
// ScreenMeetingReading: a distraction-free Lora reader for the public-domain
// passages. Renders numbered lists (Steps/Traditions) with a hanging indent,
// "Header\nbody" blocks (the format guide), and prose. Reading text scales
// with the OS text-size (Dynamic Type) via the fixed base.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import BackButton from '@/components/BackButton';
import { getMeetingReading } from '@/constants/meeting-readings';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const AMBER_INK = '#B27330';

export default function MeetingReadingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reading = id ? getMeetingReading(id) : undefined;
  useScreenTimeTracking('Meeting Reading');

  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const insets = useSafeAreaInsets();
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);

  const { readingSize: size, readingLineHeight: lineHeight } = useReadingSize();
  // The reader serif matches the Big Book reader's optical size (Lora reads a step larger).
  const body = { fontFamily: readerSerif, fontSize: size, lineHeight, color: c.text } as const;

  if (!reading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}><BackButton onPress={() => router.back()} /></View>
        <Text style={styles.missing}>That reading couldn’t be found.</Text>
      </SafeAreaView>
    );
  }

  const paragraphs = reading.content.split('\n\n');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <BackButton onPress={() => router.back()} />
        <Pressable onPress={() => setSizeSheetOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Text size" style={styles.aaBtn}>
          <Text style={styles.aaLabel}>aA</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
      </ScrollView>

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  headerBar: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aaBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  aaLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 26, paddingBottom: 56 },
  title: { fontFamily: fontFamily.display, fontSize: 25, letterSpacing: -0.3, color: c.text, lineHeight: 30 },
  source: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 5, letterSpacing: 0.2 },
  divider: { height: 1, backgroundColor: c.divider, marginTop: 20 },
  missing: { fontFamily: fontFamily.regular, fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 40 },

  numRow: { flexDirection: 'row' },
  numLabel: { textAlign: 'left' },
  // Section labels: warm amber on light; on dark the amber alias is the
  // brightened teal (tokens.md — legacy amber alias = teal in the ramp).
  blockLabel: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.2, color: isDark ? colors.amber : AMBER_INK },
  });
};
