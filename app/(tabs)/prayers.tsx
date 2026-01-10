import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ChevronRight, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aaPrayers } from "@/constants/prayers";
import { adjustFontWeight } from "@/constants/fonts";
import ScreenContainer from "@/components/ScreenContainer";
import { PrayerReader } from "@/components/PrayerReader";

export default function PrayersScreen() {
  const { prayer } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [readerVisible, setReaderVisible] = useState(false);
  const [selectedPrayerIndex, setSelectedPrayerIndex] = useState(0);

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
        setReaderVisible(true);
      }
    }
  }, [prayer]);

  const handlePrayerPress = useCallback((index: number) => {
    setSelectedPrayerIndex(index);
    setReaderVisible(true);
  }, []);

  const handlePrayerChange = useCallback((index: number) => {
    setSelectedPrayerIndex(index);
  }, []);

  const handleCloseReader = useCallback(() => {
    setReaderVisible(false);
  }, []);

  return (
    <>
      <ScreenContainer style={styles.container} noPadding>
        <Stack.Screen options={{ headerShown: false }} />
        
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
                onPress={() => handlePrayerPress(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowTitle}>{prayerItem.title}</Text>
                <ChevronRight size={18} color="#a0a0a0" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ScreenContainer>

      {/* Prayer Reader Modal - only render when visible (matching BigBookMain pattern) */}
      {readerVisible && (
        <PrayerReader
          visible={readerVisible}
          prayerIndex={selectedPrayerIndex}
          onClose={handleCloseReader}
          onPrayerChange={handlePrayerChange}
        />
      )}
    </>
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
