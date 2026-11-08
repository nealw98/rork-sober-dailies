import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';

import { fontFamily, fontSize, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import { getTodaysReflection } from '@/constants/reflections';
import { EM_ITALIC, EM_UPRIGHT, splitParagraphs, withEmphasis } from '@/components/DailyReflection';
import { titleCase } from '@/lib/titleCase';
import { Reflection } from '@/types';
import { OnboardingColumn, PrimaryButton, TourProgress } from '@/components/onboarding/OnboardingChrome';

// R3 · Today's Daily Reflection, in full — the same reading and the same
// rotating hero the Today page shows. Read-only: nothing is marked done here,
// because there is no program yet for it to count toward.

const HERO_FALLBACK = require('@/assets/reflections_images/reflection_bg7.webp');
// Below the status bar — the mockup's 330pt hero less its 59pt inset.
const HERO_BELOW_INSET = 271;
// Landscape (the unfolded Duo, an iPad on its side): a fixed 271pt photo would
// leave about one line of the reading above the button, so it takes a share
// of the height instead.
const HERO_LANDSCAPE_SHARE = 0.3;
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export default function ReflectionStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const heroHeight = insets.top + (width > height ? Math.round(height * HERO_LANDSCAPE_SHARE) : HERO_BELOW_INSET);
  const heroImage = useReflectionHeroImage();
  const { readingSize: readSize, readingLineHeight: readLine } = useReadingSize();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const now = new Date();

  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[onboarding] reflection', e));
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.hero, { height: heroHeight }]}>
        <Image
          source={heroImage ? { uri: heroImage.uri } : HERO_FALLBACK}
          placeholder={HERO_FALLBACK}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={heroImage?.alt ?? 'Daily reflection'}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ paddingTop: insets.top }}>
          <OnboardingColumn style={{ flex: 0 }}>
            <TourProgress index={1} onSkip={onSkip} onImage />
          </OnboardingColumn>
        </View>
        <View style={styles.heroTextWrap}>
          <OnboardingColumn style={{ flex: 0 }}>
            <View style={styles.heroText}>
              <Text style={styles.heroOverline}>{`DAILY REFLECTIONS · ${MONTHS[now.getMonth()]} ${now.getDate()}`}</Text>
              <Text style={styles.heroTitle} accessibilityRole="header">
                {reflection?.title ? titleCase(reflection.title) : ' '}
              </Text>
            </View>
          </OnboardingColumn>
        </View>
      </View>

      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <OnboardingColumn>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {reflection ? (
              <>
                <View style={styles.quoteWrap}>
                  <Text style={[styles.quote, { fontSize: readSize, lineHeight: readLine - readSize * 0.1 }]}>{withEmphasis(reflection.quote, EM_UPRIGHT)}</Text>
                  <Text style={styles.source}>— {reflection.source}</Text>
                </View>
                <View style={styles.bodyWrap}>
                  {splitParagraphs(reflection.reflection).map((p, i) => (
                    <Text key={i} style={[styles.body, { fontSize: readSize, lineHeight: readLine, marginTop: i === 0 ? 0 : 14 }]}>{withEmphasis(p, EM_ITALIC)}</Text>
                  ))}
                </View>
                <Text style={styles.copyright}>Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.</Text>
              </>
            ) : (
              <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.checkLine}>
              <Check size={16} color={colors.primaryDark} strokeWidth={2.4} />
              <Text style={styles.checkText}>A new reading waits here every morning</Text>
            </View>
            <PrimaryButton label="See what else is inside" onPress={onContinue} />
          </View>
        </OnboardingColumn>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    hero: { backgroundColor: '#2E5A5A', overflow: 'hidden' },
    heroTextWrap: { position: 'absolute', left: 0, right: 0, bottom: 26 },
    heroText: { paddingHorizontal: 24 },
    heroOverline: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.6, color: 'rgba(255,255,255,0.92)' },
    // Android clips Lora's descenders to the line box; give it the taller line.
    heroTitle: { fontFamily: fontFamily.serifMedium, fontSize: 28, lineHeight: Platform.select({ android: 38, default: 33 }), color: '#fff', marginTop: 6 },

    scroll: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 20 },
    quoteWrap: { paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: colors.primaryLight },
    quote: { ...readerSerifItalic, color: c.text, letterSpacing: -0.05 },
    source: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.textMuted, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
    bodyWrap: { marginTop: 24 },
    body: { fontFamily: readerSerif, color: c.text, letterSpacing: -0.05 },
    copyright: { marginTop: 18, fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, lineHeight: 15, textAlign: 'center' },

    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    checkLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    checkText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark, flexShrink: 1, textAlign: 'center' },
  });
};
