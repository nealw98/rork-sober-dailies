// AI Sponsor — chat (redesign 3.0, "AI Sponsor Update"). Modern-assistant layout:
// flat sponsor replies (no bubble/avatar), white user bubbles, suggestion chips
// pinned above the composer, an icon header (Reset + Switch) showing the vibe
// string, and one consistent teal accent (no per-persona color).
// Plumbing is UNCHANGED — messages/send/limits flow through use-chat-store.
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, StyleSheet, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronDown, RotateCcw, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatStoreProvider, useChatStore } from '@/hooks/use-chat-store';
import { getSponsorById } from '@/constants/sponsors';
import { BR_INK as BR_INK_LIGHT, BR_SOFT as BR_SOFT_LIGHT } from '@/constants/sponsorTones';
import { SPOT_CHECK_HANDOFF_KEY } from '@/constants/spotCheckPersonas';
import type { SpotCheckEntry } from '@/types/spotCheck';
import { SpotCheckCard } from '@/components/SpotCheckCard';
import { SponsorSwitchSheet } from '@/components/SponsorSwitchSheet';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { SponsorType, ChatMessage } from '@/types';
import { ChatMarkdownRenderer } from '@/components/ChatMarkdownRenderer';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import BackButton from '@/components/BackButton';
import { logEvent } from '@/lib/analytics';
import { checkSponsorMessageLimit, recordSponsorMessage, DAILY_SPONSOR_LIMIT } from '@/lib/sponsorChatLimits';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const PAPER = '#FCFBF8';  // conversation background (light)
const LINEN = '#F5F1E9';  // header + input dock (light)

// Inter reads larger per point than Lora (the app's reading face), so scale the
// global reading size down so chat (Inter) RESEMBLES Lora at that size, then
// scales with it. 0.92 lands the default 18 → ~16.5 (1:1/18 read too big, 15 too
// small). Tune this single factor to make Inter feel like Lora.
const LORA_SCALE = 0.92;

const SUGGESTIONS = ['I’m struggling today', 'Help me think this through', 'I just need to vent', 'I’m fighting a craving'];

// The dotted "vibe" string under the name, e.g. "Patient · Steady · Wise".
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
const vibeString = (tags?: string[]) => (tags ?? []).map(titleCase).join(' · ');

const getSponsorDisplayName = (type: string): string => {
  switch (type) {
    case 'salty': return 'SaltySam';
    case 'salty-v2': return 'SaltySam2';
    case 'supportive': return 'SteadyEddie';
    case 'supportive-v2': return 'SteadyEddie2';
    case 'grace': return 'GentleGrace';
    case 'grace-v2': return 'GentleGrace2';
    case 'cowboy-pete': return 'CowboyPete';
    case 'co-sign-sally': return 'CoSignSally';
    case 'fresh': return 'FreshFreddie';
    case 'mama-jo': return 'MamaJo';
    default: return type;
  }
};

const copyMessage = async (text: string) => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Message copied to clipboard');
  } catch { /* ignore */ }
};

// ── Message: user = white bubble; sponsor = flat text (assistant style) ──
// `size` is the fixed reading base, Lora-scaled (see LORA_SCALE); it scales
// with the OS text-size via RN's default font scaling.
const turnTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function Bubble({ message, size }: { message: ChatMessage; size: number }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  if (message.kind === 'spotCheckCard' && message.spotCheck) {
    return <SpotCheckCard entry={message.spotCheck} />;
  }
  if (message.sender === 'user') {
    return (
      <View style={styles.userRow}>
        <Pressable onLongPress={() => copyMessage(message.text)} style={styles.userBubble}>
          <Text style={[styles.userText, { fontSize: size, lineHeight: Math.round(size * 1.4) }]}>{message.text}</Text>
        </Pressable>
        <Text style={styles.msgTime}>{turnTime(message.timestamp)}</Text>
      </View>
    );
  }
  return (
    <Pressable onLongPress={() => copyMessage(message.text)} style={styles.botBlock}>
      <ChatMarkdownRenderer
        content={message.text}
        style={{ color: c.text, fontSize: size, fontFamily: fontFamily.regular, lineHeight: Math.round(size * 1.55) }}
      />
      <Text style={styles.msgTime}>{turnTime(message.timestamp)}</Text>
    </Pressable>
  );
}

