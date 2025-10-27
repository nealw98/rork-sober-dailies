import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Gem } from 'lucide-react-native';
import { adjustFontWeight } from '@/constants/fonts';

interface PremiumComingSoonModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'premium' | 'pickAnother';
}

export function PremiumComingSoonModal({ visible, onClose, mode = 'premium' }: PremiumComingSoonModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(74, 144, 226, 0.15)', 'rgba(92, 184, 92, 0.15)']}
            style={styles.backgroundGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={styles.content}>
            <View style={styles.premiumIconWrap}>
              {mode === 'premium' ? (
                <Gem size={28} color={Colors.light.tint} />
              ) : (
                <Text style={styles.constructionEmoji}>🚧</Text>
              )}
            </View>
            <Text style={styles.title}>
              {mode === 'premium' ? 'Premium Sponsors' : 'Under Construction'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'premium'
                ? 'Additional AI Sponsors will be available as part of our premium features and are still in development.'
                : "This sponsor isn't available yet. Please pick another one for now."}
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {mode === 'premium'
                  ? 'These specialized sponsors offer unique perspectives and personalities tailored to different recovery styles.'
                  : 'These specialized sponsors will offer unique perspectives and personalities tailored to different recovery styles.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4A90E2', '#5CB85C']}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.primaryButtonText}>
                {mode === 'premium' ? 'Unlock All' : 'Got It'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 520,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  premiumIconWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
  },
});


