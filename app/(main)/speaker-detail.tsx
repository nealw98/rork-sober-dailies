import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import { SpeakerPlayer } from '@/components/SpeakerPlayer';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import SubPageHeader from '@/components/navigation/SubPageHeader';
import { useRouter } from 'expo-router';
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

export default function SpeakerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { speakers } = useSpeakers();
  const router = useRouter();

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
        <SubPageHeader onBack={() => router.push('/(main)/speakers' as any)} />
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
          title={speaker.speaker}
          onBack={() => router.push('/(main)/speakers' as any)}
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
          <SpeakerPlayer youtubeId={speaker.youtube_id} audioUrl={speaker.audio_url} />

          {/* Quote */}
          {speaker.quote ? (
            <View style={styles.quoteCard}>
              <View style={styles.quoteBorder} />
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
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 6,
    marginTop: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  quoteBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.tertiaryExtraDark,
  },
  quoteText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    fontStyle: 'italic',
    color: sem.text,
    lineHeight: 24,
    flex: 1,
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
