// About Sober Dailies — a plain reading page (redesign 3.0). Matches the reader
// surfaces (Daily Reflection, Big Book): themed tokens, a BackButton top bar
// (no colored header), and long-form body set in the reader serif (Georgia on
// iOS, Gelasio on Android) at a fixed 16pt. Opens with a centered brand hero
// (app logo → wordmark → tagline); the closing "one day at a time" paragraph is
// pulled out as a teal callout, echoing the Daily Reflection meditation tile.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import BackButton from '@/components/BackButton';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useThemedStyles } from '@/hooks/useTokens';

const LOGO = require('../assets/images/icon.png');

type Block = { text: string; callout?: boolean };

const BODY: Block[] = [
  { text: 'Sober Dailies was created by someone who has been practicing the AA program for more than 30 years and believes that lasting recovery is built through consistent daily practice.' },
  { text: 'The principles of recovery are timeless, but each person builds a daily practice that fits their life, their sponsor’s guidance, and where they are in their journey. Sober Dailies helps you define that daily program by selecting the practices you want to make part of each day.' },
  { text: 'Every daily action is paired with the tools that support it, so what you need is always right where you need it. Whether you’re reading the Daily Reflection, saying a prayer, writing a gratitude list, talking with an AI Sponsor, or completing your nightly review, each tool is there to support the next step in your program.' },
  { text: 'As you complete each action, your progress becomes visible throughout the day. Seeing what you’ve completed—and what’s still ahead—provides simple accountability that encourages consistency. Over time, those daily actions become habits, and those habits become a way of life.' },
  { text: 'Recovery doesn’t happen all at once. It is built one day at a time, through the practices we return to every day.', callout: true },
  { text: 'Sober Dailies was created to help you define those practices, follow them consistently, and build a stronger recovery—one day at a time.' },
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.topTitle}>About</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand hero */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Image source={LOGO} style={styles.badgeImg} contentFit="cover" />
          </View>
          <Text style={styles.brand}>Sober Dailies</Text>
          <Text style={styles.tagline}>One day at a time.</Text>
        </View>

        {/* Body */}
        {BODY.map((item, i) =>
          item.callout ? (
            <View key={i} style={styles.callout}>
              <View style={styles.calloutBar} />
              <Text style={styles.calloutText}>{item.text}</Text>
            </View>
          ) : (
            <Text key={i} style={[styles.body, i > 0 && styles.bodyGap]}>
              {item.text}
            </Text>
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },

    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
    topTitle: { fontFamily: fontFamily.display, fontSize: 20, letterSpacing: -0.3, color: c.text },

    scroll: { paddingHorizontal: 22, paddingTop: 8 },

    // Centered brand hero
    hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
    badge: {
      width: 88, height: 88, borderRadius: 44, overflow: 'hidden',
      shadowColor: colors.primary, shadowOpacity: isDark ? 0.4 : 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
    },
    badgeImg: { width: '100%', height: '100%' },
    brand: { fontFamily: fontFamily.displayBold, fontSize: 28, letterSpacing: -0.5, color: c.text, marginTop: 18 },
    tagline: { ...readerSerifItalic, fontSize: 17, color: colors.primary, marginTop: 6 },

    // Reading body — fixed 16pt reader serif (not tied to the app's "Aa" scale).
    body: { fontFamily: readerSerif, fontSize: 16, lineHeight: 24, color: c.text, letterSpacing: -0.05 },
    bodyGap: { marginTop: 16 },

    // Blockquote callout — the notebook-tool "bar" style: a thin teal rule down
    // the left with the line set in italics, slightly indented (ToolIntro bar).
    callout: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 24, marginBottom: 8 },
    calloutBar: { width: 3, borderRadius: 2, backgroundColor: colors.primary },
    // One weight step up from the body italic (400 → Lora 500 medium italic),
    // a real face so it renders the same on iOS and Android.
    calloutText: { fontFamily: fontFamily.serifMediumItalic, flex: 1, fontSize: 16, lineHeight: 24, color: c.text, letterSpacing: -0.05 },
  });
};
