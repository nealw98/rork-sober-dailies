import React, { useState, useMemo, useCallback } from 'react';
import { Platform, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Type } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import Colors from '@/constants/colors';
import { maybeAskForReviewFromDailyReflection } from '@/lib/reviewPrompt';

export default function DailyReflectionsPage() {
  const [fontSize, setFontSize] = useState(18);
  const baseFontSize = 18;
  const maxFontSize = Platform.OS === 'android' ? 34 : 30;
  
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, maxFontSize));
  };
  
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      setFontSize(baseFontSize);
    })
    .runOnJS(true), [baseFontSize]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        maybeAskForReviewFromDailyReflection().catch((error) => {
          console.warn('[reviewPrompt] Daily Reflection review prompt failed', error);
        });
      };
    }, [])
  );

  return (
    <>
      <Stack.Screen 
        options={{
          headerRight: () => (
            <View style={styles.fontSizeControls}>
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
      <GestureDetector gesture={doubleTapGesture}>
        <ScreenContainer noPadding>
          <DailyReflection fontSize={fontSize} />
        </ScreenContainer>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: Platform.OS === 'android' ? 12 : 16,
    paddingRight: 2,
    height: 44,
  },
  fontSizeButton: {
    padding: 4,
    minWidth: 28,
    height: 44,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '400',
    lineHeight: 16,
  },
});