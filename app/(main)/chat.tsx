// AI Sponsor — persona picker (redesign 3.0). Sponsors share the same
// AA program in their own voice. Tap a card to open that sponsor's chat.
// Prototype: frames/hifi-sponsor-v2 (HiFiSponsorSelectV2). Plumbing (chat store,
// system prompts, the chat screen) is unchanged — this is presentation + copy.
//
// Expanded widths (the unfolded Duo, iPad): picker | chat. The picker is the
// list pane and the chosen sponsor's chat runs in the detail pane, opening on
// the sponsor last talked to; the pane's expand button pushes the full-screen
// chat (expanded=1, so its back control collapses back here).
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { ChatCircleDots } from 'phosphor-react-native';
import BackButton from '@/components/BackButton';
import ListDetailLayout from '@/components/layout/ListDetailLayout';
import { PaneProvider, usePane } from '@/components/layout/PaneContext';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useLastSponsor } from '@/hooks/use-last-sponsor';
import { SponsorChat } from '@/app/sponsor-chat';
import { SPONSORS, type SponsorConfig } from '@/constants/sponsors';
import { SELECTION_SPONSOR_IDS, BR_SOFT } from '@/constants/sponsorTones';
import { logEvent } from '@/lib/analytics';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';


// The sponsors, in the picker's fixed order.
const SELECTION = SELECTION_SPONSOR_IDS
  .map((id) => SPONSORS.find((s) => s.id === id))
  .filter(Boolean) as SponsorConfig[];

export default function SponsorSelectScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  useScreenTimeTracking('AI Sponsor Selection');

  const wide = useLayoutMode() === 'expanded' && !usePane();
  // Only the focused screen hosts a live chat: while the expanded full-screen
  // chat is on top, the pane's copy unmounts, then reloads the saved thread on
  // collapse (each chat store loads its history once, on mount).
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ sponsor?: string }>();
  const { lastSponsorId } = useLastSponsor();
  // undefined = nothing picked on this visit yet → open the sponsor asked for
  // (rail FAB) or last talked to; null = the pane was closed.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const openId = picked === undefined ? (params.sponsor ?? lastSponsorId ?? null) : picked;
  const openSponsor = openId ? SELECTION.find((s) => s.id === openId) ?? null : null;

  const select = (s: SponsorConfig) => {
    logEvent('sponsor_selected', { screen: 'AI Sponsor', sponsor_id: s.id, sponsor_name: s.name });
    if (wide) setPicked(s.id);
    else router.push(`/sponsor-chat?sponsor=${s.id}`);
  };

  const listColumn = (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 12 }} />
        <Text style={styles.h1}>Choose your AI Sponsor</Text>
        <Text style={styles.sub}>
          Each sponsor gives the same solid AA guidance — in their own unmistakable voice.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SELECTION.map((s) => <SponsorCard key={s.id} s={s} selected={wide && s.id === openSponsor?.id} onPress={() => select(s)} />)}
        <Text style={styles.disclaimer}>
          An AI sponsor is no substitute for a human sponsor, a meeting, or professional help.
          In a crisis, contact emergency services.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  if (!wide) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        {listColumn}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ListDetailLayout
        listWidth={360}
        list={listColumn}
        detail={
          openSponsor ? (
            focused ? (
              // Keyed so switching sponsors starts that sponsor's own thread.
              <PaneProvider
                key={openSponsor.id}
                value={{
                  close: () => setPicked(null),
                  expand: () => router.push(`/sponsor-chat?sponsor=${openSponsor.id}&expanded=1`),
                }}
              >
                <SponsorChat sponsorId={openSponsor.id} />
              </PaneProvider>
            ) : (
              <View style={styles.paneBlank} />
            )
          ) : (
            <SafeAreaView style={styles.resting} edges={['top']}>
              <View style={styles.restingArt}><ChatCircleDots size={28} color={colors.primary} /></View>
              <Text style={styles.restingTitle}>Pick a sponsor</Text>
              <Text style={styles.restingSub}>Choose a sponsor — your conversation opens here.</Text>
            </SafeAreaView>
          )
        }
      />
    </View>
  );
}

function SponsorCard({ s, selected = false, onPress }: { s: SponsorConfig; selected?: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Chat with ${s.name}`}
    >
      <Image source={s.avatar} style={styles.avatar} contentFit="cover" />
      <View style={styles.cardText}>
        <Text style={styles.name}>{s.name}</Text>
        <Text style={styles.descriptor}>{s.description}</Text>
        {!!s.hookQuote && <Text style={styles.quote}>&ldquo;{s.hookQuote}&rdquo;</Text>}
      </View>
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  h1: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 29, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: c.textMuted, marginTop: 8 },

  scroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 },

  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14, backgroundColor: c.surface, borderRadius: 24, marginBottom: 14, borderWidth: isDark ? 1 : 0, borderColor: 'transparent', ...shadows.md, ...darkCard },
  // The sponsor open in the wide layout's chat pane.
  cardSelected: { borderWidth: 2, borderColor: colors.primary, padding: 12 },
  avatar: { width: 72, height: 72, borderRadius: 16, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#fff', backgroundColor: BR_SOFT, ...shadows.sm },
  cardText: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 19, color: c.text, letterSpacing: -0.3 },
  descriptor: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: isDark ? c.textSecondary : '#4A4A5E', marginTop: 4 },
  quote: { fontFamily: fontFamily.regularItalic, fontSize: 13.5, lineHeight: 19, color: c.textMuted, marginTop: 8 },

  // wide layout's chat pane: resting state, and the blank while the
  // full-screen chat is on top
  resting: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 6 },
  restingArt: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  restingTitle: { fontFamily: fontFamily.display, fontSize: 20, letterSpacing: -0.3, color: c.text },
  restingSub: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textMuted, textAlign: 'center' },
  paneBlank: { flex: 1, backgroundColor: c.background },

  disclaimer: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 17, color: c.textMuted, textAlign: 'center', paddingHorizontal: 20, marginTop: 8 },
  });
};
