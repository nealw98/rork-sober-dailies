// Spot Check — single-form redesign (2026-08-03, docs/spotcheck-redesign-spec.md).
// Replaces the 4-step wizard: ONE page (feelings chips + what's-going-on +
// the app's reflection) that is complete in itself. Three save states
// (Neal, 2026-08-03):
//   1. Save pill (top right) — saves in place and STAYS; edits re-arm it; a
//      re-save updates the same record, never duplicates.
//   2. Save & close / 3. Close without saving — on the back chevron when
//      dirty; labels are a UI iteration, the states are the contract.
// 2026-08-05 (Neal): the sponsor handoff is RETIRED — the "Save & talk with
// {name}" CTA, the sponsor picker sheet, and the ephemeral chat screen are
// all gone. The form is the whole feature and the reflection card is its
// last word.
// Onboarding v4: <SpotCheckForm onboarding/> is the one free Spot Check in the
// "try the sponsors" step — nothing is saved, one reflection, then an end card.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Alert, BackHandler,
  Keyboard, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import BackButton from '@/components/BackButton';
import { SPOT_CHECK_FEELINGS } from '@/constants/spotCheckPersonas';
import { askFormReflection, SponsorLimitError } from '@/lib/spotCheckLLM';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { confirmSaved } from '@/lib/savedNotice';
import { usePane } from '@/components/layout/PaneContext';
import { useDailies } from '@/hooks/use-dailies-store';
import PaneExpandButton from '@/components/layout/PaneExpandButton';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import type { SponsorType } from '@/types';
import type { SpotCheckEntry } from '@/types/spotCheck';
import { tryButtonLabel, type TryOffer } from '@/constants/onboardingSponsors';

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';

// The record keeps its sponsorId field for schema compatibility, but nothing
// conducts a spot check any more (handoff retired 2026-08-05). Journey reads
// it only for the legacy "What {name} heard" heading, which renders on
// wizard-era records alone.
const RECORD_SPONSOR_ID: SponsorType = 'supportive';

type SpotCheckOnboarding = {
  offer: TryOffer;
  anyLeft: boolean;
  onBack: () => void;
  onTryAnother: () => void;
  onStartTrial: () => void;
  onFinished: () => void;
};

export default function InventoryScreen() {
  return <SpotCheckForm />;
}

