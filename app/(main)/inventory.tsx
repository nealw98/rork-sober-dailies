// Spot Check — single-form redesign (2026-08-03, docs/spotcheck-redesign-spec.md).
// Replaces the 4-step wizard: one page (feelings chips + what's-going-on +
// live Watch For/Strive For preview) that is complete in itself, plus a split
// CTA into the REAL sponsor chat (form content = first user message; the chat
// runs the two-turn contract). Three save states (Neal, 2026-08-03):
//   1. Save pill (top right) — saves in place and STAYS; edits re-arm it; a
//      re-save updates the same record, never duplicates.
//   2. Save & close / 3. Close without saving — on the back chevron when
//      dirty; labels are a UI iteration, the states are the contract.
// Talk-it-through never saves; it carries savedEntryId (gates the take
// prompt in chat). LLM calls live entirely on the chat side now.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Alert, BackHandler,
  Keyboard, Modal, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Check } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { getSponsorById, getAvailableSponsors } from '@/constants/sponsors';
import { SPOT_CHECK_FEELINGS, SPOT_CHECK_SEED_KEY } from '@/constants/spotCheckPersonas';
import { pairsForFeelings } from '@/constants/spotCheckPairs';
import { prefetchCausesQuestion } from '@/lib/spotCheckLLM';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { confirmSaved } from '@/lib/savedNotice';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import type { SponsorType } from '@/types';
import type { SpotCheckEntry, SpotCheckSeed } from '@/types/spotCheck';

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { lastSponsorId, setLastSponsor } = useLastSponsor();

  const [sponsorId, setSponsorId] = useState<SponsorType>('supportive');
  const [feelings, setFeelings] = useState<string[]>([]);
  const [whatsGoingOn, setWhatsGoingOn] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // The saved record's id, plus whether the form changed since that save —
  // together these drive the Save pill's three visual states.
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [editedSinceSave, setEditedSinceSave] = useState(false);

  // Inherit the FAB's last-opened sponsor once it loads (full roster — the
  // wizard's 3-persona limit is gone), unless the user picked one here.
  const userPicked = useRef(false);
  useEffect(() => {
    if (userPicked.current) return;
    if (lastSponsorId && getSponsorById(lastSponsorId)) {
      setSponsorId(lastSponsorId as SponsorType);
    }
  }, [lastSponsorId]);

  const sponsor = getSponsorById(sponsorId);
  const firstName = sponsor?.name.split(' ').slice(-1)[0] ?? 'your sponsor';
  const ready = feelings.length > 0 && whatsGoingOn.trim() !== '';
  const dirty = (feelings.length > 0 || whatsGoingOn.trim() !== '') && (savedEntryId === null || editedSinceSave);
  const pairs = pairsForFeelings(feelings);

  const markEdited = () => setEditedSinceSave(true);

  // Speculative prefetch: once the form is ready and the user pauses for a
  // beat, fire the page-3 question so it's already in flight (often already
  // resolved) before they tap Talk-it-through. Key-guarded in spotCheckLLM,
  // so edits after the pause just supersede the stale one; the tap-time
  // prefetch in talk() remains the safety net for sponsor-sheet picks.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => prefetchCausesQuestion(sponsorId, feelings, whatsGoingOn.trim()), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, feelings, whatsGoingOn, sponsorId]);

  const toggleFeeling = (f: string) => {
    markEdited();
    setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };

  // ── Save: in place. First save inserts; later saves update the same id. ──
  const save = async (): Promise<string> => {
    const id = savedEntryId ?? Date.now().toString();
    const entry: SpotCheckEntry = {
      id,
      createdAt: Date.now(),
      sponsorId,
      feelings,
      whatsGoingOn: whatsGoingOn.trim(),
      causesQuestion: null,
      causesAnswer: null,
      summary: null,
      suggestions: null,
    };
    const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
    const records: SpotCheckEntry[] = stored ? JSON.parse(stored) : [];
    const at = records.findIndex((r) => r.id === id);
    if (at >= 0) {
      // Update in place, preserving createdAt and any take already added.
      records[at] = { ...records[at], sponsorId, feelings, whatsGoingOn: entry.whatsGoingOn };
    } else {
      records.unshift(entry);
    }
    await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logEvent('entry_saved', { type: 'spot_check', sponsor: sponsorId, feeling_count: feelings.length, update: at >= 0 });
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
  const exit = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  const confirmExit = () => {
    if (!dirty) { exit(); return; }
    Alert.alert('Save this spot check?', 'What you’ve entered will show up in Journey.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Close without saving', style: 'destructive', onPress: exit },
      {
        text: 'Save & close',
        onPress: async () => {
          try { await save(); confirmSaved(); } catch (e) { console.error('Spot check save failed:', e); }
        },
      },
    ]);
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { confirmExit(); return true; });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // ── Talk it through: seed the REAL chat. Never saves. ──
  const talk = async (sid: SponsorType) => {
    if (!ready) return;
    Keyboard.dismiss();
    setSheetOpen(false);
    userPicked.current = true;
    setSponsorId(sid);
    setLastSponsor(sid);
    const seed: SpotCheckSeed = {
      sponsorId: sid,
      feelings,
      whatsGoingOn: whatsGoingOn.trim(),
      savedEntryId: editedSinceSave ? null : savedEntryId,
    };
    try {
      // Fire the page-3 question NOW — the round-trip overlaps navigation
      // instead of starting after the chat screen mounts.
      prefetchCausesQuestion(sid, feelings, whatsGoingOn.trim());
      await AsyncStorage.setItem(SPOT_CHECK_SEED_KEY, JSON.stringify(seed));
      logEvent('spot_check_talk', { sponsor: sid, saved: seed.savedEntryId != null });
      // The chat half is its own EPHEMERAL session (never the main sponsor
      // thread) — push, so backing out of it returns to this form.
      router.push('/(main)/spot-check-chat');
    } catch (e) {
      console.error('Spot check seed failed:', e);
    }
  };

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
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>HOW ARE YOU FEELING?</Text>
        <View style={styles.pills}>
          {SPOT_CHECK_FEELINGS.map((f) => {
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
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>WHAT’S GOING ON?</Text>
        <TextInput
          style={[styles.input, { minHeight: 120 }]}
          multiline
          value={whatsGoingOn}
          onChangeText={(t) => { markEdited(); setWhatsGoingOn(t); }}
          placeholder="What’s happening right now"
          placeholderTextColor={c.textMuted}
        />

        {pairs.length > 0 && (
          <View style={styles.pairsCard}>
            <View style={styles.pairsHead}>
              <Text style={[styles.pairsHeadText, { color: colors.accentDark }]}>WATCH FOR</Text>
              <Text style={[styles.pairsHeadText, { color: colors.primaryDark }]}>STRIVE FOR</Text>
            </View>
            {pairs.map((p) => (
              <View key={p.id} style={styles.pairRow}>
                <Text style={styles.pairOff}>{p.off}</Text>
                <Text style={[styles.pairOn, { color: colors.primaryDark }]}>{p.on}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>

      {/* Split CTA: talk with last-used sponsor · chevron opens full roster */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 14) + 16 }]}>
        <View style={[styles.splitBtn, { backgroundColor: colors.accent }, !ready && styles.btnDisabled]}>
          <Pressable
            onPress={() => talk(sponsorId)}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel={`Talk it through with ${firstName}`}
            style={styles.splitMain}
          >
            <Image source={sponsor?.avatar} style={styles.splitAvatar} contentFit="cover" />
            <Text style={styles.splitText}>Talk it through with {firstName}</Text>
          </Pressable>
          <Pressable
            onPress={() => ready && setSheetOpen(true)}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel="Choose a different sponsor"
            style={styles.splitChev}
          >
            <ChevronDown size={18} color="#fff" strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      {/* Sponsor sheet — FULL roster */}
      <Modal transparent visible={sheetOpen} animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Talk it through with…</Text>
            {getAvailableSponsors().map((sp) => {
              const on = sp.id === sponsorId;
              return (
                <Pressable
                  key={sp.id}
                  onPress={() => talk(sp.id as SponsorType)}
                  accessibilityRole="button"
                  style={[styles.sheetRow, on && { borderColor: colors.accent }]}
                >
                  <Image source={sp.avatar} style={styles.sheetAvatar} contentFit="cover" />
                  <View style={styles.flex}>
                    <Text style={styles.sheetName}>{sp.name}</Text>
                    {!!sp.description && <Text style={styles.sheetSub} numberOfLines={1}>{sp.description}</Text>}
                  </View>
                  {on && <Check size={18} color={colors.accent} strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
    pillText: { fontFamily: fontFamily.semiBold, fontSize: 13.5 },

    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14, fontFamily: fontFamily.regular,
      fontSize: 16, lineHeight: 25, color: c.text, textAlignVertical: 'top', ...darkCard,
    },

    pairsCard: {
      marginTop: 16, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16,
      backgroundColor: isDark ? c.surfaceRaised : colors.primarySoft,
      borderWidth: 1, borderColor: colors.primary + '33',
    },
    pairsHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    pairsHeadText: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1 },
    pairRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    pairOff: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.text },
    pairOn: { fontFamily: fontFamily.serifItalic ?? fontFamily.regular, fontSize: 14, fontStyle: 'italic' },

    dock: {
      paddingHorizontal: 18, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
    },
    splitBtn: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 999, overflow: 'hidden' },
    splitMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 14 },
    splitAvatar: { width: 26, height: 26, borderRadius: 13 },
    splitText: { fontFamily: fontFamily.bold, fontSize: 15.5, color: '#fff' },
    splitChev: { width: 52, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)' },
    btnDisabled: { opacity: 0.45 },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(28,26,24,0.42)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 14 },
    sheetTitle: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, marginBottom: 12 },
    sheetRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, marginBottom: 9, ...darkCard,
    },
    sheetAvatar: { width: 40, height: 40, borderRadius: 20 },
    sheetName: { fontFamily: fontFamily.bold, fontSize: 15, color: c.text },
    sheetSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },
  });
};
