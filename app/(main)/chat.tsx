// AI Sponsor — persona picker (redesign 3.0). Sponsors share the same
// AA program in their own voice. Tap a card to open that sponsor's chat.
// Prototype: frames/hifi-sponsor-v2 (HiFiSponsorSelectV2). Plumbing (chat store,
// system prompts, the chat screen) is unchanged — this is presentation + copy.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';
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
  useScreenTimeTracking('AI Sponsor Selection');

  const select = (s: SponsorConfig) => {
    logEvent('sponsor_selected', { screen: 'AI Sponsor', sponsor_id: s.id, sponsor_name: s.name });
    router.push(`/sponsor-chat?sponsor=${s.id}`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 12 }} />
        <Text style={styles.h1}>Choose your AI Sponsor</Text>
        <Text style={styles.sub}>
          Each sponsor gives the same solid AA guidance — in their own unmistakable voice.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SELECTION.map((s) => <SponsorCard key={s.id} s={s} onPress={() => select(s)} />)}
        <Text style={styles.disclaimer}>
          Private by default · AI companions, not a substitute for a human sponsor or a meeting.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SponsorCard({ s, onPress }: { s: SponsorConfig; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Chat with ${s.name}`}>
      <Image source={s.avatar} style={styles.avatar} contentFit="cover" />
      <View style={styles.cardText}>
        <Text style={styles.name}>{s.name}</Text>
        <Text style={styles.descriptor}>{s.description}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  h1: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 29, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: c.textMuted, marginTop: 8 },

  scroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: c.surface, borderRadius: 24, marginBottom: 14, borderWidth: isDark ? 1 : 0, borderColor: 'transparent', ...shadows.md, ...darkCard },
  avatar: { width: 72, height: 72, borderRadius: 16, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#fff', backgroundColor: BR_SOFT, ...shadows.sm },
  cardText: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 19, color: c.text, letterSpacing: -0.3 },
  descriptor: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19, color: isDark ? c.textSecondary : '#4A4A5E', marginTop: 4 },

  disclaimer: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 17, color: c.textMuted, textAlign: 'center', paddingHorizontal: 20, marginTop: 8 },
  });
};
