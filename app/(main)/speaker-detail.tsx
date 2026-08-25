// Speaker Tapes — Tape detail + player (one combined screen, redesign 3.0).
// Reskinned to the prototype (frames/hifi-speaker-v2.jsx · SpeakerDetail): a
// gradient hero card (meta · name · title · sobriety), the FULL story description
// (shown here in full since the library row only teases it), a pull quote, then
// the player (Save · Download · Share + scrubber + transport). Share is native.
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Mic } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { SpeakerPlayer } from '@/components/SpeakerPlayer';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useSpeakerFavorites } from '@/hooks/use-speaker-favorites';
import { fontFamily, shadows, families, type Tokens } from '@/constants/designTokens';
import { useThemedStyles } from '@/hooks/useTokens';

// Steel Navy, one ramp step lighter than the global steel (speaker pages read too
// dark at full strength). The gradient hero is a "jewel" — it keeps full chroma
// on dark; only the ink (badge text/eq bars) brightens.
const MT = families.steel[400];

// Steel Navy mic-art gradient (token-derived), one step lighter.
const HERO_GRAD: readonly string[] = [families.steel[200], families.steel[400], families.steel[600]];
const HERO_GRAD_ALT: readonly string[] = [families.steel[600], families.steel[400], families.steel[200]];
const gradFor = (id: string): readonly string[] => ((id ? id.charCodeAt(0) : 0) % 2 ? HERO_GRAD_ALT : HERO_GRAD);

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1];
  return `${M} ${parseInt(d, 10)}, ${y}`;
}
function fmtDuration(seconds?: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)} min ${total % 60} sec`;
}
const stripQuote = (q?: string | null) => (q ? q.replace(/^["“]|["”]$/g, '') : '');

export default function SpeakerDetailScreen() {
  const { id, autoplay } = useLocalSearchParams<{ id: string; autoplay?: string }>();
  const { speakers } = useSpeakers();
  const router = useRouter();
  const { isSaved, toggleSaved } = useSpeakerFavorites();
  useScreenTimeTracking('SpeakerDetail');

  const styles = useThemedStyles(makeStyles);

  const speaker = useMemo(() => speakers.find((s) => s.id === id), [speakers, id]);

  const onShare = useCallback(() => {
    if (!speaker) return;
    const quote = stripQuote(speaker.quote);
    const parts = [
      `${speaker.speaker} — “${speaker.title}”`,
      quote ? `“${quote}”` : null,
      speaker.youtube_url || null,
    ].filter(Boolean);
    Share.share({ message: parts.join('\n\n') }).catch(() => {});
  }, [speaker]);

  if (!speaker) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}><BackButton onPress={() => router.back()} /></View>
        <View style={styles.loading}><Text style={styles.loadingText}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  const grad = gradFor(speaker.id);
  const quote = stripQuote(speaker.quote);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <LinearGradient colors={grad as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroWatermark} pointerEvents="none">
            <Mic size={172} color="rgba(255,255,255,0.15)" strokeWidth={1} />
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta} numberOfLines={1}>{[speaker.hometown, fmtDate(speaker.date), fmtDuration(speaker.duration_seconds)].filter(Boolean).join(' · ')}</Text>
            {speaker.explicit ? <Text style={styles.explicit}>EXPLICIT</Text> : null}
          </View>
          <Text style={styles.heroName}>{speaker.speaker}</Text>
          <Text style={styles.heroTitle}>{speaker.title}</Text>
        </LinearGradient>

        {/* Body — aligned to the hero card's content margin */}
        <View style={styles.body}>
          {/* Full story description */}
          {speaker.subtitle ? (
            <View style={styles.story}>
              <Text style={styles.storyLabel}>ABOUT THIS TALK</Text>
              <Text style={styles.storyText}>{speaker.subtitle}</Text>
            </View>
          ) : null}

          {/* Pull quote */}
          {quote ? <Text style={styles.quoteText}>“{quote}”</Text> : null}

          {/* Player */}
          <SpeakerPlayer
            speakerId={speaker.id}
            speakerName={speaker.speaker}
            title={speaker.title}
            youtubeId={speaker.youtube_id}
            audioUrl={speaker.audio_url}
            saved={isSaved(speaker.id)}
            onToggleSave={() => toggleSaved(speaker.id)}
            onShare={onShare}
            autoplay={autoplay === '1'}
            durationSeconds={speaker.duration_seconds}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },

  scroll: { paddingHorizontal: 22, paddingTop: 4 },

  // hero — full-chroma steel gradient in both modes (jewel)
  hero: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22, ...shadows.lg, shadowColor: isDark ? '#000' : MT },
  heroWatermark: { position: 'absolute', right: -28, bottom: -30 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  heroMeta: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', flexShrink: 1 },
  explicit: { fontFamily: fontFamily.bold, fontSize: 9, letterSpacing: 0.8, color: '#fff', backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  heroName: { fontFamily: fontFamily.displayBold, fontSize: 33, letterSpacing: -0.7, color: '#fff', marginTop: 28, lineHeight: 36 },
  heroTitle: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: 'rgba(255,255,255,0.95)', marginTop: 6, lineHeight: 22 },

  // body — aligned to the hero card's inner content margin (same inset as the name)
  body: { paddingHorizontal: 22 },

  // story
  story: { marginTop: 22 },
  storyLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.6, color: c.textMuted, marginBottom: 8 },
  storyText: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23, color: c.textSecondary },

  // quote
  quoteText: { fontFamily: fontFamily.serifItalic, fontSize: 15.5, lineHeight: 23, color: c.text, marginTop: 22 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: fontFamily.regular, fontSize: 16, color: c.textMuted },
  });
};
