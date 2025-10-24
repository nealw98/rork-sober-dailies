import React, { useState, useMemo } from 'react';
import { Platform, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import Colors from '@/constants/colors';

export default function DailyReflectionsPage() {
  const [fontSize, setFontSize] = useState(16);
  const baseFontSize = 16;
  
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 28));
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
                <Text style={styles.fontSizeButtonText}>A-</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={increaseFontSize}
                style={styles.fontSizeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.fontSizeButtonText}>A+</Text>
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
    gap: 16,
    marginRight: Platform.OS === 'android' ? 8 : 12,
    paddingRight: 4,
  },
  fontSizeButton: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '400',
  },
});