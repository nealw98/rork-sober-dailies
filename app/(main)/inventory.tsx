// Spot Check Inventory — sponsor-driven guided flow (redesign, July 2026).
// Four fixed steps voiced by the AI sponsor persona: (1) feeling pills and
// (2) what's-going-on are FIXED per-persona scripts (constants/
// spotCheckPersonas); (3) causes & conditions and (4) summary + suggestions
// are the flow's only two LLM calls (lib/spotCheckLLM), each with an offline
// fallback so the flow always completes. Saving writes a SpotCheckEntry to
// AsyncStorage (spot_check_inventories) and NEVER auto-marks the Today daily
// done — completion is fully manual (product decision, July 2026). "Keep
// talking" hands the entry into the sponsor's regular chat thread via the
// pending-handoff key; sponsor-chat injects it as a context card.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Alert, BackHandler } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Check, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { todayLabel } from '@/components/ToolScreen';
import { getSponsorById } from '@/constants/sponsors';
import {
  getSpotCheckScript, getSpotCheckFallbackQuestion,
  SPOT_CHECK_FEELINGS, SPOT_CHECK_SPONSOR_IDS, SPOT_CHECK_HANDOFF_KEY,
} from '@/constants/spotCheckPersonas';
import { askCausesQuestion, askSummary } from '@/lib/spotCheckLLM';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import type { SponsorType } from '@/types';
import type { SpotCheckEntry } from '@/types/spotCheck';

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';
const STEPS = 4;

