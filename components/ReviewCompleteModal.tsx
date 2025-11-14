import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ReviewCompleteModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ReviewCompleteModal({
  visible,
  onClose,
}: ReviewCompleteModalProps) {
  const [animatedValue] = useState(new Animated.Value(0));
  const [iconScale] = useState(new Animated.Value(1));

  // Animate modal entrance and icon celebration
  useEffect(() => {
    if (visible) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      // Trigger icon animation after a short delay
      setTimeout(() => {
        // Icon bounce animation
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
          Animated.timing(iconScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }, 500);
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Reset animations
      iconScale.setValue(1);
    }
  }, [visible, animatedValue, iconScale]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <Animated.View 
            style={[
              styles.modal,
              {
                transform: [
                  {
                    scale: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: animatedValue,
              },
            ]}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalGradient}
            >
              <View style={styles.modalContent}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                  <CheckCircle size={48} color="white" />
                </Animated.View>
                
                <Text style={styles.title}>Review Complete!</Text>
                
                <Text style={styles.message}>
                  Your nightly review has been saved.
                </Text>
                
                <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    maxWidth: 300,
    width: '100%',
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  doneButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});



