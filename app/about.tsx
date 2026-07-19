// About Sober Dailies — a plain reading page (redesign 3.0). Presented as a
// modal, so it dismisses via an X "close" button / swipe-down. Matches
// the reader surfaces (Daily Reflection, Big Book): themed tokens, no colored
// header, and long-form body set in the reader serif (Georgia on
// iOS, Gelasio on Android) at a fixed 16pt. Opens with a centered brand hero
// (app logo → wordmark → tagline).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const LOGO = require('../assets/images/icon.png');

const BODY: { text: string }[] = [
  { text: 'Sober Dailies was created by someone who has been practicing the AA program for more than 30 years and believes that lasting recovery comes from consistent daily practice. This app brings that practice into one place — the readings, the prayers, the reflections, the daily work — to make it easier to do every day.' },
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar — this screen is a modal, so the affordance is an X "close"
          button (swipe-down also dismisses on iOS), not a back arrow.
          Placement matches the tool pages' ToolHeader (insets.top + 8). */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.closeBtn}
        >
          <X size={20} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
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
        {BODY.map((item, i) => (
          <Text key={i} style={[styles.body, i > 0 && styles.bodyGap]}>
            {item.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },

    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 8 },
    // Close pill — mirrors BackButton's 38px circle (surface + hairline, or a
    // translucent fill in dark mode) but carries an X for the modal.
    closeBtn: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : c.surface,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : c.border,
    },

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
  });
};
