/**
 * Prayer Reader Component
 * 
 * Full-screen modal reader that displays prayer content with:
 * - Prayer title in header
 * - Scrollable prayer text
 * - Prev/Next prayer navigation in footer
 * 
 * Rebuilt to match BigBookReader architecture for reliable cross-platform scrolling.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { ChevronLeft, ChevronRight, Type } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import Colors from '@/constants/colors';
import { aaPrayers } from '@/constants/prayers';

interface PrayerReaderProps {
  visible: boolean;
  prayerIndex: number;
  onClose: () => void;
  onPrayerChange: (index: number) => void;
}

export function PrayerReader({ visible, prayerIndex, onClose, onPrayerChange }: PrayerReaderProps) {
  const insets = useSafeAreaInsets();
  const { fontSize, lineHeight, setFontSize, minFontSize, maxFontSize } = useTextSettings();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Force layout recalculation on Android when modal opens
  // This fixes an issue where initial layout is calculated incorrectly at large font sizes
  const [layoutKey, setLayoutKey] = useState(0);
  
  useEffect(() => {
    if (visible && Platform.OS === 'android') {
      // Trigger LayoutAnimation to force Android to recalculate layout
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // Also increment key to force re-render of ScrollView
      const timer = requestAnimationFrame(() => {
        setLayoutKey(k => k + 1);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [visible, prayerIndex]);
  
  // Font size controls
  const increaseFontSize = useCallback(() => {
    setFontSize(Math.min(fontSize + 2, maxFontSize));
  }, [fontSize, maxFontSize, setFontSize]);
  
  const decreaseFontSize = useCallback(() => {
    setFontSize(Math.max(fontSize - 2, minFontSize));
  }, [fontSize, minFontSize, setFontSize]);
  
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

  // Scroll to top when prayer changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [prayerIndex]);

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
          <Text style={[styles.prayerText, styles.italicText, styles.introMargin, { fontSize, lineHeight }]}>
            As I begin this day, I ask my Higher Power:
          </Text>
          <Text style={[styles.prayerText, { fontSize, lineHeight }]}>
            {currentPrayer.content.split('As I begin this day, I ask my Higher Power:')[1]?.trim()}
          </Text>
        </View>
      );
    }
    
    if (currentPrayer.title === "Evening Prayer") {
      return (
        <View>
          <Text style={[styles.prayerText, styles.italicText, styles.introMargin, { fontSize, lineHeight }]}>
            As this day closes,
          </Text>
          <Text style={[styles.prayerText, { fontSize, lineHeight }]}>
            {currentPrayer.content.split('As this day closes,')[1]?.trim()}
          </Text>
        </View>
      );
    }

    return (
      <Text style={[styles.prayerText, { fontSize, lineHeight }]}>
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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {currentPrayer.title}
          </Text>
        </LinearGradient>

        {/* Action Row - matches BigBookReader structure */}
        <View style={styles.actionRow}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={decreaseFontSize}
              activeOpacity={0.8}
              style={styles.actionButton}
            >
              <Text style={styles.fontSizeButtonText}>A-</Text>
            </TouchableOpacity>
            <Type size={18} color="#3D8B8B" />
            <TouchableOpacity 
              onPress={increaseFontSize}
              activeOpacity={0.8}
              style={styles.actionButton}
            >
              <Text style={[styles.fontSizeButtonText, styles.fontSizeButtonTextLarge]}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper} collapsable={false}>
          <ScrollView
            key={`prayer-scroll-${layoutKey}`}
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {renderPrayerContent()}
            
            {currentPrayer.source && (
              <Text style={[styles.prayerSource, { fontSize: fontSize * 0.75 }]}>
                — {currentPrayer.source}
              </Text>
            )}
          </ScrollView>
        </View>

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
    backgroundColor: '#fff',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: '#3D8B8B',
    fontWeight: '600',
  },
  fontSizeButtonTextLarge: {
    fontSize: 20,
  },
  contentWrapper: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0, // Start from 0 and grow - helps Android respect constraints
    minHeight: 0, // Critical for Android - allows flex to shrink below content size
    overflow: 'hidden', // Ensures content doesn't push siblings off-screen
    backgroundColor: '#fff',
  },
  content: {
    // Removed flex: 1 - parent contentWrapper handles flex, ScrollView fills naturally
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
  introMargin: {
    marginBottom: 20,
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
    paddingHorizontal: 24,
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