// ── Chat content ────────────────────────────────────────────────────────────
function SponsorChatContent({ initialSponsor }: { initialSponsor: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const BR_INK = isDark ? colors.primaryDark : BR_INK_LIGHT;
  const BR_SOFT = isDark ? colors.primarySoft : BR_SOFT_LIGHT;
  const { readingSize } = useReadingSize();
  const size = readingSize * LORA_SCALE; // chat text, Lora-matched; follows the shared reading size
  const { messages, isLoading, sendMessage, clearChat, changeSponsor, sponsorType, injectSpotCheckHandoff, hasLoadedFromStorage } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { setLastSponsor } = useLastSponsor();

  const exitChat = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  useEffect(() => {
    const target = initialSponsor as SponsorType;
    if (target !== sponsorType) changeSponsor(target);
    setLastSponsor(initialSponsor); // FAB shows + resumes this sponsor
  }, [initialSponsor, sponsorType, changeSponsor, setLastSponsor]);

  const sponsor = getSponsorById(initialSponsor as SponsorType);
  useScreenTimeTracking(sponsor?.name || 'AI Sponsor');

  // Spot Check "Keep talking" handoff — once the store has settled on this
  // screen's sponsor, pick up a pending entry (written by the inventory screen
  // right before it routed here) and inject it as a context card + opener.
  useEffect(() => {
    // Wait for the store's own AsyncStorage load — injecting earlier would be
    // clobbered when the loaded thread replaces state.
    if (sponsorType !== initialSponsor || !hasLoadedFromStorage) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SPOT_CHECK_HANDOFF_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(SPOT_CHECK_HANDOFF_KEY);
        const entry: SpotCheckEntry = JSON.parse(raw);
        if (entry.sponsorId !== sponsorType) return; // stale handoff for another persona
        injectSpotCheckHandoff(entry);
      } catch (error) {
        console.error('Error reading spot check handoff:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorType, initialSponsor, hasLoadedFromStorage]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleRefresh = () => {
    clearChat();
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isCheckingLimits) return;
    setIsCheckingLimits(true);
    const limit = await checkSponsorMessageLimit();
    setIsCheckingLimits(false);
    if (!limit.allowed) {
      Alert.alert('Daily Limit Reached', `You've reached the daily limit of ${DAILY_SPONSOR_LIMIT} messages. Your sponsor will be here again tomorrow.`);
      return;
    }
    setInputText('');
    Keyboard.dismiss();
    await recordSponsorMessage();
    // Which sponsor personas actually get used — sponsor as a property so
    // Mixpanel can segment one event instead of counting name-suffixed ones.
    logEvent('sponsor_message_sent', { sponsor: getSponsorDisplayName(sponsorType) });
    await sendMessage(trimmed);
  };

  const onSwitch = (id: string) => {
    setSwitchOpen(false);
    if (id !== initialSponsor) router.replace(`/sponsor-chat?sponsor=${id}`);
  };

  if (sponsorType !== initialSponsor) return null;

  if (!sponsor || !sponsor.isAvailable) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Sponsor not found</Text>
        <Pressable onPress={exitChat} style={styles.errorBtn}><Text style={styles.errorBtnText}>Go Back</Text></Pressable>
      </View>
    );
  }

  const firstName = sponsor.name.split(' ').slice(-1)[0];
  const isSendDisabled = !inputText.trim() || isLoading || isCheckingLimits;
  const showChips = inputText.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <BackButton onPress={exitChat} style={{ marginBottom: 10 }} />
        <View style={styles.sponsorRow}>
          {/* The identity IS the switch affordance — tap the avatar/name (chevron
              cue) to open the sponsor menu (quick-switch + "Meet all three"). */}
          <Pressable style={styles.identity} onPress={() => setSwitchOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="Switch sponsor">
            <Image source={sponsor.avatar} style={styles.hAvatar} contentFit="cover" />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={styles.hName} numberOfLines={1}>{sponsor.name}</Text>
                <ChevronDown size={18} color={c.textMuted} strokeWidth={2.4} style={switchOpen && { transform: [{ rotate: '180deg' }] }} />
              </View>
              <Text style={styles.vibe} numberOfLines={1}>{vibeString(sponsor.tags)}</Text>
            </View>
          </Pressable>
          <View style={styles.headActions}>
            <Pressable onPress={() => { setSizeSheetOpen(true); setSwitchOpen(false); }} style={styles.aaBtn} accessibilityLabel="Text size">
              <Text style={styles.aaGlyph}>aA</Text>
            </Pressable>
            <Pressable onPress={handleRefresh} style={styles.resetBtn} accessibilityLabel="Reset conversation">
              <RotateCcw size={16} color={isDark ? c.textSecondary : '#4A4A5E'} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Switch dropdown (opened from the sponsor identity) ── */}
      {switchOpen && (
        <SponsorSwitchSheet
          current={sponsor.id}
          onSelect={onSwitch}
          onClose={() => setSwitchOpen(false)}
          top={insets.top + 96}
          showMeetAllThree
        />
      )}

      {/* ── Conversation ── */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble message={item} size={size} />}
          ListHeaderComponent={<View style={styles.dayDivider}><Text style={styles.dayText}>Today</Text></View>}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Dismissable keyboard: iOS tracks the finger (iMessage-style drag
          // down), Android dismisses as soon as the list scrolls.
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          // A plain tap on the conversation (not on a control) also dismisses.
          onTouchEnd={() => Keyboard.dismiss()}
        />

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={BR_INK} />
            <Text style={styles.loadingText}>{sponsor.loadingText ?? 'Thinking…'}</Text>
          </View>
        )}

        {/* ── Suggestion chips (above composer; hidden once typing) ── */}
        {showChips && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsStrip}
            contentContainerStyle={styles.chipsStripContent}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => setInputText(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── Input dock ── */}
        <View style={[styles.inputDock, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
          <TextInput
            style={[styles.input, { fontSize: 14 }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${firstName}…`}
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={500}
            returnKeyType="default"
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
          <Pressable
            style={[styles.sendBtn, isSendDisabled && styles.sendDisabled]}
            onPress={handleSend}
            disabled={isSendDisabled}
            accessibilityLabel="Send"
          >
            <Send size={16} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </View>
  );
}

export default function SponsorChatScreen() {
  const params = useLocalSearchParams<{ sponsor: string }>();
  const initialSponsor = params.sponsor || 'supportive';
  return (
    <ChatStoreProvider>
      <SponsorChatContent initialSponsor={initialSponsor} />
    </ChatStoreProvider>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const BR_INK = isDark ? colors.primaryDark : BR_INK_LIGHT;
  const BR_SOFT = isDark ? colors.primarySoft : BR_SOFT_LIGHT;
  const paper = isDark ? c.background : PAPER;
  const linen = isDark ? c.surface : LINEN;
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.06)';
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: paper },
  flex: { flex: 1 },

  // header
  header: { backgroundColor: linen, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: hairline },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#fff', backgroundColor: BR_SOFT, ...shadows.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hName: { flexShrink: 1, fontFamily: fontFamily.display, fontSize: 22, letterSpacing: -0.3, color: c.text },
  vibe: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.textMuted, marginTop: 2 },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aaBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? c.surfaceRaised : c.surface, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,46,0.12)' },
  aaGlyph: { fontFamily: fontFamily.bold, fontSize: 13, color: isDark ? c.textSecondary : '#4A4A5E', letterSpacing: -0.2 },
  resetBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? c.surfaceRaised : c.surface, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,46,0.12)' },
  switchBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: BR_SOFT, borderWidth: 1, borderColor: BR_INK + '40' },

  // conversation
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  dayDivider: { alignItems: 'center', marginBottom: 16 },
  dayText: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, backgroundColor: isDark ? c.surfaceRaised : c.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', ...shadows.sm },

  botBlock: { marginBottom: 18 },
  msgTime: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted, marginTop: 4 },

  userRow: { alignItems: 'flex-end', marginBottom: 18 },
  // Styled like the suggestion chips ("I'm struggling today" …): surface fill,
  // teal hairline, teal text — the user's words read in the brand voice.
  userBubble: { maxWidth: '78%', backgroundColor: isDark ? c.surfaceRaised : c.surface, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4, borderWidth: 1, borderColor: BR_INK + '55', ...shadows.sm },
  userText: { fontFamily: fontFamily.regular, color: BR_INK },

  // suggestion chips (above composer)
  chipsStrip: { backgroundColor: linen, height: 52, flexShrink: 0, flexGrow: 0 },
  chipsStripContent: { paddingHorizontal: 14, gap: 6, alignItems: 'center' },
  chip: { backgroundColor: isDark ? c.surfaceRaised : c.surface, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: BR_INK + '55', ...shadows.sm },
  chipText: { fontFamily: fontFamily.medium, fontSize: 12, color: BR_INK },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 6 },
  loadingText: { fontFamily: fontFamily.regularItalic, fontSize: 12.5, color: c.textMuted },

  // input dock
  inputDock: { flexShrink: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: linen, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: hairline },
  input: { flex: 1, maxHeight: 120, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : c.surface, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(26,26,46,0.07)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontFamily: fontFamily.regular, color: c.text },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: BR_INK },
  sendDisabled: { opacity: 0.4 },

  // error
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: paper },
  errorText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
  errorBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: c.text },
  errorBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: isDark ? '#000' : '#fff' },
  });
};
