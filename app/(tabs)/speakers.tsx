import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { router, Stack } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Search, X } from 'lucide-react-native';
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
  const [searchQuery, setSearchQuery] = useState('');

  useScreenTimeTracking('Speakers');

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Speakers');
    }, [posthog])
  );

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

      {/* Search + Sort controls */}
      <View style={[styles.controlsBar, { borderBottomColor: palette.border }]}>
        <View style={[styles.searchRow, { backgroundColor: palette.cardBackground, borderColor: palette.border }]}>
          <Search size={16} color={palette.muted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search speakers..."
            placeholderTextColor={palette.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={palette.muted} />
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
      </View>

      {/* Speaker list */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                No speakers found
              </Text>
            </View>
          }
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
  controlsBar: {
    borderBottomWidth: 1,
    paddingTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 4,
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
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
  },
});
