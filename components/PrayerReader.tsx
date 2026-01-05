/**
 * Prayer Reader Component
 * 
 * Full-screen modal reader that displays prayer content with:
 * - Prayer title in header
 * - Scrollable prayer text
 * - Prev/Next prayer navigation in footer
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import { aaPrayers } from '@/constants/prayers';
import { useEffect } from 'react';

interface PrayerReaderProps {
  visible: boolean;
  prayerIndex: number;
  onClose: () => void;
  onPrayerChange: (index: number) => void;
}

export function PrayerReader({ visible, prayerIndex, onClose, onPrayerChange }: PrayerReaderProps) {
  const insets = useSafeAreaInsets();
  const { fontSize, resetDefaults } = useTextSettings();
  
  const currentPrayer = aaPrayers[prayerIndex];
  const hasPrevious = prayerIndex > 0;
  const hasNext = prayerIndex < aaPrayers.length - 1;
  
  const previousPrayer = hasPrevious ? aaPrayers[prayerIndex - 1] : null;
  const nextPrayer = hasNext ? aaPrayers[prayerIndex + 1] : null;

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      resetDefaults();
    })
    .runOnJS(true), [resetDefaults]);

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      onPrayerChange(prayerIndex - 1);
    }
  }, [hasPrevious, prayerIndex, onPrayerChange]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      onPrayerChange(prayerIndex + 1);
    }
  }, [hasNext, prayerIndex, onPrayerChange]);

  // Render prayer content with special formatting for Morning/Evening prayers
  const renderPrayerContent = () => {
    if (!currentPrayer) return null;

    if (currentPrayer.title === "Morning Prayer") {
      return (
        <View>
          <Text style={[styles.prayerText, styles.italicText, { fontSize, lineHeight: fontSize * 1.5 }]}>
            As I begin this day, I ask my Higher Power:
          </Text>
          <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.5 }]}>
            {currentPrayer.content.split('As I begin this day, I ask my Higher Power:')[1]}
          </Text>
        </View>
      );
    }
    
    if (currentPrayer.title === "Evening Prayer") {
      return (
        <View>
          <Text style={[styles.prayerText, styles.italicText, { fontSize, lineHeight: fontSize * 1.5 }]}>
            As this day closes,
          </Text>
          <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.5 }]}>
            {currentPrayer.content.split('As this day closes,')[1]}
          </Text>
        </View>
      );
    }

    return (
      <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.5 }]}>
        {currentPrayer.content}
      </Text>
    );
  };

  if (!currentPrayer) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
          style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {currentPrayer.title}
          </Text>
        </LinearGradient>

        {/* Content */}
        <GestureDetector gesture={doubleTapGesture}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {renderPrayerContent()}
            
            {currentPrayer.source && (
              <Text style={[styles.prayerSource, { fontSize: fontSize * 0.75 }]}>
                — {currentPrayer.source}
              </Text>
            )}
          </ScrollView>
        </GestureDetector>

        {/* Footer with Prayer Navigation */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity 
            onPress={goToPrevious}
            style={[styles.footerNavButton, !hasPrevious && styles.footerNavButtonDisabled]}
            disabled={!hasPrevious}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={20} color={hasPrevious ? "#3D8B8B" : "#ccc"} />
            <Text 
              style={[styles.footerNavText, !hasPrevious && styles.footerNavTextDisabled]}
              numberOfLines={1}
            >
              {previousPrayer ? previousPrayer.title.replace(' Prayer', '') : 'Prev'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={goToNext}
            style={[styles.footerNavButton, !hasNext && styles.footerNavButtonDisabled]}
            disabled={!hasNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text 
              style={[styles.footerNavText, !hasNext && styles.footerNavTextDisabled]}
              numberOfLines={1}
            >
              {nextPrayer ? nextPrayer.title.replace(' Prayer', '') : 'Next'}
            </Text>
            <ChevronRight size={20} color={hasNext ? "#3D8B8B" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  prayerText: {
    fontSize: 18,
    color: '#000',
    marginBottom: 16,
  },
  italicText: {
    fontStyle: 'italic',
  },
  prayerSource: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
    maxWidth: '45%',
  },
  footerNavButtonDisabled: {
    opacity: 0.5,
  },
  footerNavText: {
    fontSize: 16,
    color: '#3D8B8B',
    fontWeight: adjustFontWeight('400'),
  },
  footerNavTextDisabled: {
    color: '#ccc',
  },
});

