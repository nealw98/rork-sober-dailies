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
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface OTASnackbarProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export default function OTASnackbar({ visible, onDismiss }: OTASnackbarProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null);

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

      // Auto-hide after 5 seconds
      autoHideTimer.current = setTimeout(() => {
        onDismiss();
      }, 5000);
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

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [visible, translateY, opacity, onDismiss]);

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
            <Text style={styles.message}>Update downloaded. Restart app to apply.</Text>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={Colors.light.background} />
            </TouchableOpacity>
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
  dismissButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
