// Sobriety milestone takeover (July 2026). Replaces the old small card with a
// full-screen celebration in the spirit of iMessage effects: brand blue→teal
// gradient, a Lottie confetti blowout, a giant springing year count,
// choreographed haptics, then a Celebrate button. Tap anywhere ends it.
// Honors Reduce Motion (no particles, gentle fade only). The trigger/gating
// logic (exact milestone-day match + once-per-milestone AsyncStorage flag) is
// unchanged from the card era — useSobrietyBirthday decides WHEN, this decides
// WHAT.
import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Pressable,
  AccessibilityInfo, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { calculateDaysBetween, parseLocalDate, formatLocalDate } from '@/lib/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { fontFamily } from '@/constants/designTokens';

// Guarded require: binaries older than the lottie build (runtime 3.0.7 test
// builds) lack the native module — an OTA carrying this file must degrade to
// the gradient + typography moment, not crash at import.
let LottieView: any = null;
try { LottieView = require('lottie-react-native').default; } catch {}

const BIRTHDAY_STORAGE_KEY = 'last_shown_birthday_milestone';

interface SobrietyBirthdayModalProps {
  visible: boolean;
  onClose: () => void;
}

const SobrietyBirthdayModal: React.FC<SobrietyBirthdayModalProps> = ({ visible, onClose }) => {
  const { sobrietyDate } = useSobriety();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [milestone, setMilestone] = useState<string>('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fade] = useState(new Animated.Value(0));
  const [numberScale] = useState(new Animated.Value(0));
  const [ctaFade] = useState(new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // Calculate milestone based on sobriety date
  const calculateMilestone = (sobrietyDateString: string): string | null => {
    const daysSober = calculateDaysBetween(sobrietyDateString);
    const today = formatLocalDate(new Date());

    // Check if today is exactly a milestone date
    const sobrietyDate = parseLocalDate(sobrietyDateString);

    // Monthly milestones (1-11 months)
    for (let months = 1; months <= 11; months++) {
      const milestoneDate = new Date(sobrietyDate);
      const originalDay = milestoneDate.getDate();

      // Add months
      milestoneDate.setMonth(milestoneDate.getMonth() + months);

      // If the day rolled over (e.g., Aug 31 -> Sept 31 -> Oct 1),
      // set it to the last day of the target month instead
      if (milestoneDate.getDate() !== originalDay) {
        // Go back one day to get the last day of the target month
        milestoneDate.setDate(0);
      }

      const milestoneDateString = formatLocalDate(milestoneDate);

      if (milestoneDateString === today) {
        console.log('[BirthdayModal] Found monthly milestone:', `${months}-month`);
        return `${months}-month`;
      }
    }

    // Yearly milestones starting from 1 year
    for (let years = 1; years <= 100; years++) {
      const milestoneDate = new Date(sobrietyDate);
      milestoneDate.setFullYear(milestoneDate.getFullYear() + years);
      const milestoneDateString = formatLocalDate(milestoneDate);

      if (milestoneDateString === today) {
        const milestone = `${years}-year`;
        console.log('[BirthdayModal] Found yearly milestone:', milestone);
        return milestone;
      }
    }

    // Check for 18-month milestone
    const eighteenMonthDate = new Date(sobrietyDate);
    eighteenMonthDate.setMonth(eighteenMonthDate.getMonth() + 18);
    const eighteenMonthDateString = formatLocalDate(eighteenMonthDate);

    if (eighteenMonthDateString === today) {
      console.log('[BirthdayModal] Found 18-month milestone');
      return '18-month';
    }

    return null;
  };

  // Check if we should show birthday modal
  const shouldShowBirthday = async (): Promise<boolean> => {
    if (!sobrietyDate) {
      console.log('[BirthdayModal] No sobriety date, not showing');
      return false;
    }

    const currentMilestone = calculateMilestone(sobrietyDate);
    console.log('[BirthdayModal] Current milestone:', currentMilestone);

    if (!currentMilestone) {
      console.log('[BirthdayModal] No milestone found, not showing');
      return false;
    }

    try {
      const lastShown = await AsyncStorage.getItem(BIRTHDAY_STORAGE_KEY);
      console.log('[BirthdayModal] Last shown milestone:', lastShown, 'Current milestone:', currentMilestone);
      const shouldShow = lastShown !== currentMilestone;
      console.log('[BirthdayModal] Should show birthday:', shouldShow);
      return shouldShow;
    } catch (error) {
      console.error('Error checking birthday storage:', error);
      return true; // Show by default if we can't check
    }
  };

  // Mark milestone as shown
  const markMilestoneAsShown = async (milestone: string) => {
    try {
      await AsyncStorage.setItem(BIRTHDAY_STORAGE_KEY, milestone);
    } catch (error) {
      console.error('Error saving birthday milestone:', error);
    }
  };

  // Entrance choreography: fade the takeover in, spring the number, haptic
  // bursts under the confetti, then surface the button.
  useEffect(() => {
    if (visible) {
      Animated.timing(fade, { toValue: 1, duration: reduceMotion ? 400 : 260, useNativeDriver: true }).start();
      Animated.spring(numberScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7, delay: reduceMotion ? 0 : 250 }).start();
      Animated.timing(ctaFade, { toValue: 1, duration: 400, delay: reduceMotion ? 400 : 1500, useNativeDriver: true }).start();
      // Celebration chime (bundled, synthesized in-house — license-clean).
      // expo-av respects the iOS silent switch by default, so a muted phone
      // celebrates silently, iMessage-style.
      let sound: Audio.Sound | null = null;
      Audio.Sound.createAsync(require('@/assets/sounds/celebration.m4a'), { shouldPlay: true, volume: 0.9 })
        .then((r) => { sound = r.sound; })
        .catch(() => {});
      if (!reduceMotion) {
        const t1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 350);
        const t2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 700);
        return () => { clearTimeout(t1); clearTimeout(t2); sound?.unloadAsync().catch(() => {}); };
      }
      return () => { sound?.unloadAsync().catch(() => {}); };
    } else {
      fade.setValue(0);
      numberScale.setValue(0);
      ctaFade.setValue(0);
    }
  }, [visible, reduceMotion, fade, numberScale, ctaFade]);

  // Check for birthday when component mounts
  useEffect(() => {
    const checkBirthday = async () => {
      if (!sobrietyDate) return;

      const shouldShow = await shouldShowBirthday();
      if (shouldShow) {
        const currentMilestone = calculateMilestone(sobrietyDate);
        if (currentMilestone) {
          setMilestone(currentMilestone);
          // Trigger haptic feedback for milestone
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    };

    checkBirthday();
  }, [sobrietyDate]);

  const handleClose = () => {
    if (milestone) {
      markMilestoneAsShown(milestone);
    }
    onClose();
  };

  if (!visible || !milestone) return null;

  const count = milestone.split('-')[0];
  const yearly = milestone.endsWith('-year');
  const one = count === '1';
  const unitLabel = yearly ? (one ? 'YEAR SOBER' : 'YEARS SOBER') : (one ? 'MONTH SOBER' : 'MONTHS SOBER');
  const showParticles = LottieView != null && !reduceMotion;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.screen, { opacity: fade }]}>
        {/* Brand blue→teal — the onboarding welcome gradient, full-bleed. */}
        <LinearGradient
          colors={['#0D77BF', '#0B96B6', '#0CB3A9']}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Confetti blowout — behind the text so the number stays readable. */}
        {showParticles && (
          <LottieView
            source={require('@/assets/lottie/confetti.json')}
            autoPlay
            loop
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Tap anywhere to finish */}
        <Pressable style={styles.content} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close celebration">
          <Text style={styles.kicker}>SOBRIETY MILESTONE</Text>

          <Animated.View style={{ transform: [{ scale: numberScale }], alignItems: 'center' }}>
            <Text style={[styles.count, { fontSize: Math.min(148, screenH * 0.17), lineHeight: Math.min(156, screenH * 0.18) }]}>{count}</Text>
            <Text style={styles.unit}>{unitLabel}</Text>
          </Animated.View>

          <Text style={styles.message}>
            Take a moment to celebrate how far you&rsquo;ve come&mdash;showing up, working your program, and choosing sobriety one day at a time.
          </Text>

          <Animated.View style={[styles.ctaWrap, { opacity: ctaFade, paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
            <TouchableOpacity style={styles.okButton} onPress={handleClose} accessibilityRole="button">
              <Text style={styles.okButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  kicker: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
  },
  count: {
    fontFamily: fontFamily.displayBold,
    color: '#fff',
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  unit: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    letterSpacing: 4,
    color: '#fff',
    marginTop: 2,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 22,
    maxWidth: 300,
  },
  ctaWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  okButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 999,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  okButtonText: {
    color: '#0B96B6',
    fontFamily: fontFamily.bold,
    fontSize: 17,
    textAlign: 'center',
  },
});

export default SobrietyBirthdayModal;
