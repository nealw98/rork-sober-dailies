import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { colors as lightColors, fontFamily, fontSize, getSemanticColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { daysSince, formatDateInput, parseDateInput, toDateInput, ymdLabel } from '@/lib/soberDateInput';
import { OnboardingColumn, PrimaryButton, TourProgress } from '@/components/onboarding/OnboardingChrome';

// R2 · "When did you get sober?" — the count is the first thing the app
// gives back, so it leads the tour. Typed mm/dd/yyyy (same parsing and
// validation as the standalone SoberDateEditor) with the coin counting live.

const lightC = getSemanticColors('light');
// The coin keeps the brand teal → steel sweep in light mode; on dark both ends
// drop to OLED luminance (same reasoning as SoberDateEditor's DARK_CARD_GRAD —
// a big bright disc is a lot of light at 2am).
const COIN_GRAD = [lightColors.primary, lightColors.steelDark] as const;
const COIN_GRAD_DARK = ['#316F6F', '#1F3B57'] as const;
const COIN_MAX = 220;

export type CounterMethod = 'typed' | 'day_one';

export default function CounterStep({ current, onSave, onSkip }: {
  // Prefilled for a member who already has a date.
  current: Date | null;
  onSave: (date: Date, method: CounterMethod) => void;
  onSkip: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  const { width, height } = useWindowDimensions();
  const [value, setValue] = useState(() => toDateInput(current));
  const parsed = parseDateInput(value);
  const badDate = value.length === 10 && !parsed;
  const days = parsed ? daysSince(parsed) : null;
  // Smaller on an SE-height screen so the field and both buttons still fit
  // above the keyboard.
  const coin = Math.round(Math.min(COIN_MAX, width * 0.56, height * 0.27));

  return (
    // The keyboard avoider wraps the safe area, not the other way round: inside
    // it, its frame stops short of the home indicator and the padding it adds
    // came up short of the keyboard, leaving "Today is my day one" under it.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingColumn>
          <TourProgress index={0} onSkip={onSkip} />
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.affirmation}>One day at a time.</Text>
            <Text style={styles.title} accessibilityRole="header">When did you get sober?</Text>

            <View style={styles.center}>
              <LinearGradient
                colors={isDark ? [...COIN_GRAD_DARK] : [...COIN_GRAD]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[styles.coin, { width: coin, height: coin, borderRadius: coin / 2 }]}
                accessible
                accessibilityLabel={days != null ? `${days} ${days === 1 ? 'day' : 'days'}` : 'No date yet'}
              >
                <View style={[styles.coinRing, { borderRadius: coin / 2 }]} pointerEvents="none" />
                <Text style={[styles.coinNumber, { fontSize: Math.round(coin * 0.29) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {days != null ? days.toLocaleString('en-US') : '—'}
                </Text>
                <Text style={styles.coinUnit}>{days === 1 ? 'day' : 'days'}</Text>
              </LinearGradient>

              <View style={styles.ymdRow}>
                {parsed && <Text style={styles.ymd}>{ymdLabel(parsed)}</Text>}
                {badDate && <Text style={styles.ymdBad}>That&apos;s not a valid date</Text>}
              </View>

              <Text style={styles.fieldLabel}>SOBRIETY DATE</Text>
              <TextInput
                style={[styles.input, badDate && styles.inputBad]}
                value={value}
                onChangeText={(t) => setValue(formatDateInput(t))}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={lightC.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Sobriety date, month day year"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Start my count" disabled={!parsed} onPress={() => parsed && onSave(parsed, 'typed')} />
            <Pressable style={styles.ghost} onPress={() => onSave(new Date(), 'day_one')} accessibilityRole="button">
              <Text style={styles.ghostText}>Today is my day one</Text>
            </Pressable>
          </View>
        </OnboardingColumn>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 22, paddingBottom: 16 },
    affirmation: { fontFamily: fontFamily.serifMediumItalic, fontSize: 20, lineHeight: 26, color: colors.primaryDark },
    title: { fontFamily: fontFamily.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: c.text, marginTop: 8 },

    center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 22 },
    coin: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, shadowColor: '#2D5882', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 22 }, elevation: 10 },
    coinRing: { ...StyleSheet.absoluteFill, borderWidth: 8, borderColor: 'rgba(255,255,255,0.12)' },
    coinNumber: { fontFamily: fontFamily.displayBold, color: '#fff', letterSpacing: -2, fontVariant: ['tabular-nums'] },
    coinUnit: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: '#fff', marginTop: 2 },

    ymdRow: { minHeight: 22, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
    ymd: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: colors.primaryDark, textAlign: 'center' },
    ymdBad: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: colors.destructive, textAlign: 'center' },

    fieldLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8, color: c.textMuted, marginTop: 18, marginBottom: 8 },
    // The field is a white pill with light-mode ink in both modes, like the
    // standalone editor's.
    input: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: colors.primary, paddingVertical: 14, paddingHorizontal: 16, fontFamily: fontFamily.semiBold, fontSize: 20, color: lightC.text, textAlign: 'center' },
    inputBad: { borderColor: colors.destructive },

    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    ghost: { alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 },
    ghostText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.textSecondary },
  });
};
