import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from "@/constants/colors";
import { aaPrayers } from "@/constants/prayers";
import { adjustFontWeight } from "@/constants/fonts";
import ScreenContainer from "@/components/ScreenContainer";
import { useTextSettings } from "@/hooks/use-text-settings";

export default function PrayersScreen() {
  const { prayer } = useLocalSearchParams();
  const [expandedPrayer, setExpandedPrayer] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const prayerRefs = useRef<{ [key: number]: View | null }>({});
  const prayerPositions = useRef<{ [key: number]: number }>({});
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { fontSize, lineHeight, resetDefaults } = useTextSettings();
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      resetDefaults();
    })
    .runOnJS(true), [resetDefaults]);

  // Track if we came from a deep link or tab navigation
  const isFromDeepLink = useRef(false);
  
  // Reset expanded prayer when screen comes into focus via tab navigation
  useFocusEffect(
    useCallback(() => {
      // If we're not coming from a deep link, always reset to collapsed state
      if (!isFromDeepLink.current) {
        setExpandedPrayer(null);
        // Scroll to top
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      }
      // Reset the deep link flag after handling
      isFromDeepLink.current = false;
    }, [])
  );

  useEffect(() => {
    if (prayer) {
      // Mark that we came from a deep link
      isFromDeepLink.current = true;
      
      const prayerParam = prayer.toString().toLowerCase();
      const prayerIndex = aaPrayers.findIndex(p => {
        const title = p.title.toLowerCase();
        return title.includes(prayerParam) || 
               (prayerParam === 'morning' && title.includes('morning')) ||
               (prayerParam === 'evening' && title.includes('evening'));
      });
      if (prayerIndex !== -1) {
        setExpandedPrayer(prayerIndex);
        // Scroll to the prayer after a short delay to ensure the component is rendered
        setTimeout(() => {
          scrollToPrayer(prayerIndex);
        }, 100);
      }
    } else {
      // If no prayer parameter, ensure we're in collapsed state
      isFromDeepLink.current = false;
      setExpandedPrayer(null);
    }
  }, [prayer]);

  const scrollToPrayer = (index: number) => {
    const position = prayerPositions.current[index];
    if (position !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, position - 20), animated: true });
    }
  };

  return (
    <ScreenContainer style={styles.container} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top row with back button and text settings */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>AA Prayers</Text>
      </LinearGradient>
      
      {/* Off-white content area */}
      <GestureDetector gesture={doubleTapGesture}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer} 
          contentContainerStyle={styles.contentContainer}
        >
        {aaPrayers.map((prayer, index) => (
          <View 
            key={index} 
            style={styles.prayerItem}
            ref={(ref) => { prayerRefs.current[index] = ref; }}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              prayerPositions.current[index] = y;
            }}
          >
            <TouchableOpacity
              style={styles.prayerHeader}
              onPress={() => setExpandedPrayer(expandedPrayer === index ? null : index)}
              testID={`prayer-${index}`}
              activeOpacity={0.7}
            >
              <Text style={styles.prayerTitle}>{prayer.title}</Text>
              {expandedPrayer === index ? (
                <ChevronDown size={20} color="#666" />
              ) : (
                <ChevronRight size={20} color="#666" />
              )}
            </TouchableOpacity>
            
            {expandedPrayer === index && (
              <View style={styles.prayerContent}>
                {prayer.title === "Morning Prayer" ? (
                  <View>
                    <Text style={[styles.prayerText, styles.italicText, { fontSize, lineHeight: fontSize * 1.375 }]}>As I begin this day, I ask my Higher Power:</Text>
                    <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.375 }]}>{prayer.content.split('As I begin this day, I ask my Higher Power:')[1]}</Text>
                  </View>
                ) : prayer.title === "Evening Prayer" ? (
                  <View>
                    <Text style={[styles.prayerText, styles.italicText, { fontSize, lineHeight: fontSize * 1.375 }]}>As this day closes,</Text>
                    <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.375 }]}>{prayer.content.split('As this day closes,')[1]}</Text>
                  </View>
                ) : (
                  <Text style={[styles.prayerText, { fontSize, lineHeight }]}>{prayer.content}</Text>
                )}
                {prayer.source && <Text style={[styles.prayerSource, { fontSize: fontSize * 0.75 }]}>— {prayer.source}</Text>}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      </GestureDetector>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontStyle: 'italic',
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
  prayerItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  prayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: '#000',
  },
  prayerContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  prayerText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    marginBottom: 16,
  },
  italicText: {
    fontStyle: 'italic',
  },
  prayerSource: {
    fontSize: 12,
    color: '#555',
    textAlign: "right",
    fontStyle: "italic",
  },
});