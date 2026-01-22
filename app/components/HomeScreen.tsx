import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, AppState, AppStateStatus, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import SobrietyCounter from '@/components/SobrietyCounter';
import { adjustFontWeight } from '@/constants/fonts';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      {/* Gradient Header with Sobriety Counter */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
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
            colors={['#6A88D5', '#4A68B5']}
            style={[styles.heroTile, styles.dailyReflectionTile]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Text style={styles.heroEmoji}>📅</Text>
            <Text style={styles.heroTitle}>Daily Reflection</Text>
            <Text style={styles.heroSubtitle}>
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
              colors={['#5DABAB', '#3D8B8B']}
              style={[styles.heroTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.heroEmoji}>💬</Text>
              <Text style={styles.heroTitle}>AI Sponsor</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/literature')}
            activeOpacity={0.8}
            style={styles.heroTileHalf}
          >
            <LinearGradient
              colors={['#6AC08A', '#4AA06A']}
              style={[styles.heroTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.heroEmoji}>📖</Text>
              <Text style={styles.heroTitle}>Literature</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Morning Section */}
        <Text style={styles.sectionLabel}>Morning</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers?prayer=morning')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={['#F5D560', '#E5B530']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={styles.routineTitleLight}>Morning Prayer</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/gratitude')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={['#F8A870', '#E8884A']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>😊</Text>
              <Text style={styles.routineTitleLight}>Gratitude List</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Evening Section */}
        <Text style={styles.sectionLabel}>Evening</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers?prayer=evening')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={['#E590AA', '#D5708A']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={styles.routineTitleLight}>Evening Prayer</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/evening-review')}
            activeOpacity={0.8}
            style={styles.routineTileHalf}
          >
            <LinearGradient
              colors={['#AA85D5', '#8A65B5']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🌙</Text>
              <Text style={styles.routineTitleLight}>Nightly Review</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Anytime Section */}
        <Text style={styles.sectionLabel}>Anytime</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/prayers')}
            activeOpacity={0.8}
            style={styles.routineTileFull}
          >
            <LinearGradient
              colors={['#7A98E5', '#4258A5']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>🙏</Text>
              <Text style={styles.routineTitleLight}>Prayers</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.routineRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/inventory')}
            activeOpacity={0.8}
            style={styles.routineTileFull}
          >
            <LinearGradient
              colors={['#6AC8B8', '#4AA898']}
              style={[styles.routineTile]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Text style={styles.routineEmoji}>📝</Text>
              <Text style={styles.routineTitleLight}>Spot Check Inventory</Text>
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
    backgroundColor: '#fff',
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
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: adjustFontWeight('600'),
    color: '#6b7c8a',
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
    color: '#3d5a6a',
  },
  routineTitleLight: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  routineSubtitle: {
    fontSize: 14,
    color: '#6b7c8a',
    marginTop: 4,
  },
});

export default HomeScreen;
