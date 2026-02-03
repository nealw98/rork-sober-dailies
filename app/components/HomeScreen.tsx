import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, AppState, AppStateStatus, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import SobrietyCounter from '@/components/SobrietyCounter';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// Helper to check if a color array is a gradient or solid
const isSolidColor = (colors: string[]): boolean => {
  return colors.length === 2 && colors[0] === colors[1];
};

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const [todaysReflection, setTodaysReflection] = useState<Reflection | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const lastDateRef = useRef<Date>(new Date());

  // Fetch today's reflection
  const fetchReflection = useCallback(() => {
    getTodaysReflection().then(setTodaysReflection).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReflection();
  }, [fetchReflection]);

  // Update date and reflection when app comes to foreground on a new day
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const today = new Date();
        // If it's a new day, update the date and re-fetch reflection
        if (!isSameDay(lastDateRef.current, today)) {
          console.log('[HomeScreen] New day detected on foreground, updating date and reflection');
          lastDateRef.current = today;
          setCurrentDate(today);
          fetchReflection();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchReflection]);

  // Format today's date
  const dateDisplay = currentDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Gradient Header with Sobriety Counter */}
      <LinearGradient
        colors={palette.gradients.header as [string, string, ...string[]]}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      >
        <View style={styles.sobrietyCounterContainer}>
          <SobrietyCounter />
        </View>
      </LinearGradient>

      {/* Bento Grid Content Area */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Tiles */}
        {/* Daily Reflection - Full Width */}
        <TouchableOpacity
          onPress={() => router.push('/daily-reflections')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={palette.heroTiles.dailyReflection as [string, string, ...string[]]}
            style={[styles.heroTile, styles.dailyReflectionTile]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Text style={styles.heroEmoji}>📅</Text>
            <Text style={[styles.heroTitle, { color: palette.heroTileText }]}>Daily Reflection</Text>
            <Text style={[styles.heroSubtitle, { color: palette.heroTileText }]}>
              {dateDisplay} — {todaysReflection?.title || 'Loading...'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* AI Sponsor & Literature - Side by Side */}
        <View style={styles.heroRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/chat')}
            activeOpacity={0.8}
            style={styles.heroTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.aiSponsor as [string, string, ...string[]]}
              style={[styles.heroTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.heroEmoji}>💬</Text>
              <Text style={[styles.heroTitle, { color: palette.heroTileText }]}>AI Sponsor</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/literature')}
            activeOpacity={0.8}
            style={styles.heroTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.literature as [string, string, ...string[]]}
              style={[styles.heroTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.heroEmoji}>📖</Text>
              <Text style={[styles.heroTitle, { color: palette.heroTileText }]}>Literature</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Morning Section */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>Morning</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers?prayer=morning')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.morningPrayer as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Morning Prayer</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/gratitude')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.gratitude as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>😊</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Gratitude List</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Evening Section */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>Evening</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers?prayer=evening')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.eveningPrayer as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Evening Prayer</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/evening-review')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.nightlyReview as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🌙</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Nightly Review</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Anytime Section */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>Anytime</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.prayers as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Prayers</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/inventory')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={palette.heroTiles.spotCheck as [string, string, ...string[]]}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>📝</Text>
              <Text style={[styles.routineTitleLight, { color: palette.heroTileText }]}>Spot Check</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  sobrietyCounterContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Hero Tiles
  heroTile: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  heroTileHalf: {
    flex: 1,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dailyReflectionTile: {
    shadowColor: '#4A68B5',
  },
  aiSponsorTile: {
    shadowColor: '#3D8B8B',
  },
  literatureTile: {
    shadowColor: '#4AA06A',
  },
  heroEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
  },
  heroSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: adjustFontWeight('600'),
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },

  // Routine Tiles
  routineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  routineTile: {
    borderRadius: 16,
    padding: 20,
  },
  routineTileHalf: {
    flex: 1,
  },
  routineTileFull: {
    flex: 1,
  },
  morningPrayerTile: {
    shadowColor: '#E5B530',
  },
  gratitudeTile: {
    shadowColor: '#E8884A',
  },
  eveningPrayerTile: {
    shadowColor: '#D5708A',
  },
  nightlyReviewTile: {
    shadowColor: '#8A65B5',
  },
  spotCheckTile: {
    shadowColor: '#4AA898',
  },
  routineEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  routineTitle: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
  },
  routineTitleLight: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
  },
  routineSubtitle: {
    fontSize: 14,
    color: '#6b7c8a',
    marginTop: 4,
  },
});

export default HomeScreen;
