// Single Meeting Reading (redesign 3.0), per hifi-literature.jsx
// ScreenMeetingReading: a distraction-free Lora reader for the public-domain
// passages. Renders numbered lists (Steps/Traditions) with a hanging indent,
// "Header\nbody" blocks (the format guide), and prose. Respects the app's
// global reading text size.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import BackButton from '@/components/BackButton';
import { getMeetingReading } from '@/constants/meeting-readings';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const AMBER_INK = '#B27330';

export default function MeetingReadingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reading = id ? getMeetingReading(id) : undefined;
  useScreenTimeTracking('Meeting Reading');

  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();

  const ts = useTextSettings();
  const size = ts?.fontSize ?? 18;
  const lineHeight = Math.round(size * (ts?.lineHeightMultiplier ?? 1.5));
  const body = { fontFamily: fontFamily.serif, fontSize: size, lineHeight, color: c.text } as const;

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
      <View style={styles.headerBar}><BackButton onPress={() => router.back()} /></View>

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
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  headerBar: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
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
