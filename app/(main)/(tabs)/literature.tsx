// Literature home (redesign 3.0): the two books as real cover photos sitting
// on a shelf — the images themselves are the buttons, no card/container —
// with serif titles beneath, and Meeting Readings listed in full below.
// The Big Book and 12 & 12 readers are the existing routes; Meeting Readings
// live entirely in-app.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import SettingsGear from '@/components/navigation/SettingsGear';
import PassItOnGift from '@/components/navigation/PassItOnGift';
import { MeetingReadingCard } from '@/components/literature/literature-ui';
import { MEETING_READINGS } from '@/constants/meeting-readings';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { readerSerif } from '@/constants/fonts';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useThemedStyles } from '@/hooks/useTokens';

const BIG_BOOK_COVER = require('@/assets/images/big-book_cover.webp');
const TWELVE_COVER = require('@/assets/images/new_12x12_cover.webp');
// Both cover scans are 1290×1700.
const COVER_ASPECT = 1290 / 1700;

export default function LiteratureScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('Literature');
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.flexFill}>
          <Text style={styles.title}>Literature</Text>
          <Text style={styles.sub}>The texts of recovery, always with you.</Text>
        </View>
        <PassItOnGift style={styles.giftBtn} />
        <SettingsGear style={styles.gear} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero books: bare cover images on a shelf — the covers ARE the buttons. */}
        <View style={styles.booksRow}>
          <Pressable
            onPress={() => router.push('/(main)/bigbook')}
            style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Alcoholics Anonymous"
          >
            <Image source={BIG_BOOK_COVER} style={styles.bookImg} contentFit="contain" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/twelve-and-twelve')}
            style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Twelve Steps and Twelve Traditions"
          >
            <Image source={TWELVE_COVER} style={styles.bookImg} contentFit="contain" />
          </Pressable>
        </View>
        <View style={styles.titlesRow}>
          <Text style={styles.bookTitle}>Alcoholics{'\n'}Anonymous</Text>
          <Text style={styles.bookTitle}>Twelve Steps &{'\n'}Twelve Traditions</Text>
        </View>

        {/* Meeting Readings — a major category */}
        <View style={styles.divider} />
        <View style={styles.catHead}>
          <Text style={styles.catTitle}>Meeting Readings</Text>
          <Text style={styles.catSub}>Everything you need to host a meeting.</Text>
        </View>

        <View style={styles.readingList}>
          {MEETING_READINGS.map((r) => (
            <MeetingReadingCard key={r.id} reading={r} onPress={() => router.push(`/(main)/meeting-reading?id=${r.id}`)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    // Tab header: title row starts at paddingTop 54 — the y where back-button
    // screens' titles land — with the gear inline, and a roomy paddingBottom.
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 54, paddingBottom: 28 },
    flexFill: { flex: 1 },
    gear: { paddingTop: 4 },
    giftBtn: { paddingTop: 4, marginRight: 16 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    sub: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 4 },

    // paddingTop keeps the covers (and their drop shadow) off the scroll's top
    // clip line, so a small scroll doesn't shear the tops of the books.
    // paddingBottom clears the floating tab bar (Literature is in the tab group).
    scroll: { paddingTop: 12, paddingBottom: 130 },
    // Hero: bare covers, titles beneath.
    booksRow: { flexDirection: 'row', gap: 22, paddingHorizontal: 30, alignItems: 'flex-end' },
    bookBtn: {
      flex: 1,
      // Lift the cover off the page (the image is the whole button).
      shadowColor: '#1F3A4D', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 7,
    },
    bookImg: { width: '100%', aspectRatio: COVER_ASPECT },
    titlesRow: { flexDirection: 'row', gap: 22, paddingHorizontal: 30, marginTop: 20 },
    bookTitle: { flex: 1, fontFamily: readerSerif, fontWeight: '700', fontSize: 17.5, color: c.text, lineHeight: 23, textAlign: 'center' },

    divider: { height: 1, backgroundColor: c.divider, marginHorizontal: 16, marginTop: 34 },
    catHead: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 },
    catTitle: { fontFamily: fontFamily.display, fontSize: 22, letterSpacing: -0.4, color: c.text },
    catSub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

    readingList: { paddingHorizontal: 16, gap: 8 },
  });
};
