import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface AnimatedRecognitionMessageProps {
  message: string;
  visible: boolean;
  icon?: React.ReactNode;
}

const AnimatedRecognitionMessage: React.FC<AnimatedRecognitionMessageProps> = ({
  message,
  visible,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Initial entrance animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Pop animation after entrance (similar to evening review checkbox)
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 400,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 200,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]).start();

        // Icon bounce animation
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(iconScale, {
              toValue: 1.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(iconScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }, 300);
      });
    } else {
      // Reset animations when not visible
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      iconScale.setValue(1);
    }
  }, [visible, scaleAnim, opacityAnim, iconScale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[Colors.light.recognition.gradientStart, Colors.light.recognition.gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {icon && (
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: iconScale }] },
              ]}
            >
              {icon}
            </Animated.View>
          )}
          <Text style={styles.message}>{message}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  message: {
    color: Colors.light.recognition.text,
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    textAlign: 'center',
  },
});

export default AnimatedRecognitionMessage;
