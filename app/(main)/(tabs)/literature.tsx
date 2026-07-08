// Literature home (redesign 3.0), per hifi-literature.jsx ScreenLibrary:
// a book-cover hero grid (Big Book + 12 & 12) and Meeting Readings folded in as
// a major category (3 preview cards + "See all"). The Big Book and 12 & 12
// readers are the existing routes; Meeting Readings live entirely in-app.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import SettingsGear from '@/components/navigation/SettingsGear';
import { BigBookCover, TwelveCover, MeetingReadingCard } from '@/components/literature/literature-ui';
import { MEETING_READINGS, PREVIEW_READING_IDS, getMeetingReading } from '@/constants/meeting-readings';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, families, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

export default function LiteratureScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('Literature');
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { isDark, colors, tone } = useTokens();
  const previews = PREVIEW_READING_IDS.map(getMeetingReading).filter(Boolean);

  // Literature is a Steel Navy tool; brighten the link ink on dark.
  const linkInk = isDark ? colors.steel : families.steel[700];

  // Book-cover cards: tinted gradients in light; soft family washes on dark
  // (neutral surfaces never take opaque tints on dark — handoff).
  const steelCard = isDark
    ? { grad: [tone('steel').soft, tone('steel').soft] as const, border: 'rgba(124,155,219,0.30)' }
    : { grad: [families.steel[100], families.steel[200]] as const, border: families.steel[300] };
  const tealCard = isDark
    ? { grad: [tone('teal').soft, tone('teal').soft] as const, border: 'rgba(79,179,172,0.30)' }
    : { grad: [families.teal[100], families.teal[200]] as const, border: families.teal[300] };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
          <SettingsGear />
        </View>
        <Text style={styles.title}>Literature</Text>
        <Text style={styles.sub}>Read A.A. recovery texts.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero books */}
        <View style={styles.grid}>
          <Pressable onPress={() => router.push('/(main)/bigbook')} style={({ pressed }) => [styles.bookCardWrap, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={steelCard.grad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.bookCard, { borderColor: steelCard.border }]}>
              <BigBookCover w={92} h={128} />
              <View style={styles.bookText}>
                <Text style={styles.bookTitle}>Alcoholics{'\n'}Anonymous</Text>
                <Text style={styles.bookMeta}>Big Book · 164 pp</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push('/(main)/twelve-and-twelve')} style={({ pressed }) => [styles.bookCardWrap, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={tealCard.grad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.bookCard, { borderColor: tealCard.border }]}>
              <TwelveCover w={92} h={128} />
              <View style={styles.bookText}>
                <Text style={styles.bookTitle}>Twelve Steps{'\n'}& Traditions</Text>
                <Text style={styles.bookMeta}>24 chapters</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Meeting Readings — a major category */}
        <View style={styles.divider} />
        <View style={styles.catHead}>
          <Text style={styles.catTitle}>Meeting Readings</Text>
          <Text style={styles.catSub}>Readings frequently read at most meetings.</Text>
        </View>

        <View style={styles.readingList}>
          {previews.map((r) => (
            <MeetingReadingCard key={r!.id} reading={r!} onPress={() => router.push(`/(main)/meeting-reading?id=${r!.id}`)} />
          ))}
          <Pressable onPress={() => router.push('/(main)/meeting-readings')} style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.seeAllText, { color: linkInk }]}>See all {MEETING_READINGS.length} readings</Text>
            <ChevronRight size={13} color={linkInk} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontFamily: fontFamily.displayBold, fontSize: 32, letterSpacing: -0.6, color: c.text },
    sub: { fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textSecondary, marginTop: 4 },

    // Clears the floating tab bar (Literature lives in the tab group now).
    scroll: { paddingBottom: 130 },
    grid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
    bookCardWrap: { flex: 1 },
    bookCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'center', gap: 12 },
    bookText: { alignItems: 'center', width: '100%' },
    bookTitle: { fontFamily: fontFamily.display, fontSize: 16, color: c.text, lineHeight: 19, letterSpacing: -0.2, textAlign: 'center' },
    bookMeta: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, marginTop: 6, textAlign: 'center' },

    divider: { height: 1, backgroundColor: c.divider, marginHorizontal: 16, marginTop: 18 },
    catHead: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 },
    catTitle: { fontFamily: fontFamily.displayBold, fontSize: 26, letterSpacing: -0.5, color: c.text },
    catSub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

    readingList: { paddingHorizontal: 16, gap: 8 },
    seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 2, borderRadius: 12, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
    seeAllText: { fontFamily: fontFamily.semiBold, fontSize: 13 },
  });
};
