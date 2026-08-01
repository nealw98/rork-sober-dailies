// Nightly Review — the Tenth Step daily inventory (redesign 3.0). Per the
// prototype (hifi-tools-four.jsx NightlyReviewEditor): a clean new-entry
// composer of the 7 Step Ten questions (the yes/no daily-action checklist of
// the old screen is dropped). Saving writes to the evening-review store
// (local-first) and, when opened from a Today daily, checks it off.
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { maybePromptBackup } from '@/lib/backupPrompt';
import { confirmSaved } from '@/lib/savedNotice';

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
  // Tonight's review is a living document, exactly like the gratitude list:
  // prefill what's already saved so a second visit adds to it instead of
  // starting blank and overwriting the earlier answers (Neal, 2026-07-31).
  // The prefill is keyed to TODAY, so tomorrow opens clean on its own.
  const initialAnswers = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (initialAnswers.current !== null || !store || store.isLoading) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const saved = store.getSavedEntry(key)?.data as Record<string, unknown> | undefined;
    const seed: Record<string, string> = {};
    QUESTIONS.forEach((item) => {
      const v = saved?.[item.key];
      if (typeof v === 'string' && v.trim() !== '') seed[item.key] = v;
    });
    initialAnswers.current = seed;
    if (Object.keys(seed).length > 0) setAnswers(seed);
  }, [store]);

  const filledAnswers = useMemo(() => {
    const out: Record<string, string> = {};
    QUESTIONS.forEach((item) => {
      const v = (answers[item.key] ?? '').trim();
      if (v !== '') out[item.key] = v;
    });
    return out;
  }, [answers]);
  // Save lights up only when tonight's answers differ from what's stored.
  const dirty = Object.keys(filledAnswers).length > 0
    && JSON.stringify(filledAnswers) !== JSON.stringify(initialAnswers.current ?? {});
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
      // Tell them where it went — and let the dialog do the navigating, so the
      // Alert is never presented mid-transition. If the one-time backup nudge is
      // firing on this save, stand down rather than stack two dialogs; the save
      // confirmation comes back on the next entry.
      maybePromptBackup().then((backupShown) => {
        if (backupShown) router.back();
        else confirmSaved();
      });
      return;
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
