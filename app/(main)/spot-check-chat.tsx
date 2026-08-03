// Spot Check — the chat half of the split wizard (docs/spotcheck-redesign-spec.md).
// A SEPARATE, EPHEMERAL session: it never touches the persona's main thread,
// has no welcome opener, and Done discards it (the saved record — and the
// optional "{name}'s take" — are the durable artifacts).
//
// Flow: opens with the sponsor's page-3 question (no preamble; generated from
// the form via askCausesQuestion) → the user's reply routes to askSummary →
// page 4 lands as summary + three suggestions → a DIALOG offers "Add {name}'s
// take to your saved spot check?" (only if the form was saved) → normal chat
// continues in this window via askSpotCheckReply until Done.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, FlatList, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, Check } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { getSponsorById } from '@/constants/sponsors';
import { SPOT_CHECK_SEED_KEY, getSpotCheckFallbackQuestion } from '@/constants/spotCheckPersonas';
import { detectCrisis, crisisResponses } from '@/constants/crisisTriggers';
import { askCausesQuestion, askSummary, askSpotCheckReply, consumePrefetchedQuestion } from '@/lib/spotCheckLLM';
import { checkSponsorMessageLimit, recordSponsorMessage } from '@/lib/sponsorChatLimits';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { logEvent } from '@/lib/analytics';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import type { SponsorType } from '@/types';
import type { SpotCheckEntry, SpotCheckSeed } from '@/types/spotCheck';

const LORA_SCALE = 0.92; // match sponsor-chat's Inter-vs-Lora sizing

type Turn = { id: string; who: 'user' | 'bot' | 'sys'; text: string };

function crisisReplyFor(sponsorId: SponsorType, type: 'violence' | 'selfHarm'): string {
  if (type === 'violence') return crisisResponses.violence.all;
  switch (sponsorId) {
    case 'salty':
    case 'salty-v2': return crisisResponses.selfHarm['Salty Sam'];
    case 'grace':
    case 'grace-v2': return crisisResponses.selfHarm['Gentle Grace'];
    default: return crisisResponses.selfHarm['Steady Eddie'];
  }
}

function ThinkingDots() {
  const styles = useThemedStyles(makeStyles);
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.botText}>{'·'.repeat(n)}</Text>;
}

