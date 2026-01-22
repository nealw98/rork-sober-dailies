/**
 * Prayers Main Component
 * 
 * Matches BigBookMain architecture:
 * - Top-level component managing state
 * - Renders PrayersList and PrayerReader as siblings
 * - Modal conditionally rendered when prayer is selected
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';

import { aaPrayers } from '@/constants/prayers';
import { adjustFontWeight } from '@/constants/fonts';
import { PrayerReader } from './PrayerReader';
import { useTextSettings } from '@/hooks/use-text-settings';

export function PrayersMain() {
  const posthog = usePostHog();
  const { prayer } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontSize } = useTextSettings();
  
  const [selectedPrayerIndex, setSelectedPrayerIndex] = useState<number | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);

  // Handle deep link navigation (from Home screen tiles)
  useEffect(() => {
    if (prayer) {
      const prayerParam = prayer.toString().toLowerCase();
      const prayerIndex = aaPrayers.findIndex(p => {
        const title = p.title.toLowerCase();
        return title.includes(prayerParam) || 
               (prayerParam === 'morning' && title.includes('morning')) ||
               (prayerParam === 'evening' && title.includes('evening'));
      });
      if (prayerIndex !== -1) {
        setSelectedPrayerIndex(prayerIndex);
        setShowReaderModal(true);
      }
    }
  }, [prayer]);

  // Handle prayer selection - open modal (matching BigBookMain pattern)
  const handleSelectPrayer = useCallback((index: number) => {
    const selectedPrayer = aaPrayers[index];
    
    // Track prayer view
    posthog?.capture('prayer_viewed', { 
      $screen_name: 'Prayers',
      prayer_title: selectedPrayer.title 
    });
    
    setSelectedPrayerIndex(index);
    setShowReaderModal(true);
  }, [posthog]);

  // Handle closing reader modal (matching BigBookMain pattern)
  const handleCloseReader = useCallback(() => {
    setShowReaderModal(false);
    // Small delay before clearing state to allow modal animation to complete
    setTimeout(() => {
      setSelectedPrayerIndex(null);
    }, 300);
  }, []);

  // Handle prayer change (next/prev navigation)
  const handlePrayerChange = useCallback((index: number) => {
    setSelectedPrayerIndex(index);
  }, []);

  return (
    <View style={styles.container}>
      {/* Gradient header block */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
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
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>AA Prayers</Text>
      </LinearGradient>
      
      {/* Prayer List */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {aaPrayers.map((prayerItem, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.listRow,
                index === aaPrayers.length - 1 && styles.listRowLast
              ]}
              onPress={() => handleSelectPrayer(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowTitle, { fontSize }]}>{prayerItem.title}</Text>
              <ChevronRight size={18} color="#a0a0a0" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Reader Modal - only rendered when prayer is selected (matching BigBookMain pattern) */}
      {selectedPrayerIndex !== null && (
        <PrayerReader
          visible={showReaderModal}
          prayerIndex={selectedPrayerIndex}
          onClose={handleCloseReader}
          onPrayerChange={handlePrayerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
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
    color: '#fff',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 139, 139, 0.3)',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    flex: 1,
  },
});
