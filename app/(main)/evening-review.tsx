// Nightly Review — the Tenth Step daily inventory (redesign 3.0). Per the
// prototype (hifi-tools-four.jsx NightlyReviewEditor): a clean new-entry
// composer of the 7 Step Ten questions (the yes/no daily-action checklist of
// the old screen is dropped). Saving writes to the evening-review store
// (local-first) and, when opened from a Today daily, checks it off.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import { useDailies } from '@/hooks/use-dailies-store';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';

const tool = TOOLS.nightly;

import { NIGHTLY_QUESTIONS as QUESTIONS } from '@/constants/nightlyQuestions';

function PromptCard({ q, value, onChange }: { q: string; value: string; onChange: (v: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const filled = value.trim() !== '';
  return (
    <View style={styles.prompt}>
      <Text style={styles.question}>{q}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Write your reflection here…"
        placeholderTextColor={c.textMuted}
        style={[styles.answer, filled && { borderColor: colors.tertiary + '44' }]}
        multiline
        keyboardAppearance={isDark ? 'dark' : 'light'}
      />
    </View>
  );
}

export default function NightlyReviewScreen() {
  const router = useRouter();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const styles = useThemedStyles(makeStyles);
  const store = useEveningReviewStore();
  const dailies = useDailies();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const dirty = QUESTIONS.some((item) => (answers[item.key] ?? '').trim() !== '');
  const setAnswer = (key: string, v: string) => setAnswers((a) => ({ ...a, [key]: v }));

  const commit = () => {
    Keyboard.dismiss();
    if (dirty && store) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const r = (key: string) => (answers[key] ?? '').trim();
      store.saveDetailedEntry({
        stayedSober: false,
        prayedOrMeditated: false,
        practicedGratitude: false,
        readAALiterature: false,
        talkedToAlcoholic: false,
        didSomethingForOthers: false,
        reflectionResentful: r('reflectionResentful'),
        reflectionApology: r('reflectionApology'),
        reflectionShared: r('reflectionShared'),
        reflectionOthers: r('reflectionOthers'),
        reflectionKind: r('reflectionKind'),
        reflectionWell: r('reflectionWell'),
        reflectionBetter: r('reflectionBetter'),
        resentfulFlag: '', resentfulNote: '',
        selfishFlag: '', selfishNote: '',
        fearfulFlag: '', fearfulNote: '',
        apologyFlag: '', apologyName: '',
        kindnessFlag: '', kindnessNote: '',
        spiritualFlag: '', spiritualNote: '',
        prayerMeditationFlag: '',
      });
      logEvent('entry_saved', { type: 'nightly_review' });
      if (dailyId) dailies.markDone(dailyId);
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader tool={tool} dirty={dirty} onCommit={commit} />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        <ToolIntro tool={tool} variant="bar">
          {'“Continued to take personal inventory and when we were wrong promptly admitted it.” — Step Ten'}
        </ToolIntro>

        <View style={styles.body}>
          {QUESTIONS.map((item) => (
            <PromptCard key={item.key} q={item.q} value={answers[item.key] ?? ''} onChange={(v) => setAnswer(item.key, v)} />
          ))}

          <View style={styles.sourceWrap}>
            <Text style={styles.source}>
              The Tenth Step daily inventory — <Text style={styles.sourceStrong}>Alcoholics Anonymous, p.&nbsp;86</Text>
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  body: { paddingHorizontal: 18 },

  prompt: { marginBottom: 24 },
  question: { fontFamily: fontFamily.semiBold, fontSize: 17, lineHeight: 23, color: c.text, letterSpacing: -0.2, marginBottom: 11 },
  answer: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    minHeight: 58,
    fontFamily: fontFamily.regular,
    fontSize: 16.5,
    lineHeight: 23,
    color: c.text,
    ...darkCard,
  },

  sourceWrap: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.divider },
  source: { fontFamily: fontFamily.regularItalic, fontSize: 13.5, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
  sourceStrong: { color: c.textSecondary },
  });
};
