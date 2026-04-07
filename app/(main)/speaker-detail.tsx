import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import { SpeakerPlayer } from '@/components/SpeakerPlayer';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import SubPageHeader from '@/components/navigation/SubPageHeader';
import { useRouter } from 'expo-router';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { EqualizerOverlay } from '@/components/EqualizerOverlay';
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
} from '@/constants/designTokens';

const sem = semanticColors.light;

function DecorativeQuoteMark({ color }: { color: string }) {
  return (
    <Svg width={80} height={62} viewBox="0 0 118 92" fill="none">
      <Path
        d="M38 10C24.7 10 14 20.7 14 34C14 44.9 21.2 54 31.1 56.8L22 82H42.3L56 53.9V34C56 20.7 45.3 10 32 10H38Z"
        fill={color}
      />
      <Path
        d="M82 10C68.7 10 58 20.7 58 34C58 44.9 65.2 54 75.1 56.8L66 82H86.3L100 53.9V34C100 20.7 89.3 10 76 10H82Z"
        fill={color}
      />
    </Svg>
  );
}

export default function SpeakerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { speakers } = useSpeakers();
  const router = useRouter();
  const player = useGlobalAudioPlayer();

  useScreenTimeTracking('SpeakerDetail');

  const speaker = useMemo(
    () => speakers.find((s) => s.id === id),
    [speakers, id]
  );

  const formattedDate = useMemo(() => {
    if (!speaker?.date) return null;
    try {
      const d = new Date(speaker.date);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return speaker.date;
    }
  }, [speaker?.date]);

  if (!speaker) {
    return (
      <ScreenContainer noPadding>
        <Stack.Screen options={{ headerShown: false }} />
        <SubPageHeader onBack={() => router.back()} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: sem.background }]}>
        <SubPageHeader
          title=""
          onBack={() => router.back()}
          rightElement={
            player.currentSpeakerId === speaker?.id && player.isLoaded ? (
              <View style={styles.headerBadge}>
                <View style={styles.headerEqualizer}>
                  <EqualizerOverlay isPlaying={player.isPlaying} barCount={3} barColor={colors.tertiaryDark} />
                </View>
                <Text style={styles.headerBadgeText}>
                  {player.isPlaying ? 'Playing' : 'Paused'}
                </Text>
              </View>
            ) : undefined
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Name tag card with player integrated */}
          <View style={styles.nameCard}>
            <View style={styles.nameCardInner}>
              {/* Top — name + hometown */}
              <View style={styles.nameCardTop}>
                <View style={styles.watermark} pointerEvents="none">
                  <Ionicons name="headset" size={160} color="rgba(255,255,255,0.05)" />
                </View>
                <Text style={styles.speakerName}>{speaker.speaker}</Text>
                <Text style={styles.speakerHometown}>{speaker.hometown}</Text>
              </View>

              {/* Bottom — title + progress bar */}
              <View style={styles.nameCardBottom}>
                <Text style={styles.talkTitle}>{speaker.title}</Text>
                {speaker.subtitle ? (
                  <Text style={styles.talkDescription}>{speaker.subtitle}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Player controls — outside the card */}
          <SpeakerPlayer
            speakerId={speaker.id}
            youtubeId={speaker.youtube_id}
            audioUrl={speaker.audio_url}
            onStop={() => router.back()}
          />

          {/* Quote */}
          {speaker.quote ? (
            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>"{speaker.quote}"</Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // ── Name Tag Card ──
  nameCard: {
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  nameCardInner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  nameCardTop: {
    backgroundColor: colors.tertiaryExtraDark,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: spacing.md,
    bottom: -5,
    transform: [{ rotate: '25deg' }],
  },
  speakerName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    color: colors.white,
    marginBottom: 2,
  },
  speakerHometown: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  nameCardBottom: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  talkTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.tertiaryExtraDark,
  },
  talkDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: sem.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  talkMeta: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: sem.textMuted,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  explicitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  explicitBadge: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: sem.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitText: {
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  explicitLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: sem.textMuted,
  },

  // ── Quote ──
  quoteCard: {
    backgroundColor: '#EDEAF4',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  quoteText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    fontStyle: 'italic',
    color: sem.text,
    lineHeight: 24,
  },

  // ── Header Badge ──
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  headerEqualizer: {
    width: 18,
    height: 16,
    position: 'relative',
  },
  headerBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.tertiaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Loading ──
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    color: sem.textMuted,
  },
});
