import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors as lightColors, fontFamily, fontSize, getSemanticColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { daysSince, formatDateInput, parseDateInput, toDateInput, ymdLabel } from '@/lib/soberDateInput';
import { OnboardingColumn, PrimaryButton, TourProgress } from '@/components/onboarding/OnboardingChrome';

// R2 · "When did you get sober?" — the count is the first thing the app
// gives back, so it leads the tour. Typed mm/dd/yyyy (same parsing and
// validation as the standalone SoberDateEditor). A valid date pops the coin
// and rolls the count up from zero, then a glint crosses it; a teal glow
// breathes behind it. The ring around the coin is decoration — never
// progress toward anything (one day at a time).

const lightC = getSemanticColors('light');
// Teal in both modes — the coin is the brand moment of the screen.
const COIN_GRAD = ['#4A9A98', lightColors.primary, '#2A6466'] as const;
const TEAL = lightColors.primary;
const BAD = '#D8584E';
const COIN_MAX = 196;
const RING_GAP = 10;
const COUNT_MS = 1400;
const GLINT_MS = 900;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// 12345 → "12,345" on the UI thread (toLocaleString isn't a worklet).
function withCommas(n: number) {
  'worklet';
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return out;
}

export type CounterMethod = 'typed' | 'day_one';

