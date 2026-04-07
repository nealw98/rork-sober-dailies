import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput, ImageBackground } from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, X, Mic } from 'lucide-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import { SpeakerCard } from '@/components/SpeakerCard';
import { useSpeakers, Speaker } from '@/hooks/useSpeakers';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import TopLevelHeader from '@/components/navigation/TopLevelHeader';
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
  const { speakers, isLoading } = useSpeakers();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useScreenTimeTracking('Speakers');

  const filteredAndSorted = useMemo(() => {
    let results = speakers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = speakers.filter(
        (s) =>
          s.speaker.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          (s.subtitle && s.subtitle.toLowerCase().includes(q)) ||
          s.hometown.toLowerCase().includes(q) ||
          s.core_themes.toLowerCase().includes(q)
      );
    }
    return sortSpeakers(results, sortBy);
  }, [speakers, sortBy, searchQuery]);

  const handleSpeakerPress = useCallback(
    (speaker: Speaker) => {
      router.push({
        pathname: '/(main)/speaker-detail',
        params: { id: speaker.id },
      } as any);
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Speaker }) => (
      <SpeakerCard speaker={item} onPress={() => handleSpeakerPress(item)} />
    ),
    [handleSpeakerPress]
  );

  const keyExtractor = useCallback((item: Speaker) => item.id, []);

  const ListHeader = (
    <>
      {/* ── Hero Image ── */}
      <View style={styles.heroWrapper}>
        <ImageBackground
          source={require('@/assets/images/speakers_page.webp')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroFeaturedRow}>
            <Mic size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroFeaturedLabel}>FEATURED</Text>
          </View>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>AA Speakers</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Search + Sort controls */}
      <View style={styles.controlsBar}>
        <View style={styles.searchRow}>
          <Search size={16} color={sem.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search speakers..."
            placeholderTextColor={sem.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={sem.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[
                styles.sortButton,
                sortBy === opt.key && styles.sortButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  { color: sortBy === opt.key ? colors.tertiaryDark : sem.textMuted },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: sem.background }]}>
        <TopLevelHeader title="" />

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.tertiary} />
          </View>
        ) : (
          <FlatList
            data={filteredAndSorted}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No speakers found</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Hero Image ──
  heroWrapper: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.lg,
  },
  heroImage: {
    height: 300,
    justifyContent: 'flex-end',
  },
  heroFeaturedRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroFeaturedLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitleRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    letterSpacing: -0.5,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },


  // ── Search + Sort ──
  controlsBar: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: sem.text,
    padding: 0,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sortButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  sortButtonActive: {
    backgroundColor: colors.tertiaryLight,
  },
  sortText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: sem.textMuted,
  },
});
