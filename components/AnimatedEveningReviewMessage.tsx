import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface AnimatedEveningReviewMessageProps {
  weeklyStreak: number;
  visible: boolean;
}

const AnimatedEveningReviewMessage: React.FC<AnimatedEveningReviewMessageProps> = ({
  weeklyStreak,
  visible,
}) => {
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && weeklyStreak > 0) {
      // First: Simple fade in for "3 days this week"
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Then: Pop animation for "keep it going!"
        Animated.parallel([
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(messageScale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Single pop with elastic bounce effect for "keep it going!"
          Animated.sequence([
            Animated.timing(messageScale, {
              toValue: 1.1,
              duration: 400,
              easing: Easing.elastic(1),
              useNativeDriver: true,
            }),
            Animated.timing(messageScale, {
              toValue: 1.0,
              duration: 200,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    } else {
      // Reset animations when not visible
      progressOpacity.setValue(0);
      messageOpacity.setValue(0);
      messageScale.setValue(0);
    }
  }, [visible, weeklyStreak, progressOpacity, messageOpacity, messageScale]);

  if (!visible || weeklyStreak === 0) return null;

  return (
    <View style={styles.container}>
      {/* "3 days this week" - simple fade in */}
      <Animated.Text
        style={[
          styles.progressText,
          {
            opacity: progressOpacity,
          },
        ]}
      >
        {weeklyStreak} {weeklyStreak === 1 ? 'day' : 'days'} this week
      </Animated.Text>

      {/* "Keep it Going!" with pop animation */}
      <Animated.Text
        style={[
          styles.messageText,
          {
            opacity: messageOpacity,
            transform: [{ scale: messageScale }],
          },
        ]}
      >
        Keep it Going!
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('400'), // Normal weight
    color: Colors.light.text, // Black color
    textAlign: 'center',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 17, // 1 point bigger
    fontWeight: adjustFontWeight('700'), // Bold
    color: Colors.light.recognition.gradientStart, // Purple celebration color
    textAlign: 'center',
  },
});

export default AnimatedEveningReviewMessage;
