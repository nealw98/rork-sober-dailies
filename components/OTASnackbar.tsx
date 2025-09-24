import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface OTASnackbarProps {
  visible: boolean;
  onDismiss: () => void;
  onRestart: () => void;
}

const { width } = Dimensions.get('window');

export default function OTASnackbar({ visible, onDismiss, onRestart }: OTASnackbarProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show snackbar
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide snackbar
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.snackbar}>
          <View style={styles.content}>
            <Text style={styles.message}>An update is ready. Restart the app to apply.</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={onRestart}
                activeOpacity={0.7}
              >
                <Text style={styles.restartButtonText}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  snackbar: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 8 : 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.background,
    fontWeight: adjustFontWeight('500'),
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  restartButtonText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
  },
  laterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  laterButtonText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: adjustFontWeight('500'),
  },
});
