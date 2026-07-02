/**
 * Prayers Main Component
 * 
 * Matches BigBookMain architecture:
 * - Top-level component managing state
 * - Renders PrayersList and PrayerReader as siblings
 * - Modal conditionally rendered when prayer is selected
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ChevronRight, ChevronLeft, Plus, Pencil } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aaPrayers } from '@/constants/prayers';
import { adjustFontWeight } from '@/constants/fonts';
import { PrayerReader } from './PrayerReader';
import { PrayerEditSheet } from './PrayerEditSheet';
import { useUserPrayers, type UserPrayer } from '@/hooks/use-user-prayers-store';
import { useTextSettings } from '@/hooks/use-text-settings';
import { logEvent } from '@/lib/usageLogger';
import { useTheme } from '@/hooks/useTheme';

export function PrayersMain() {
  const { prayer } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontSize } = useTextSettings();
  const { palette } = useTheme();
  
  const [selectedPrayerIndex, setSelectedPrayerIndex] = useState<number | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);

  // User-created prayers + the combined list the reader navigates across.
  const { prayers: userPrayers, addPrayer, updatePrayer, removePrayer } = useUserPrayers();
  const allPrayers = useMemo(
    () => [...aaPrayers, ...userPrayers.map((p) => ({ title: p.title, content: p.content }))],
    [userPrayers],
  );
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; prayer: UserPrayer } | null>(null);

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
    const selectedPrayer = allPrayers[index];

    logEvent('prayer_viewed', {
      screen: 'Prayers',
      prayer_title: selectedPrayer?.title,
    });

    setSelectedPrayerIndex(index);
    setShowReaderModal(true);
  }, [allPrayers]);

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
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Gradient header block */}
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
        <Text style={[styles.headerTitle, { color: palette.headerText }]}>Prayers</Text>
      </LinearGradient>
      
      {/* Prayer List */}
      <ScrollView 
        style={[styles.scrollContainer, { backgroundColor: palette.background }]} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>AA PRAYERS</Text>
        <View style={styles.listContainer}>
          {aaPrayers.map((prayerItem, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.listRow,
                { borderBottomColor: palette.divider },
                index === aaPrayers.length - 1 && styles.listRowLast
              ]}
              onPress={() => handleSelectPrayer(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowTitle, { fontSize, color: palette.text }]}>{prayerItem.title}</Text>
              <ChevronRight size={18} color={palette.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* My Prayers — user-created, editable/deletable */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, { color: palette.muted, marginBottom: 0 }]}>MY PRAYERS</Text>
          <TouchableOpacity onPress={() => setSheet({ mode: 'add' })} style={[styles.addBtn, { backgroundColor: palette.accent }]} activeOpacity={0.85}>
            <Plus size={15} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {userPrayers.length === 0 ? (
          <Text style={[styles.emptyText, { color: palette.muted }]}>Save a prayer that&rsquo;s meaningful to you — it&rsquo;ll appear here.</Text>
        ) : (
          <View style={styles.listContainer}>
            {userPrayers.map((p, j) => (
              <View
                key={p.id}
                style={[styles.listRow, { borderBottomColor: palette.divider }, j === userPrayers.length - 1 && styles.listRowLast]}
              >
                <TouchableOpacity style={styles.rowMain} onPress={() => handleSelectPrayer(aaPrayers.length + j)} activeOpacity={0.7}>
                  <Text style={[styles.rowTitle, { fontSize, color: palette.text }]} numberOfLines={1}>{p.title}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSheet({ mode: 'edit', prayer: p })} hitSlop={10} style={styles.editBtn} activeOpacity={0.7}>
                  <Pencil size={16} color={palette.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reader Modal - only rendered when prayer is selected (matching BigBookMain pattern) */}
      {selectedPrayerIndex !== null && (
        <PrayerReader
          visible={showReaderModal}
          prayerIndex={selectedPrayerIndex}
          prayers={allPrayers}
          onClose={handleCloseReader}
          onPrayerChange={handlePrayerChange}
          palette={palette}
        />
      )}

      {sheet?.mode === 'add' && (
        <PrayerEditSheet
          palette={palette}
          onSave={(title, content) => { addPrayer(title, content); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.mode === 'edit' && (
        <PrayerEditSheet
          palette={palette}
          initialTitle={sheet.prayer.title}
          initialContent={sheet.prayer.content}
          canDelete
          onSave={(title, content) => { updatePrayer(sheet.prayer.id, title, content); setSheet(null); }}
          onDelete={() => { removePrayer(sheet.prayer.id); setSheet(null); }}
          onClose={() => setSheet(null)}
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: adjustFontWeight('700'),
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 8,
    paddingLeft: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  editBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('500'),
    flex: 1,
  },
});