export default function CounterStep({ value, onChangeValue, onSave, onSkip, onBack }: {
  // The typed text is held by the flow so it survives going back to Welcome.
  value: string;
  onChangeValue: (v: string) => void;
  onSave: (date: Date, method: CounterMethod) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, isDark } = useTokens();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  // "Today is my day one" only fills the field; Start my count still saves.
  // This remembers how the date got there for the saved event.
  const dayOneRef = useRef(false);
  // With the keyboard up the field sits below the fold on most phones (the
  // coin, its ring and two lines come first), so bring it into view.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => sub.remove();
  }, []);

  const parsed = parseDateInput(value);
  const badDate = value.length === 10 && !parsed;
  const days = parsed ? daysSince(parsed) : null;
  const isDayOne = days === 0;
  // Smaller on an SE-height screen so the field and both buttons still fit
  // above the keyboard.
  const coin = Math.round(Math.min(COIN_MAX, width * 0.5, height * 0.24));

  const daysText = days != null ? days.toLocaleString('en-US') : '—';
  // The animated number can't shrink itself to fit, so size it from the
  // final count's width.
  const numberSize = Math.round(Math.min(coin * 0.29, (coin * 0.78) / (Math.max(daysText.length, 3) * 0.62)));

  // ── animation ──
  const count = useSharedValue(days ?? 0);
  const pop = useSharedValue(1);
  const glint = useSharedValue(0);
  const breath = useSharedValue(0);

  const play = (target: number) => {
    cancelAnimation(count);
    if (reduceMotion) {
      count.value = target;
      pop.value = 1;
      glint.value = 0;
      return;
    }
    count.value = 0;
    count.value = withTiming(target, { duration: COUNT_MS, easing: Easing.out(Easing.cubic) });
    pop.value = 0.94;
    pop.value = withSequence(
      withTiming(1.03, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
    );
    glint.value = 0;
    glint.value = withDelay(COUNT_MS - 300, withTiming(1, { duration: GLINT_MS, easing: Easing.inOut(Easing.quad) }));
  };

  // Plays whenever a valid date appears — typed, day one, or prefilled on open.
  useEffect(() => {
    if (days != null) play(days);
  }, [days, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(breath);
  }, [reduceMotion]);

  const numberProps = useAnimatedProps(() => ({ text: withCommas(Math.round(count.value)) }) as any);
  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + breath.value * 0.55,
    transform: [{ scale: 1 + breath.value * 0.1 }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: glint.value > 0 && glint.value < 1 ? 1 : 0,
    transform: [{ translateX: -coin + glint.value * coin * 2 }, { rotate: '25deg' }],
  }));

  const setText = (t: string) => {
    dayOneRef.current = false;
    onChangeValue(formatDateInput(t));
  };
  const dayOne = () => {
    Keyboard.dismiss();
    dayOneRef.current = true;
    onChangeValue(toDateInput(new Date()));
  };

  const borderColor = badDate ? BAD : focused || parsed ? TEAL : c.border;
  const glow = coin * 1.55;

  return (
    // The keyboard avoider wraps the safe area, not the other way round: inside
    // it, its frame stops short of the home indicator and the padding it adds
    // came up short of the keyboard, leaving "Today is my day one" under it.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingColumn>
          <TourProgress index={0} onSkip={onSkip} onBack={onBack} />
          <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.affirmation}>One day at a time.</Text>
            <Text style={styles.title} accessibilityRole="header">When did you get sober?</Text>

            <View style={styles.center}>
              <View style={{ width: coin + RING_GAP * 2, height: coin + RING_GAP * 2, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View
                  pointerEvents="none"
                  style={[{ position: 'absolute', width: glow, height: glow, left: (coin + RING_GAP * 2 - glow) / 2, top: (coin + RING_GAP * 2 - glow) / 2 }, glowStyle]}
                >
                  <Svg width={glow} height={glow}>
                    <Defs>
                      <RadialGradient id="coinGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0.45" stopColor={TEAL} stopOpacity={isDark ? 0.4 : 0.28} />
                        <Stop offset="1" stopColor={TEAL} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#coinGlow)" />
                  </Svg>
                </Animated.View>
                <View pointerEvents="none" style={[styles.ring, { width: coin + RING_GAP * 2, height: coin + RING_GAP * 2, borderRadius: coin / 2 + RING_GAP }]} />

                <Pressable
                  onPress={() => days != null && play(days)}
                  disabled={days == null}
                  accessibilityRole="button"
                  accessibilityLabel={days == null ? 'No date yet' : isDayOne ? 'Day 1' : `${daysText} ${days === 1 ? 'day' : 'days'}`}
                  accessibilityHint={days == null ? undefined : 'Replays the count'}
                >
                  <Animated.View style={[styles.coinShadow, { width: coin, height: coin, borderRadius: coin / 2 }, coinStyle]}>
                    <LinearGradient
                      colors={[...COIN_GRAD]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.coin, { borderRadius: coin / 2 }]}
                    >
                      <View style={[styles.coinRim, { borderRadius: coin / 2 }]} pointerEvents="none" />
                      <Animated.View pointerEvents="none" style={[styles.glint, { height: coin * 1.6, top: -coin * 0.3, left: coin / 2 - 22 }, glintStyle]}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </Animated.View>

                      {days == null ? (
                        <Text style={[styles.coinNumber, { fontSize: numberSize }]}>—</Text>
                      ) : isDayOne ? (
                        <Text style={[styles.coinNumber, { fontSize: Math.round(coin * 0.24) }]} numberOfLines={1}>Day 1</Text>
                      ) : (
                        <AnimatedTextInput
                          editable={false}
                          pointerEvents="none"
                          underlineColorAndroid="transparent"
                          defaultValue={daysText}
                          animatedProps={numberProps}
                          style={[styles.coinNumber, styles.coinInput, { fontSize: numberSize, width: coin - 24 }]}
                        />
                      )}
                      <Text style={styles.coinUnit}>{isDayOne ? 'the bravest one' : days === 1 ? 'day' : 'days'}</Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </View>

              <View style={styles.lines}>
                {badDate ? (
                  <Text style={styles.ymdBad}>That&apos;s not a valid date</Text>
                ) : parsed ? (
                  <>
                    <Text style={styles.ymd}>{isDayOne ? 'Welcome. We’re glad you’re here.' : ymdLabel(parsed)}</Text>
                    <Text style={styles.hours}>
                      {isDayOne ? 'Every count starts right here.' : `That’s ${(days! * 24).toLocaleString('en-US')} hours, one at a time.`}
                    </Text>
                  </>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>SOBRIETY DATE</Text>
              <TextInput
                style={[styles.input, { borderColor }, focused && !badDate && styles.inputFocus]}
                value={value}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={lightC.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Sobriety date, month day year"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Start my count" disabled={!parsed} onPress={() => parsed && onSave(parsed, dayOneRef.current ? 'day_one' : 'typed')} />
            <Pressable style={styles.ghost} onPress={dayOne} accessibilityRole="button">
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
    affirmation: { fontFamily: fontFamily.serifMediumItalic, fontSize: 20, lineHeight: 26, color: colors.primaryDark, textAlign: 'center' },
    title: { fontFamily: fontFamily.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: c.text, marginTop: 8, textAlign: 'center' },

    center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 22 },
    ring: { position: 'absolute', borderWidth: 1.5, borderColor: TEAL + '59' },
    coinShadow: { backgroundColor: TEAL, shadowColor: '#2A6466', shadowOpacity: 0.38, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
    coin: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    coinRim: { ...StyleSheet.absoluteFill, borderWidth: 6, borderColor: 'rgba(255,255,255,0.14)' },
    glint: { position: 'absolute', width: 45 },
    coinNumber: { fontFamily: fontFamily.displayBold, color: '#fff', letterSpacing: -1.5, fontVariant: ['tabular-nums'], textAlign: 'center' },
    coinInput: { padding: 0, margin: 0, includeFontPadding: false } as any,
    coinUnit: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: 'rgba(255,255,255,0.92)', marginTop: 2 },

    lines: { minHeight: 46, marginTop: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
    ymd: { fontFamily: fontFamily.semiBold, fontSize: 15, color: colors.primaryDark, textAlign: 'center' },
    hours: { fontFamily: fontFamily.serifItalic, fontSize: 16, color: c.textSecondary, textAlign: 'center' },
    ymdBad: { fontFamily: fontFamily.semiBold, fontSize: 15, color: BAD, textAlign: 'center' },

    fieldLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8, color: c.textMuted, marginTop: 16, marginBottom: 8 },
    // The field is a white pill with light-mode ink in both modes, like the
    // standalone editor's.
    input: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 16, fontFamily: fontFamily.semiBold, fontSize: 20, color: lightC.text, textAlign: 'center' },
    inputFocus: { shadowColor: TEAL, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 3 },

    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    ghost: { alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 },
    ghostText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.textSecondary },
  });
};
