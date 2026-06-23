// AI Sponsor — persona picker (redesign 3.0). Three sponsors, each with the same
// AA program in their own voice. Tap a card to open that sponsor's chat.
// Prototype: frames/hifi-sponsor-v2 (HiFiSponsorSelectV2). Plumbing (chat store,
// system prompts, the chat screen) is unchanged — this is presentation + copy.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { SPONSORS, type SponsorConfig } from '@/constants/sponsors';
import { SELECTION_SPONSOR_IDS, sponsorTone } from '@/constants/sponsorTones';
import { logEvent } from '@/lib/usageLogger';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');

// The three sponsors, in the picker's fixed order.
const SELECTION = SELECTION_SPONSOR_IDS
  .map((id) => SPONSORS.find((s) => s.id === id))
  .filter(Boolean) as SponsorConfig[];

export default function SponsorSelectScreen() {
  const router = useRouter();
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
        <Text style={styles.h1}>Three voices.{'\n'}One program.</Text>
        <Text style={styles.sub}>
          Each sponsor gives the same solid AA guidance — in their own unmistakable voice. Pick who you need today. Switch any time.
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
  const tone = sponsorTone(s.id);
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Chat with ${s.name}`}>
      <View style={styles.chevCorner}><ArrowUpRight size={16} color={c.textMuted} strokeWidth={2} /></View>

      <View style={styles.band}>
        <Image source={s.avatar} style={[styles.avatar, { backgroundColor: tone.tile }]} contentFit="cover" />
        <View style={styles.bandText}>
          <Text style={styles.name}>{s.name}</Text>
          <View style={styles.tagRow}>
            {(s.tags ?? []).map((t) => (
              <Text key={t} style={[styles.tag, { backgroundColor: tone.tile, color: tone.ink }]}>{t}</Text>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.quoteBox, { backgroundColor: tone.tile + 'cc' }]}>
        <Text style={[styles.quoteMark, { color: tone.ink }]}>“</Text>
        <Text style={[styles.quote, { color: tone.ink }]}>{s.hookQuote}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  h1: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.4, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textMuted, marginTop: 8 },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  card: { backgroundColor: c.surface, borderRadius: 24, marginBottom: 14, paddingBottom: 14, ...shadows.md },
  chevCorner: { position: 'absolute', top: 12, right: 12, zIndex: 2 },

  band: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  avatar: { width: 96, height: 96, borderRadius: 20, borderWidth: 2, borderColor: '#fff', ...shadows.sm },
  bandText: { flex: 1 },
  name: { fontFamily: fontFamily.bold, fontSize: 19, color: c.text, letterSpacing: -0.3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },

  quoteBox: { marginHorizontal: 14, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, position: 'relative' },
  quoteMark: { position: 'absolute', top: 2, left: 8, fontFamily: fontFamily.serif, fontSize: 38, opacity: 0.35 },
  quote: { fontFamily: fontFamily.serifItalic, fontSize: 15, lineHeight: 22, paddingLeft: 18 },

  disclaimer: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 17, color: c.textMuted, textAlign: 'center', paddingHorizontal: 20, marginTop: 8 },
});
