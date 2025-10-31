import React, { useState, useMemo } from 'react';
import { Platform, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Type } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

export default function DailyReflectionsPage() {
  const [fontSize, setFontSize] = useState(16);
  const baseFontSize = 16;
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

  return (
    <ScreenContainer noPadding>
      <Stack.Screen
        options={{
          title: 'Daily Reflections',
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
        <DailyReflection fontSize={fontSize} />
      </GestureDetector>
    </ScreenContainer>
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