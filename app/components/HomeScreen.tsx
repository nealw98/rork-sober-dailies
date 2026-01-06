import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import SobrietyCounter from '@/components/SobrietyCounter';
import { adjustFontWeight } from '@/constants/fonts';
import { getTodaysReflection } from '@/constants/reflections';
import { Reflection } from '@/types';

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [todaysReflection, setTodaysReflection] = useState<Reflection | null>(null);

  useEffect(() => {
    getTodaysReflection().then(setTodaysReflection).catch(console.error);
  }, []);

  // Format today's date
  const today = new Date();
  const dateDisplay = today.toLocaleDateString('en-US', { 
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
          style={[styles.heroTile, styles.dailyReflectionTile]}
          onPress={() => router.push('/daily-reflections')}
          activeOpacity={0.8}
        >
          <Text style={styles.heroEmoji}>📅</Text>
          <Text style={styles.heroTitle}>Daily Reflection</Text>
          <Text style={styles.heroSubtitle}>
            {dateDisplay} — {todaysReflection?.title || 'Loading...'}
          </Text>
        </TouchableOpacity>

        {/* AI Sponsor & Literature - Side by Side */}
        <View style={styles.heroRow}>
          <TouchableOpacity
            style={[styles.heroTile, styles.heroTileHalf, styles.aiSponsorTile]}
            onPress={() => router.push('/(tabs)/chat')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroEmoji}>💬</Text>
            <Text style={styles.heroTitle}>AI Sponsor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroTile, styles.heroTileHalf, styles.literatureTile]}
            onPress={() => router.push('/(tabs)/literature')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroEmoji}>📖</Text>
            <Text style={styles.heroTitle}>Literature</Text>
          </TouchableOpacity>
        </View>

        {/* Morning Section */}
        <Text style={styles.sectionLabel}>Morning</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            style={[styles.routineTile, styles.routineTileHalf]}
            onPress={() => router.push('/(tabs)/prayers?prayer=morning')}
            activeOpacity={0.8}
          >
            <Text style={styles.routineEmoji}>🙏</Text>
            <Text style={styles.routineTitle}>Morning Prayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.routineTile, styles.routineTileHalf]}
            onPress={() => router.push('/(tabs)/gratitude')}
            activeOpacity={0.8}
          >
            <Text style={styles.routineEmoji}>😊</Text>
            <Text style={styles.routineTitle}>Gratitude List</Text>
          </TouchableOpacity>
        </View>

        {/* Evening Section */}
        <Text style={styles.sectionLabel}>Evening</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            style={[styles.routineTile, styles.routineTileHalf]}
            onPress={() => router.push('/(tabs)/prayers?prayer=evening')}
            activeOpacity={0.8}
          >
            <Text style={styles.routineEmoji}>🙏</Text>
            <Text style={styles.routineTitle}>Evening Prayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.routineTile, styles.routineTileHalf]}
            onPress={() => router.push('/(tabs)/evening-review')}
            activeOpacity={0.8}
          >
            <Text style={styles.routineEmoji}>🌙</Text>
            <Text style={styles.routineTitle}>Nightly Review</Text>
          </TouchableOpacity>
        </View>

        {/* Anytime Section */}
        <Text style={styles.sectionLabel}>Anytime</Text>
        <View style={styles.routineRow}>
          <TouchableOpacity
            style={[styles.routineTile, styles.routineTileFull]}
            onPress={() => router.push('/(tabs)/inventory')}
            activeOpacity={0.8}
          >
            <Text style={styles.routineEmoji}>📝</Text>
            <Text style={styles.routineTitle}>Spot Check Inventory</Text>
            <Text style={styles.routineSubtitle}>A quick review when you're "off the beam"</Text>
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
    backgroundColor: '#f5f6f8',
  },
  headerGradient: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  sobrietyCounterContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
  },
  heroTileHalf: {
    flex: 1,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dailyReflectionTile: {
    backgroundColor: '#4A68B5',
    shadowColor: '#4A68B5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aiSponsorTile: {
    backgroundColor: '#3D8B8B',
    shadowColor: '#3D8B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  literatureTile: {
    backgroundColor: '#4AA06A',
    shadowColor: '#4AA06A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  heroEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 111, 165, 0.12)',
  },
  routineTileHalf: {
    flex: 1,
  },
  routineTileFull: {
    flex: 1,
  },
  routineEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  routineTitle: {
    fontSize: 19,
    fontWeight: adjustFontWeight('600'),
    color: '#3d5a6a',
  },
  routineSubtitle: {
    fontSize: 14,
    color: '#6b7c8a',
    marginTop: 4,
  },
});

export default HomeScreen;
