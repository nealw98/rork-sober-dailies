import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from '@/components/ScreenContainer';
import { SpeakerPlayer } from '@/components/SpeakerPlayer';
import { useTheme } from '@/hooks/useTheme';
import { useSpeakers } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { adjustFontWeight } from '@/constants/fonts';

export default function SpeakerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const posthog = usePostHog();
  const { palette } = useTheme();
  const { speakers } = useSpeakers();
  const insets = useSafeAreaInsets();

  useScreenTimeTracking('SpeakerDetail');

  const speaker = useMemo(
    () => speakers.find((s) => s.id === id),
    [speakers, id]
  );

  useFocusEffect(
    useCallback(() => {
      if (speaker) {
        posthog?.screen('Speaker Detail', {
          speaker_name: speaker.speaker,
          speaker_title: speaker.title,
        });
      }
    }, [posthog, speaker])
  );

  // Theme-aware accent and background colors for speakers
  const isDeepSea = (palette.heroTiles as any)?.speakers?.[0] === '#3E5C76';
  const isDark = palette.background !== '#fff';
  const accentColor = isDeepSea ? '#3E5C76' : (isDark ? '#7A5AAA' : '#8B6AC0');
  const quoteBg = isDeepSea
    ? 'rgba(62, 92, 118, 0.15)'
    : isDark
      ? 'rgba(122, 90, 170, 0.12)'
      : 'rgba(139, 106, 192, 0.08)';

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
      <ScreenContainer style={[styles.container, { backgroundColor: palette.background }]} noPadding>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}>
          <Text style={{ color: palette.muted }}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: palette.background }]} noPadding>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Gradient header */}
      <LinearGradient
        colors={palette.gradients.header as [string, string, ...string[]]}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.push('/speakers' as any)}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={palette.headerText} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={[styles.headerTitle, { color: palette.headerText }]} numberOfLines={1}>
          {speaker.speaker}
        </Text>
        <Text style={[styles.headerSubtitle, { color: palette.headerText }]} numberOfLines={1}>
          {speaker.hometown}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.title, { color: accentColor }]}>{speaker.title}</Text>

        {/* Subtitle */}
        {speaker.subtitle ? (
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {speaker.subtitle}
          </Text>
        ) : null}

        {/* Quote block */}
        {speaker.quote ? (
          <View style={[styles.quoteBlock, { backgroundColor: quoteBg }]}>
            <Text style={[styles.quoteText, { color: palette.text }]}>
              &ldquo;{speaker.quote}&rdquo;
            </Text>
          </View>
        ) : null}

        {/* Explicit badge */}
        {speaker.explicit && (
          <View style={styles.explicitRow}>
            <View style={[styles.explicitBadge, { backgroundColor: palette.muted }]}>
              <Text style={styles.explicitBadgeText}>E</Text>
            </View>
            <Text style={[styles.explicitLabel, { color: palette.muted }]}>
              Explicit language
            </Text>
          </View>
        )}

        {/* Recorded date */}
        {formattedDate ? (
          <Text style={[styles.recordedDate, { color: palette.muted }]}>
            Recorded: {formattedDate}
          </Text>
        ) : null}

        {/* Player */}
        <SpeakerPlayer youtubeId={speaker.youtube_id} audioUrl={speaker.audio_url} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('600'),
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: adjustFontWeight('700'),
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  quoteBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 12,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  explicitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  explicitBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: adjustFontWeight('700'),
  },
  explicitLabel: {
    fontSize: 13,
  },
  recordedDate: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