export default function SpotCheckChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { readingSize } = useReadingSize();
  const size = readingSize * LORA_SCALE;

  const [seed, setSeed] = useState<SpotCheckSeed | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(true);
  const [draft, setDraft] = useState('');
  // beat: 'causes' = waiting on the page-3 answer; 'chat' = normal turns.
  const beat = useRef<'causes' | 'chat'>('causes');
  const question = useRef<string>('');
  const listRef = useRef<FlatList>(null);
  const turnId = useRef(0);
  const nextId = () => `t${++turnId.current}`;

  const sponsor = seed ? getSponsorById(seed.sponsorId) : undefined;
  const firstName = sponsor?.name.split(' ').slice(-1)[0] ?? 'your sponsor';
  useScreenTimeTracking('Spot Check Chat');

  // Mount: pick up the seed the form just wrote, then open with the sponsor's
  // page-3 question — no welcome line, no echo of the form.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SPOT_CHECK_SEED_KEY);
        if (!raw) { router.back(); return; }
        await AsyncStorage.removeItem(SPOT_CHECK_SEED_KEY);
        const s: SpotCheckSeed = JSON.parse(raw);
        setSeed(s);
        let q: string;
        try {
          // The form prefetched this on Talk-tap; fall back to a fresh call.
          q = await (consumePrefetchedQuestion(s.sponsorId, s.feelings, s.whatsGoingOn)
            ?? askCausesQuestion(s.sponsorId, s.feelings, s.whatsGoingOn));
        } catch {
          q = getSpotCheckFallbackQuestion(s.sponsorId, s.feelings);
        }
        question.current = q;
        setTurns([{ id: nextId(), who: 'bot', text: q }]);
      } catch (e) {
        console.error('Spot check chat seed error:', e);
        router.back();
      } finally {
        setThinking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (turns.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [turns]);

  // The take dialog — fires once, right after page 4, only for a saved record.
  const offerTake = (s: SpotCheckSeed, summary: string, suggestions: string[]) => {
    if (!s.savedEntryId) return;
    Alert.alert(
      `Add ${firstName}’s take?`,
      `Add this summary and the suggestions to your saved spot check in Journey.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Add it',
          onPress: async () => {
            try {
              // Canonical key defined in app/(main)/inventory.tsx.
              const stored = await AsyncStorage.getItem('spot_check_inventories');
              const records: SpotCheckEntry[] = stored ? JSON.parse(stored) : [];
              const at = records.findIndex((r) => r.id === s.savedEntryId);
              if (at >= 0) {
                records[at] = { ...records[at], sponsorId: s.sponsorId, summary, suggestions };
                await AsyncStorage.setItem('spot_check_inventories', JSON.stringify(records));
              }
              logEvent('spot_check_take_added', { sponsor: s.sponsorId });
              setTurns((cur) => [...cur, { id: nextId(), who: 'sys', text: `${firstName}’s take added to your spot check` }]);
            } catch (e) {
              console.error('Error adding take:', e);
            }
          },
        },
      ],
    );
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || thinking || !seed) return;

    // Same daily cap as the main sponsor chat.
    const limit = await checkSponsorMessageLimit();
    if (!limit.allowed) {
      Alert.alert('Taking a break', 'You’ve reached today’s sponsor message limit. Come back tomorrow — your spot check is safe in Journey.');
      return;
    }

    setDraft('');
    const userTurn: Turn = { id: nextId(), who: 'user', text };
    setTurns((cur) => [...cur, userTurn]);
    setThinking(true);

    // Crisis scan mirrors sendMessage — a spot check turn is still a user turn.
    const { type: crisisType } = detectCrisis(text);
    if (crisisType) {
      setTimeout(() => {
        setTurns((cur) => [...cur, { id: nextId(), who: 'bot', text: crisisReplyFor(seed.sponsorId, crisisType) }]);
        setThinking(false);
      }, 600);
      return;
    }

    await recordSponsorMessage();
    try {
      if (beat.current === 'causes') {
        // Page 4: summary + three suggestions, then the take dialog.
        beat.current = 'chat';
        const take = await askSummary(seed.sponsorId, {
          feelings: seed.feelings,
          whatsGoingOn: seed.whatsGoingOn,
          causesQuestion: question.current || null,
          causesAnswer: text,
        });
        // ONE response: summary, then the three actions (Neal, 2026-08-03).
        setTurns((cur) => [
          ...cur,
          { id: nextId(), who: 'bot', text: `${take.summary}\n\n${take.suggestions.map((s) => `• ${s}`).join('\n')}` },
        ]);
        offerTake(seed, take.summary, take.suggestions);
      } else {
        // Normal chat, scoped to this session.
        const transcript = [...turns, userTurn]
          .filter((t) => t.who !== 'sys')
          .map((t) => ({ role: t.who === 'bot' ? ('assistant' as const) : ('user' as const), content: t.text }));
        const reply = await askSpotCheckReply(seed.sponsorId, seed, transcript);
        setTurns((cur) => [...cur, { id: nextId(), who: 'bot', text: reply }]);
      }
    } catch (e) {
      console.warn('Spot check chat turn failed:', e);
      setTurns((cur) => [...cur, {
        id: nextId(), who: 'bot',
        text: 'I’m having trouble connecting right now. Give it a minute and try again — or take the next right action and check back in.',
      }]);
    } finally {
      setThinking(false);
    }
  };

  const renderTurn = ({ item }: { item: Turn }) => {
    if (item.who === 'sys') {
      return (
        <View style={styles.sysRow}>
          <View style={styles.sysPill}>
            <Check size={13} color={colors.primaryDark} strokeWidth={2.6} />
            <Text style={styles.sysText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    if (item.who === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={[styles.userText, { fontSize: size, lineHeight: Math.round(size * 1.4) }]}>{item.text}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.botRow}>
        <Image source={sponsor?.avatar} style={styles.botAvatar} contentFit="cover" />
        <Text style={[styles.botText, { fontSize: size, lineHeight: Math.round(size * 1.55) }]}>{item.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top }} />

      <View style={styles.headerRow}>
        <BackButton onPress={() => router.back()} />
        {sponsor?.avatar ? <Image source={sponsor.avatar} style={styles.headerAvatar} contentFit="cover" /> : null}
        <View style={styles.flex}>
          <Text style={styles.headerName}>{sponsor?.name ?? 'Spot Check'}</Text>
          <Text style={styles.headerSub}>Spot Check</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Done with this spot check conversation"
          style={styles.doneBtn}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(t) => t.id}
          renderItem={renderTurn}
          contentContainerStyle={styles.list}
          ListFooterComponent={thinking ? (
            <View style={styles.botRow}>
              {sponsor?.avatar ? <Image source={sponsor.avatar} style={styles.botAvatar} contentFit="cover" /> : null}
              <ThinkingDots />
            </View>
          ) : null}
        />
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${firstName}…`}
            placeholderTextColor={c.textMuted}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.sendBtn, (!draft.trim() || thinking) && { opacity: 0.4 }]}
          >
            <Send size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },

    headerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 18, paddingBottom: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerAvatar: { width: 34, height: 34, borderRadius: 17 },
    headerName: { fontFamily: fontFamily.display, fontSize: 17, color: c.text },
    headerSub: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted },
    doneBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: c.border },
    doneText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: c.textSecondary },

    list: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
    botRow: { flexDirection: 'row', gap: 10, marginBottom: 14, paddingRight: 8 },
    botAvatar: { width: 30, height: 30, borderRadius: 15, marginTop: 2 },
    botText: { flex: 1, fontFamily: fontFamily.regular, color: c.text, paddingTop: 3 },
    userRow: { alignItems: 'flex-end', marginBottom: 14 },
    userBubble: {
      maxWidth: '82%', paddingVertical: 11, paddingHorizontal: 15,
      borderRadius: 18, borderBottomRightRadius: 4,
      backgroundColor: isDark ? c.surfaceRaised : '#FFFFFF',
      borderWidth: 1, borderColor: c.border,
    },
    userText: { fontFamily: fontFamily.regular, color: c.text },
    sysRow: { alignItems: 'center', marginBottom: 14 },
    sysPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '33',
    },
    sysText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.primaryDark },

    dock: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      paddingHorizontal: 18, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
    },
    input: {
      flex: 1, minHeight: 44, maxHeight: 120,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 11,
      fontFamily: fontFamily.regular, fontSize: 15, color: c.text,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
  });
};
