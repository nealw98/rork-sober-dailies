import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import {
  redesignColors,
  redesignRadii,
  redesignSpacing,
} from '@/constants/redesignTokens';
import { useSobriety } from '@/hooks/useSobrietyStore';

const ONBOARDING_PAPER = '#F5F1E9';
const TEAL_DARK = '#2F7776';

function formatStoredForInput(dateString: string | null) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return '';
  return `${month}/${day}/${year}`;
}

function formatDateInput(text: string) {
  const numbers = text.replace(/\D/g, '').slice(0, 8);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
}

function parseInputDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [month, day, year] = value.split('/').map(Number);
  if (!month || !day || !year) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;

  return {
    date,
    storageValue: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function getBreakdown(date: Date | null) {
  if (!date) return null;
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();
  let days = now.getDate() - date.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(years, 0),
    months: Math.max(months, 0),
    days: Math.max(days, 0),
  };
}

export default function SobrietyDateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dismissPrompt, removeSobrietyDate, setSobrietyDate, sobrietyDate } = useSobriety();
  const [dateInput, setDateInput] = useState(formatStoredForInput(sobrietyDate));
  const parsed = useMemo(() => parseInputDate(dateInput), [dateInput]);
  const breakdown = useMemo(() => getBreakdown(parsed?.date ?? null), [parsed]);

  const saveDate = async () => {
    if (!parsed) {
      return;
    }
    Keyboard.dismiss();
    await setSobrietyDate(parsed.storageValue);
    router.back();
  };

  const removeDate = async () => {
    Keyboard.dismiss();
    await removeSobrietyDate();
    router.back();
  };

  const notNow = async () => {
    dismissPrompt();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft size={19} color={redesignColors.ink} strokeWidth={2.1} />
            </Pressable>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.copyBlock}>
            <AppText voice="reader" italic size={22} color={redesignColors.teal} style={styles.kicker}>
              One day at a time.
            </AppText>
            <AppText voice="display" weight="medium" size={29} color={redesignColors.ink} style={styles.title}>
              What&apos;s your{'\n'}sobriety date?
            </AppText>
            <AppText voice="interface" size={14.5} color={redesignColors.inkSecondary} style={styles.body}>
              Counting days helps some people stay grounded. There&apos;s no pressure — add it now or anytime later, and change it whenever you need.
            </AppText>
          </View>

          <View style={styles.cardWrap}>
            <LinearGradient
              colors={[redesignColors.teal, TEAL_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dateCard}
            >
              <AppText voice="interface" weight="bold" size={10.5} color="rgba(255,255,255,0.86)" style={styles.cardLabel}>
                SOBRIETY DATE
              </AppText>
              <TextInput
                value={dateInput}
                onChangeText={value => setDateInput(formatDateInput(value))}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={redesignColors.inkMuted}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.dateInput}
              />
              <View style={styles.feedbackSlot}>
                {breakdown ? (
                  <AppText voice="interface" weight="bold" size={15} color={redesignColors.white} style={styles.breakdown}>
                    {`${breakdown.years} years · ${breakdown.months} months · ${breakdown.days} days`}
                  </AppText>
                ) : null}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.footer}>
            <Pressable
              disabled={!parsed}
              style={[styles.saveButton, !parsed && styles.saveButtonDisabled]}
              onPress={saveDate}
            >
              <AppText voice="interface" weight="bold" size={15} color={redesignColors.white}>
                Save date
              </AppText>
              <ArrowRight size={21} color={redesignColors.white} strokeWidth={2.3} />
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={sobrietyDate ? removeDate : notNow}>
              <AppText voice="interface" weight="semiBold" size={14} color={redesignColors.inkSecondary}>
                {sobrietyDate ? 'Remove sober date' : 'Not now'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ONBOARDING_PAPER,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  topBarSpacer: {
    width: 60,
  },
  copyBlock: {
    paddingBottom: 4,
    paddingHorizontal: 26,
    paddingTop: 14,
  },
  kicker: {
    lineHeight: 27.5,
  },
  title: {
    letterSpacing: -0.6,
    lineHeight: 32.5,
    marginTop: 10,
  },
  body: {
    lineHeight: 22.5,
    marginTop: 10,
  },
  cardWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dateCard: {
    alignItems: 'center',
    borderRadius: 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    shadowColor: redesignColors.teal,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.23,
    shadowRadius: 28,
  },
  cardLabel: {
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  dateInput: {
    backgroundColor: redesignColors.surface,
    borderRadius: 12,
    color: redesignColors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 19,
    minHeight: 56,
    paddingHorizontal: 16,
    textAlign: 'center',
    width: '100%',
  },
  feedbackSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 34,
  },
  breakdown: {
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 30,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.teal,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: redesignColors.teal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.27,
    shadowRadius: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C9C4',
    shadowOpacity: 0,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
