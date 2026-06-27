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
import { EqualizerOverlay } from '@/components/EqualizerOverlay';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useSpeakerFavorites } from '@/hooks/use-speaker-favorites';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const MT = colors.tertiary;
const MT_DARK = colors.tertiaryDark ?? '#7A5FB5';

const HERO_GRAD = ['#A386D5', '#7A5FB5', '#5C8DFF'] as const;
const HERO_GRAD_ALT = ['#5C8DFF', '#6A6FD5', '#A386D5'] as const;
const gradFor = (id: string): readonly string[] => ((id ? id.charCodeAt(0) : 0) % 2 ? HERO_GRAD_ALT : HERO_GRAD);

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1];
  return `${M} ${parseInt(d, 10)}, ${y}`;
}
const stripQuote = (q?: string | null) => (q ? q.replace(/^["“]|["”]$/g, '') : '');

export default function SpeakerDetailScreen() {
  const { id, autoplay } = useLocalSearchParams<{ id: string; autoplay?: string }>();
  const { speakers } = useSpeakers();
  const router = useRouter();
  const player = useGlobalAudioPlayer();
  const { isSaved, toggleSaved } = useSpeakerFavorites();
  useScreenTimeTracking('SpeakerDetail');

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

  const isActive = speaker ? player.currentSpeakerId === speaker.id && player.isLoaded : false;

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
        {isActive && (
          <View style={styles.playingBadge}>
            <View style={styles.eq}><EqualizerOverlay isPlaying={player.isPlaying} barCount={3} barColor={MT_DARK} /></View>
            <Text style={styles.playingText}>{player.isPlaying ? 'Playing' : 'Paused'}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <LinearGradient colors={grad as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroWatermark} pointerEvents="none">
            <Mic size={172} color="rgba(255,255,255,0.15)" strokeWidth={1} />
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta} numberOfLines={1}>{[speaker.hometown, fmtDate(speaker.date)].filter(Boolean).join(' · ')}</Text>
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
            youtubeId={speaker.youtube_id}
            audioUrl={speaker.audio_url}
            saved={isSaved(speaker.id)}
            onToggleSave={() => toggleSaved(speaker.id)}
            onShare={onShare}
            autoplay={autoplay === '1'}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  playingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eq: { width: 18, height: 16 },
  playingText: { fontFamily: fontFamily.semiBold, fontSize: 11, color: MT_DARK, textTransform: 'uppercase', letterSpacing: 0.5 },

  scroll: { paddingHorizontal: 22, paddingTop: 4 },

  // hero
  hero: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22, ...shadows.lg, shadowColor: MT },
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