// Lightweight animated ellipsis for the sponsor bubble's thinking state.
function ThinkingDots() {
  const styles = useThemedStyles(makeStyles);
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.bubbleText}>{'·'.repeat(dots) + ' '}</Text>;
}

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const { lastSponsorId, setLastSponsor } = useLastSponsor();

  const [sponsorId, setSponsorId] = useState<SponsorType>('supportive');
  const [step, setStep] = useState(0);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [whatsGoingOn, setWhatsGoingOn] = useState('');
  const [causesQuestion, setCausesQuestion] = useState<string | null>(null);
  const [causesAnswer, setCausesAnswer] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [causesLoading, setCausesLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inherit the FAB's last-opened sponsor once it loads, unless the user
  // already changed it here or has moved past the first step.
  const userPicked = useRef(false);
  useEffect(() => {
    if (userPicked.current || step > 0) return;
    if (lastSponsorId && (SPOT_CHECK_SPONSOR_IDS as string[]).includes(lastSponsorId)) {
      setSponsorId(lastSponsorId as SponsorType);
    }
  }, [lastSponsorId, step]);

  const sponsor = getSponsorById(sponsorId);
  const script = getSpotCheckScript(sponsorId);
  const firstName = sponsor?.name.split(' ').slice(-1)[0] ?? 'your sponsor';
  const dirty = feelings.length > 0 || whatsGoingOn.trim() !== '' || causesAnswer.trim() !== '';

  // ── The two LLM calls, guarded against stale responses (sponsor switched
  // or step re-entered while a request was in flight) ──
  const causesReq = useRef(0);
  const runCausesQuestion = async (sid: SponsorType) => {
    const id = ++causesReq.current;
    setCausesLoading(true);
    try {
      const q = await askCausesQuestion(sid, feelings, whatsGoingOn.trim());
      if (causesReq.current !== id) return;
      setCausesQuestion(q);
    } catch {
      if (causesReq.current !== id) return;
      setCausesQuestion(getSpotCheckFallbackQuestion(sid));
    } finally {
      if (causesReq.current === id) setCausesLoading(false);
    }
  };

  const summaryReq = useRef(0);
  const runSummary = async (sid: SponsorType, answer: string | null) => {
    const id = ++summaryReq.current;
    setSummaryLoading(true);
    setSummaryFailed(false);
    try {
      const result = await askSummary(sid, {
        feelings,
        whatsGoingOn: whatsGoingOn.trim(),
        causesQuestion,
        causesAnswer: answer,
      });
      if (summaryReq.current !== id) return;
      setSummary(result.summary);
      setSuggestions(result.suggestions);
    } catch {
      if (summaryReq.current !== id) return;
      setSummary(null);
      setSuggestions(null);
      setSummaryFailed(true);
    } finally {
      if (summaryReq.current === id) setSummaryLoading(false);
    }
  };

  // ── Navigation between steps ──
  const goToCauses = () => {
    Keyboard.dismiss();
    setStep(2);
    if (causesQuestion === null && !causesLoading) runCausesQuestion(sponsorId);
  };
  const goToSummary = (skipped: boolean) => {
    Keyboard.dismiss();
    if (skipped) setCausesAnswer('');
    setStep(3);
    runSummary(sponsorId, skipped ? null : causesAnswer.trim() || null);
  };

  const onChangeSponsor = (id: SponsorType) => {
    if (id === sponsorId) return;
    userPicked.current = true;
    setSponsorId(id);
    setLastSponsor(id); // shared key — the FAB resumes this sponsor too
    // Re-voice the current step's generated content; user inputs are untouched.
    if (step === 2) runCausesQuestion(id);
    if (step === 3) runSummary(id, causesAnswer.trim() || null);
  };

  // Deep links land here with no back stack — fall back to home so exits
  // never fire an unhandled GO_BACK.
  const exit = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // ── Back out mid-flow: offer to save what's there (records to Journey) ──
  const confirmExit = () => {
    if (!dirty) { exit(); return; }
    Alert.alert('Save this spot check?', 'What you’ve entered so far will show up in Journey.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: exit },
      { text: 'Save & close', onPress: doneForNow },
    ]);
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { confirmExit(); return true; });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // ── Save + exits. Never marks the Today daily done (completion is manual). ──
  const save = async (): Promise<SpotCheckEntry> => {
    const entry: SpotCheckEntry = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      sponsorId,
      feelings,
      whatsGoingOn: whatsGoingOn.trim(),
      causesQuestion,
      causesAnswer: causesAnswer.trim() || null,
      summary,
      suggestions,
    };
    const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
    const records = stored ? JSON.parse(stored) : [];
    records.unshift(entry);
    await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logEvent('entry_saved', {
      type: 'spot_check',
      sponsor: sponsorId,
      feeling_count: feelings.length,
      skipped_causes: causesAnswer.trim() === '',
    });
    return entry;
  };

  const doneForNow = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await save();
      exit();
    } catch (error) {
      console.error('Error saving spot check:', error);
      setSaving(false);
    }
  };

  const keepTalking = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const entry = await save();
      await AsyncStorage.setItem(SPOT_CHECK_HANDOFF_KEY, JSON.stringify(entry));
      router.replace(`/sponsor-chat?sponsor=${sponsorId}`);
    } catch (error) {
      console.error('Error handing off spot check:', error);
      setSaving(false);
    }
  };

  // ── Pieces ──
  const askBubble = (text: React.ReactNode, thinking = false) => (
    <View style={styles.bubbleRow}>
      <Image source={sponsor?.avatar} style={styles.bubbleAvatar} contentFit="cover" />
      <View style={styles.flex}>
        {thinking ? <ThinkingDots /> : <Text style={styles.bubbleText}>{text}</Text>}
      </View>
    </View>
  );

  const recap = (label: string, text: string) => (
    <View style={styles.recapCard}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapBody}>{text}</Text>
    </View>
  );

  const continueBtn = (enabled: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={[styles.continueBtn, !enabled && styles.btnDisabled]}
      accessibilityRole="button"
      accessibilityLabel="Continue"
    >
      <Text style={styles.continueText}>Continue</Text>
    </Pressable>
  );

  const backBtn = (to: number) => (
    <Pressable onPress={() => setStep(to)} style={styles.backPill} accessibilityRole="button" accessibilityLabel="Back">
      <Text style={styles.backPillText}>Back</Text>
    </Pressable>
  );

  // ── Step bodies ──
  let body: React.ReactNode = null;
  if (step === 0) {
    // Custom ("Other") feelings ride alongside the fixed set; tapping one off
    // removes it entirely.
    const customFeelings = feelings.filter((f) => !SPOT_CHECK_FEELINGS.includes(f));
    const addOther = () => {
      const f = otherText.trim();
      setOtherText('');
      setOtherOpen(false);
      if (f && !feelings.includes(f)) setFeelings((cur) => [...cur, f]);
    };
    body = (
      <>
        {askBubble(script.ask1)}
        <View style={styles.pills}>
          {[...SPOT_CHECK_FEELINGS, ...customFeelings].map((f) => {
            const on = feelings.includes(f);
            return (
              <Pressable
                key={f}
                onPress={() => setFeelings((cur) => (on ? cur.filter((x) => x !== f) : [...cur, f]))}
                style={[styles.pill, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : styles.pillOff]}
              >
                <Text style={[styles.pillText, { color: on ? '#fff' : c.textSecondary }]}>{f}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setOtherOpen((v) => !v)}
            style={[styles.pill, styles.pillOther, otherOpen && { borderColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Other feeling"
          >
            <Text style={[styles.pillText, { color: c.textMuted }]}>Other…</Text>
          </Pressable>
        </View>
        {otherOpen && (
          <TextInput
            value={otherText}
            onChangeText={setOtherText}
            onSubmitEditing={addOther}
            onBlur={addOther}
            placeholder="Name it in a word or two"
            placeholderTextColor={c.textMuted}
            style={[styles.input, styles.otherInput]}
            returnKeyType="done"
            autoFocus
            maxLength={30}
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
        )}
      </>
    );
  } else if (step === 1) {
    body = (
      <>
        {recap('FEELING', feelings.join(' · '))}
        {askBubble(script.ask2)}
        <TextInput
          key="whatsGoingOn"
          value={whatsGoingOn}
          onChangeText={setWhatsGoingOn}
          placeholder="Where did the day turn?"
          placeholderTextColor={c.textMuted}
          style={[styles.input, { minHeight: 110 }]}
          multiline
          keyboardAppearance={isDark ? 'dark' : 'light'}
        />
      </>
    );
  } else if (step === 2) {
    body = (
      <>
        {recap('WHAT’S GOING ON', whatsGoingOn.trim())}
        {askBubble(causesQuestion, causesLoading)}
        <TextInput
          key="causesAnswer"
          value={causesAnswer}
          onChangeText={setCausesAnswer}
          placeholder="What’s on my side of the street?"
          placeholderTextColor={c.textMuted}
          style={[styles.input, { minHeight: 100 }]}
          multiline
          keyboardAppearance={isDark ? 'dark' : 'light'}
        />
      </>
    );
  } else {
    body = (
      <>
        {summaryLoading ? (
          askBubble(null, true)
        ) : summaryFailed ? (
          askBubble('Your spot check is ready to save. I couldn’t reach the connection to reflect it back right now — but you did the looking, and that’s the part that counts.')
        ) : (
          <>
            {askBubble(summary)}
            {/* Plain rows, not cards — the suggestions read as a continuation
                of the sponsor's voice, so no chrome of their own. */}
            <View style={styles.bullets}>
              {(suggestions ?? []).map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Check size={15} color={colors.accent} strokeWidth={2.6} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {!summaryLoading && (
          <>
            {/* "Keep talking" rides with the suggestions; the footer owns only Done */}
            <View style={styles.bullets}>
              <Pressable
                onPress={keepTalking}
                disabled={saving}
                style={[styles.keepCard, saving && styles.btnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={`Keep talking with ${firstName}`}
              >
                <MessageCircle size={15} color={colors.accentDark} strokeWidth={2.2} />
                <Text style={styles.keepCardText}>Keep talking with {firstName}</Text>
              </Pressable>
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header: back chevron + large title + date. The flow owns save. ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={confirmExit} style={styles.headerBack} />
        <Text style={styles.title}>Spot Check Inventory</Text>
        <Text style={styles.subtitle}>{todayLabel()}</Text>
      </View>

      {/* The avoiding view lifts the WHOLE column — scroll area and footer
          dock — above the keyboard. Without it the dock sat below the scroll
          view, outside the keyboard math, and inputs could end up covered.
          Bonus: Back/Skip/Continue stay reachable while typing. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        {/* Progress rail */}
        <View style={styles.rail}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.railSeg, { backgroundColor: i <= step ? colors.accent : c.border }]} />
          ))}
        </View>

        {/* Sponsor pills — tap to switch; re-voices sponsor content, inputs untouched */}
        <View style={styles.sponsorRow}>
          {SPOT_CHECK_SPONSOR_IDS.map((id) => {
            const sp = getSponsorById(id);
            const on = id === sponsorId;
            return (
              <Pressable
                key={id}
                onPress={() => onChangeSponsor(id)}
                style={[styles.sponsorPill, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : styles.sponsorPillOff]}
                accessibilityRole="button"
                accessibilityLabel={`Sponsor ${sp?.name}`}
              >
                <Image source={sp?.avatar} style={styles.sponsorAvatar} contentFit="cover" />
                <Text style={[styles.sponsorPillText, { color: on ? '#fff' : c.textSecondary }]} numberOfLines={1}>
                  {sp?.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {body}
      </KeyboardAwareScrollView>

      {/* ── Footer dock ── */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 14) + 16 }]}>
        {step === 0 && continueBtn(feelings.length > 0, () => setStep(1))}
        {step === 1 && (
          <>
            {backBtn(0)}
            {continueBtn(whatsGoingOn.trim() !== '', goToCauses)}
          </>
        )}
        {step === 2 && (
          <>
            {backBtn(1)}
            <Pressable onPress={() => goToSummary(true)} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Skip">
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            {continueBtn(!causesLoading, () => goToSummary(false))}
          </>
        )}
        {step === 3 && (
          <Pressable
            onPress={doneForNow}
            disabled={saving || summaryLoading}
            style={[styles.doneBtn, (saving || summaryLoading) && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Done for now"
          >
            <Text style={styles.doneText}>Done for now</Text>
          </Pressable>
        )}
      </View>
      </KeyboardAvoidingView>

    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 18, paddingBottom: 20 },

    header: { paddingHorizontal: 22, paddingBottom: 10 },
    headerBack: { marginBottom: 6 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    subtitle: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 3 },

    rail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 14 },
    railSeg: { flex: 1, height: 4, borderRadius: 2 },

    sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sponsorAvatar: { width: 22, height: 22, borderRadius: 11 },
    sponsorPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5, minHeight: 40 },
    sponsorPillOff: { backgroundColor: c.surface, borderColor: c.border, ...(isDark ? { borderColor: 'rgba(255,255,255,0.12)' } : null) },
    sponsorPillText: { fontFamily: fontFamily.semiBold, fontSize: 12.5, flexShrink: 1 },

    bubbleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    bubbleAvatar: { width: 30, height: 30, borderRadius: 15, marginTop: 2 },
    bubbleText: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 22.5, color: c.text },

    recapCard: { marginBottom: 12, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    recapLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: c.textMuted, marginBottom: 4, textTransform: 'uppercase' },
    recapBody: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19.5, color: c.textSecondary },

    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1.5, minHeight: 44, justifyContent: 'center' },
    pillOff: { backgroundColor: c.surface, borderColor: c.border, ...(isDark ? { borderColor: 'rgba(255,255,255,0.12)' } : null) },
    pillOther: { backgroundColor: 'transparent', borderColor: c.textMuted + '66', borderStyle: 'dashed' },
    pillText: { fontFamily: fontFamily.semiBold, fontSize: 14.5 },
    otherInput: { marginTop: 12, minHeight: 0, paddingVertical: 12 },

    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14, fontFamily: fontFamily.regular,
      fontSize: 16, lineHeight: 25, color: c.text, textAlignVertical: 'top', ...darkCard,
    },

    bullets: { marginLeft: 40, marginBottom: 14, gap: 10 },
    bulletRow: { flexDirection: 'row', gap: 10 },
    bulletIcon: { marginTop: 3 },
    bulletText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 22, color: c.text },

    dock: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 18, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
    },
    continueBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center' },
    continueText: { fontFamily: fontFamily.bold, fontSize: 15.5, color: '#fff' },
    backPill: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: c.border },
    backPillText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.textSecondary },
    skipBtn: { paddingVertical: 14, paddingHorizontal: 10 },
    skipText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textMuted },
    // One palette per page: the whole flow runs on the accent family, so the
    // summary-step actions do too (they were teal, which read as a third style).
    keepCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12,
      backgroundColor: isDark ? c.surfaceRaised : c.surface, borderWidth: 1.5, borderColor: colors.accent,
    },
    keepCardText: { flex: 1, fontFamily: fontFamily.bold, fontSize: 13.5, lineHeight: 20, color: colors.accentDark },
    doneBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center' },
    doneText: { fontFamily: fontFamily.bold, fontSize: 14.5, color: '#fff' },
    btnDisabled: { opacity: 0.4 },
  });
};