export function SpotCheckForm({ onboarding }: { onboarding?: SpotCheckOnboarding }) {
  const router = useRouter();
  // Non-null inside Today's wide-layout pane — back means closing the pane.
  const pane = usePane();
  const dailies = useDailies();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();

  const [feelings, setFeelings] = useState<string[]>([]);
  const [whatsGoingOn, setWhatsGoingOn] = useState('');
  const [saving, setSaving] = useState(false);
  // "Other…" pill: free-text input for a feeling not on the fixed list
  // (restored from the wizard, 2026-08-04).
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  // The saved record's id, plus whether the form changed since that save —
  // together these drive the Save pill's three visual states.
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [editedSinceSave, setEditedSinceSave] = useState(false);

  const ready = feelings.length > 0 && whatsGoingOn.trim() !== '';
  const dirty = (feelings.length > 0 || whatsGoingOn.trim() !== '') && (savedEntryId === null || editedSinceSave);

  const markEdited = () => setEditedSinceSave(true);

  // App reflection (2026-08-04, replaces the static Watch For/Strive For
  // card; REVISED same day, Neal): fired EXPLICITLY by the Enter/Done key on
  // the what's-going-on input — not on a typing pause. Understanding-first
  // content (summary + a conversational pointer to 2–3 inventory assets).
  // Key-guarded so re-submitting unchanged input is a no-op; the old text
  // stays visible until replaced; total failure (offline) shows nothing.
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  // Onboarding: the free reflection is done (or this device already had it) —
  // the form locks and the end card shows.
  const [tryDone, setTryDone] = useState(false);
  const [tryError, setTryError] = useState<string | null>(null);
  // Visible Enter/Cancel row while the what's-going-on input is focused
  // (Neal, 2026-08-04) — the keyboard's return key alone wasn't
  // discoverable. Enter dismisses + generates; Cancel just dismisses.
  const [goingOnFocused, setGoingOnFocused] = useState(false);
  const reflectionKey = useRef('');
  const generateReflection = async () => {
    if (!ready || tryDone) return;
    const key = `${feelings.join(',')}|${whatsGoingOn.trim()}`;
    if (reflectionKey.current === key) return;
    setReflecting(true);
    setTryError(null);
    try {
      const text = await askFormReflection(
        feelings,
        whatsGoingOn.trim(),
        onboarding ? { onboarding: true, member: onboarding.offer === 'member' } : undefined,
      );
      reflectionKey.current = key;
      setReflection(text);
      // The reflection is part of the saved record now — a fresh one after a
      // save re-arms the Save pill so it can be captured.
      markEdited();
      if (onboarding) { setTryDone(true); onboarding.onFinished(); }
    } catch (e) {
      // Outside onboarding: leave whatever is showing.
      if (onboarding && e instanceof SponsorLimitError) {
        setTryError(e.message);
        setTryDone(true);
        onboarding.onFinished();
      } else if (onboarding) {
        setTryError('Couldn’t get a reflection just now. Try again.');
      }
    }
    setReflecting(false);
  };

  const toggleFeeling = (f: string) => {
    if (tryDone) return;
    markEdited();
    setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };

  // Custom ("Other") feelings ride alongside the fixed set; tapping one off
  // removes it entirely (it's derived from `feelings`, so it just disappears).
  const customFeelings = feelings.filter((f) => !SPOT_CHECK_FEELINGS.includes(f));
  const addOther = () => {
    const f = otherText.trim();
    setOtherText('');
    setOtherOpen(false);
    if (f && !feelings.includes(f)) {
      markEdited();
      setFeelings((cur) => [...cur, f]);
    }
  };

  // ── Save: in place. First save inserts; later saves update the same id. ──
  const save = async (): Promise<string> => {
    const sp = RECORD_SPONSOR_ID;
    const id = savedEntryId ?? Date.now().toString();
    const entry: SpotCheckEntry = {
      id,
      createdAt: Date.now(),
      sponsorId: sp,
      feelings,
      whatsGoingOn: whatsGoingOn.trim(),
      // The save is THIS PAGE ONLY (Neal, 2026-08-04): feelings + situation +
      // the reflection if one was generated. The chat is separate and never
      // writes back.
      reflection,
      causesQuestion: null,
      causesAnswer: null,
      summary: null,
      suggestions: null,
    };
    const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
    const records: SpotCheckEntry[] = stored ? JSON.parse(stored) : [];
    const at = records.findIndex((r) => r.id === id);
    if (at >= 0) {
      // Update in place, preserving createdAt.
      records[at] = { ...records[at], sponsorId: sp, feelings, whatsGoingOn: entry.whatsGoingOn, reflection };
    } else {
      records.unshift(entry);
    }
    await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logEvent('entry_saved', { type: 'spot_check', sponsor: sp, feeling_count: feelings.length, update: at >= 0 });
    if (!onboarding) dailies.markActionDone('spotcheck');
    setSavedEntryId(id);
    setEditedSinceSave(false);
    return id;
  };

  // State 1 — Save pill: save and STAY.
  const onSave = async () => {
    if (saving || !ready) return;
    setSaving(true);
    try { await save(); } catch (e) { console.error('Spot check save failed:', e); }
    setSaving(false);
  };

  // States 2 & 3 — leaving. Clean form (or saved + unedited) just exits.
  const exit = () => { if (pane) pane.close(); else if (router.canGoBack()) router.back(); else router.replace('/'); };
  const confirmExit = () => {
    // Onboarding saves nothing, so there's nothing to ask.
    if (onboarding) { onboarding.onBack(); return; }
    if (!dirty) { exit(); return; }
    Alert.alert('Save this spot check?', 'What you’ve entered will show up in Journey.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Close without saving', style: 'destructive', onPress: exit },
      {
        text: 'Save & close',
        onPress: async () => {
          try { await save(); confirmSaved(pane?.close); } catch (e) { console.error('Spot check save failed:', e); }
        },
      },
    ]);
  };
  useEffect(() => {
    // Onboarding's Android back is handled by the onboarding flow.
    if (onboarding) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { confirmExit(); return true; });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const savePillLabel = saving ? 'Saving…' : savedEntryId && !editedSinceSave ? 'Saved' : 'Save';
  const savePillActive = ready && !(savedEntryId && !editedSinceSave);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top }} />

      {/* Header: chevron (bail out) · title · Save pill */}
      <View style={styles.headerRow}>
        <BackButton onPress={confirmExit} />
        <Text style={styles.title}>Spot Check</Text>
        {onboarding ? (
          // Only while there's another to try; the back arrow still
          // returns to the list.
          onboarding.anyLeft && (
            <Pressable onPress={onboarding.onTryAnother} accessibilityRole="button" style={styles.tryAnotherPill}>
              <Text style={styles.tryAnotherPillText}>Try another</Text>
            </Pressable>
          )
        ) : (
        <>
        <PaneExpandButton />
        <Pressable
          onPress={onSave}
          disabled={!savePillActive || saving}
          accessibilityRole="button"
          accessibilityLabel="Save spot check"
          style={[styles.savePill, savePillActive ? styles.savePillOn : styles.savePillOff]}
        >
          <Text style={[styles.savePillText, savePillActive ? styles.savePillTextOn : styles.savePillTextOff]}>
            {savePillLabel}
          </Text>
        </Pressable>
        </>
        )}
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        // Clearance for the Enter/Cancel row below the focused input — at 24
        // the keyboard sat right at the input's edge and hid the buttons.
        bottomOffset={84}
        showsVerticalScrollIndicator={false}
      >
        {onboarding && (
          <View style={styles.tryIntro}>
            <Text style={styles.tryIntroText}>
              Upset, angry or anxious right now? Tap how you feel, write a line about what’s going on, and tap Enter. You’ll get a short reflection back — a quick Step 10 on the spot.
            </Text>
          </View>
        )}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>HOW ARE YOU FEELING?</Text>
        <View style={styles.pills}>
          {[...SPOT_CHECK_FEELINGS, ...customFeelings].map((f) => {
            const on = feelings.includes(f);
            return (
              <Pressable
                key={f}
                onPress={() => toggleFeeling(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.pill, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : styles.pillOff]}
              >
                <Text style={[styles.pillText, { color: on ? '#fff' : c.textSecondary }]}>{f}</Text>
              </Pressable>
            );
          })}
          {/* The Other… pill becomes the field IN PLACE (Neal, 2026-08-05) —
              it used to open a full-width input below the row, which read as a
              second, separate question. Typing happens in the pill itself and
              it collapses back on submit/blur. */}
          {tryDone ? null : otherOpen ? (
            <View style={[styles.pill, styles.pillOther, styles.pillOtherOpen, { borderColor: colors.accent }]}>
              <TextInput
                value={otherText}
                onChangeText={setOtherText}
                onSubmitEditing={addOther}
                onBlur={addOther}
                placeholder="Name it"
                placeholderTextColor={c.textMuted}
                style={styles.pillInput}
                returnKeyType="done"
                autoFocus
                maxLength={30}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setOtherOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Other feeling"
              style={[styles.pill, styles.pillOther]}
            >
              <Text style={[styles.pillText, { color: c.textMuted }]}>Other…</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>WHAT’S GOING ON?</Text>
        <TextInput
          style={[styles.input, { minHeight: 120 }]}
          multiline
          value={whatsGoingOn}
          editable={!tryDone}
          onChangeText={(t) => { markEdited(); setWhatsGoingOn(t); }}
          placeholder="What’s happening right now"
          placeholderTextColor={c.textMuted}
          onFocus={() => setGoingOnFocused(true)}
          onBlur={() => setGoingOnFocused(false)}
          // Enter/Done submits for the reflection (Neal, 2026-08-04) — the
          // return key closes the keyboard and fires the response instead of
          // inserting a newline. The visible Enter button below does the same.
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={generateReflection}
        />
        {goingOnFocused && (
          <View style={styles.inputBtnRow}>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={[styles.inputBtn, styles.inputBtnGhost]}
            >
              <Text style={[styles.inputBtnText, { color: c.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { Keyboard.dismiss(); generateReflection(); }}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityLabel="Enter"
              style={[styles.inputBtn, { backgroundColor: colors.accent }, !ready && styles.btnDisabled]}
            >
              <Text style={[styles.inputBtnText, { color: '#fff' }]}>Enter</Text>
            </Pressable>
          </View>
        )}

        {(reflection !== null || reflecting) && (
          <View style={styles.reflectionCard}>
            {reflection !== null && <Text style={styles.reflectionText}>{reflection}</Text>}
            {reflecting && (
              <ActivityIndicator
                size="small"
                color={colors.primaryDark}
                style={reflection !== null ? { marginTop: 10 } : null}
              />
            )}
          </View>
        )}
        {!!tryError && <Text style={styles.tryError} accessibilityLiveRegion="polite">{tryError}</Text>}
        {onboarding && tryDone && (
          <View style={styles.tryDone}>
            <Text style={styles.tryDoneText}>That’s your free spot check.</Text>
            <View style={styles.tryDoneBtns}>
              {/* One way forward: the next try while any are left, then the
                  offer. The list's own button still reaches the paywall early. */}
              {onboarding.anyLeft ? (
                <Pressable onPress={onboarding.onTryAnother} style={styles.tryDoneBtn} accessibilityRole="button">
                  <Text style={styles.tryDoneBtnText}>Try another</Text>
                </Pressable>
              ) : (
                <Pressable onPress={onboarding.onStartTrial} style={styles.tryDoneBtn} accessibilityRole="button">
                  <Text style={styles.tryDoneBtnText}>{tryButtonLabel(onboarding.offer)}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        <View style={{ height: Math.max(insets.bottom, 14) + 20 }} />
      </KeyboardAwareScrollView>
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
    scroll: { paddingHorizontal: 18, paddingBottom: 24 },

    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 10 },
    title: { flex: 1, fontFamily: fontFamily.display, fontSize: 24, letterSpacing: -0.4, color: c.text },
    savePill: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, minHeight: 38, justifyContent: 'center' },
    savePillOn: { backgroundColor: colors.accent },
    savePillOff: { borderWidth: 1.5, borderColor: c.border },
    savePillText: { fontFamily: fontFamily.bold, fontSize: 14 },
    savePillTextOn: { color: '#fff' },
    savePillTextOff: { color: c.textMuted },

    sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.1, color: c.textMuted, marginTop: 8, marginBottom: 10 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, minHeight: 40, justifyContent: 'center' },
    pillOff: { backgroundColor: c.surface, borderColor: c.border, ...(isDark ? { borderColor: 'rgba(255,255,255,0.12)' } : null) },
    pillOther: { backgroundColor: 'transparent', borderColor: c.textMuted + '66', borderStyle: 'dashed' },
    // Typing state: wide enough for a word or two, and the row's flexWrap
    // drops it to its own line when it doesn't fit. Vertical padding moves to
    // the TextInput so the text sits on the pill's centre line.
    pillOtherOpen: { minWidth: 150, paddingVertical: 0, borderStyle: 'solid' },
    pillInput: {
      flex: 1, fontFamily: fontFamily.semiBold, fontSize: 13.5, color: c.text,
      padding: 0, minHeight: 40, textAlignVertical: 'center',
    },
    pillText: { fontFamily: fontFamily.semiBold, fontSize: 13.5 },

    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14, fontFamily: fontFamily.regular,
      fontSize: 16, lineHeight: 25, color: c.text, textAlignVertical: 'top', ...darkCard,
    },

    reflectionCard: {
      marginTop: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16,
      backgroundColor: isDark ? c.surfaceRaised : colors.primarySoft,
      borderWidth: 1, borderColor: colors.primary + '33',
    },
    reflectionText: {
      fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23, color: c.text,
    },
    inputBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    inputBtn: {
      paddingVertical: 9, paddingHorizontal: 20, borderRadius: 999, minHeight: 38,
      justifyContent: 'center',
    },
    inputBtnGhost: {
      backgroundColor: 'transparent', borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : c.border,
    },
    inputBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14.5 },
    btnDisabled: { opacity: 0.45 },

    // onboarding try
    tryAnotherPill: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
    tryAnotherPillText: { fontFamily: fontFamily.bold, fontSize: 13, color: '#fff' },
    tryIntro: { backgroundColor: colors.accentSoft, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginTop: 4 },
    tryIntroText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },
    tryError: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.destructive, textAlign: 'center', marginTop: 12 },
    tryDone: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center' },
    tryDoneText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primaryDark, textAlign: 'center' },
    tryDoneBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
    tryDoneBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
    tryDoneBtnText: { fontFamily: fontFamily.bold, fontSize: 14, color: '#fff' },
  });
};
