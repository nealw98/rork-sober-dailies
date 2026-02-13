import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from '@/components/ScreenContainer';
import { SpeakerCard } from '@/components/SpeakerCard';
import { useTheme } from '@/hooks/useTheme';
import { useSpeakers, Speaker } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { adjustFontWeight } from '@/constants/fonts';

type SortOption = 'newest' | 'oldest' | 'az';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'az', label: 'A–Z' },
];

function sortSpeakers(speakers: Speaker[], sortBy: SortOption): Speaker[] {
  const sorted = [...speakers];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    case 'oldest':
      return sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    case 'az':
      return sorted.sort((a, b) => a.speaker.localeCompare(b.speaker));
    default:
      return sorted;
  }
}

export default function SpeakersScreen() {
  const posthog = usePostHog();
  const { palette } = useTheme();
  const { speakers, isLoading } = useSpeakers();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useScreenTimeTracking('Speakers');

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Speakers');
    }, [posthog])
  );

  const sortedSpeakers = useMemo(
    () => sortSpeakers(speakers, sortBy),
    [speakers, sortBy]
  );

  const handleSpeakerPress = useCallback(
    (speaker: Speaker) => {
      posthog?.capture('speaker_selected', {
        $screen_name: 'Speakers',
        speaker_name: speaker.speaker,
        speaker_title: speaker.title,
      });
      router.push({
        pathname: '/(tabs)/speaker-detail',
        params: { id: speaker.id },
      } as any);
    },
    [posthog]
  );

  const renderItem = useCallback(
    ({ item }: { item: Speaker }) => (
      <SpeakerCard speaker={item} onPress={() => handleSpeakerPress(item)} />
    ),
    [handleSpeakerPress]
  );

  const keyExtractor = useCallback((item: Speaker) => item.id, []);

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
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={palette.headerText} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={[styles.headerTitle, { color: palette.headerText }]}>
          AA Speakers
        </Text>
      </LinearGradient>

      {/* Sort controls */}
      <View style={[styles.sortRow, { borderBottomColor: palette.border }]}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSortBy(opt.key)}
            style={[
              styles.sortButton,
              sortBy === opt.key && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === opt.key ? palette.tint : palette.muted,
                  fontWeight: sortBy === opt.key ? adjustFontWeight('600') : adjustFontWeight('400'),
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Speaker list */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      ) : (
        <FlatList
          data={sortedSpeakers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
        />
      )}
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
    marginBottom: 16,
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
    fontWeight: adjustFontWeight('400'),
    textAlign: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 24,
  },
  sortButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sortText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
