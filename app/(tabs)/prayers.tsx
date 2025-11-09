import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { ChevronDown, ChevronRight, Type } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import Colors from "@/constants/colors";
import { aaPrayers } from "@/constants/prayers";
import { adjustFontWeight } from "@/constants/fonts";
import ScreenContainer from "@/components/ScreenContainer";

export default function PrayersScreen() {
  const { prayer } = useLocalSearchParams();
  const [expandedPrayer, setExpandedPrayer] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const prayerRefs = useRef<{ [key: number]: View | null }>({});
  const prayerPositions = useRef<{ [key: number]: number }>({});
  
  const [fontSize, setFontSize] = useState(18);
  const baseFontSize = 18;
  const maxFontSize = Platform.OS === 'android' ? 34 : 30;
  
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, maxFontSize));
  };
  
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };
  
  // Double-tap anywhere in the content to reset font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      setFontSize(baseFontSize);
    })
    .runOnJS(true), [baseFontSize]);

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
    <>
    <Stack.Screen 
      options={{
        headerRight: () => (
          <View style={styles.navFontSizeControls}>
            <TouchableOpacity 
              onPress={decreaseFontSize}
              style={styles.fontSizeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Type size={16} color={Colors.light.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={increaseFontSize}
              style={styles.fontSizeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Type size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        ),
      }}
    />
    <ScreenContainer style={styles.container}>
      <LinearGradient
        colors={Colors.gradients.mainThreeColor}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      />
      
      <GestureDetector gesture={doubleTapGesture}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer} 
          contentContainerStyle={styles.contentContainer}
        >
        <View style={styles.header}>
          <Text style={styles.title}>AA Prayers</Text>
          <Text style={styles.subtitle}>Essential prayers for recovery and reflection</Text>
        </View>
        
        {aaPrayers.map((prayer, index) => (
          <View 
            key={index} 
            style={styles.prayerCard}
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
                <ChevronDown size={20} color={Colors.light.muted} />
              ) : (
                <ChevronRight size={20} color={Colors.light.muted} />
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
                  <Text style={[styles.prayerText, { fontSize, lineHeight: fontSize * 1.375 }]}>{prayer.content}</Text>
                )}
                {prayer.source && <Text style={styles.prayerSource}>— {prayer.source}</Text>}
              </View>
            )}
          </View>
        ))}
        </ScrollView>
      </GestureDetector>
    </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight("bold", true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: "center",
    marginBottom: 8,
  },
  fontSizeButton: {
    padding: 4,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  navFontSizeControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginRight: 12,
    paddingRight: 2,
  },
  prayerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Level 3: Content Cards (Medium depth)
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  prayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
  },
  prayerContent: {
    padding: 16,
    paddingTop: 0,
  },
  prayerText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  italicText: {
    fontStyle: 'italic',
  },
  prayerSource: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: "right",
    fontStyle: "italic",
  },
  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});