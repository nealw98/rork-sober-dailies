/**
 * Big Book Subscription Modal
 * 
 * Shown on first visit to the Big Book reader.
 * Prompts users to subscribe or continue with free access.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { IS_TESTFLIGHT_PREVIEW } from '@/constants/featureFlags';

interface BigBookSubscriptionModalProps {
  visible: boolean;
  onSubscribe: () => void;
  onNotNow: () => void;
}

export function BigBookSubscriptionModal({
  visible,
  onSubscribe,
  onNotNow,
}: BigBookSubscriptionModalProps) {
  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onNotNow}
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
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onNotNow}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={Colors.light.muted} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="gem" size={36} color={Colors.light.tint} />
            </View>

            <Text style={styles.title}>
              {IS_TESTFLIGHT_PREVIEW
                ? 'Unlock Premium Big Book Reader — 🧪 TESTFLIGHT PREVIEW'
                : 'Unlock Premium Big Book Reader'}
            </Text>
            <Text style={styles.subtitle}>
              {IS_TESTFLIGHT_PREVIEW
                ? 'In the full release, these features will require a subscription. For testing, tap below to preview all premium features.'
                : 'Subscribe to access advanced features for a deeper study of the Big Book'}
            </Text>

            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>✨</Text>
                <Text style={styles.featureText}>Highlight text in 4 colors</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>🔖</Text>
                <Text style={styles.featureText}>Bookmark important passages with notes</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>🔍</Text>
                <Text style={styles.featureText}>Search within the text</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureBullet}>📄</Text>
                <Text style={styles.featureText}>Navigate by page number</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={onSubscribe}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4A90E2', '#5CB85C']}
                  style={styles.subscribeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text style={styles.subscribeButtonText}>
                  {IS_TESTFLIGHT_PREVIEW ? 'Preview Premium Features' : 'Subscribe Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notNowButton}
                onPress={onNotNow}
                activeOpacity={0.7}
              >
                <Text style={styles.notNowButtonText}>
                  {IS_TESTFLIGHT_PREVIEW ? 'Back to Free Version' : 'Not Now'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.freeAccessNote}>
              {IS_TESTFLIGHT_PREVIEW
                ? 'Full subscription features will be available at launch'
                : 'You can still access the Big Book PDF for free'}
            </Text>
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureBullet: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 12,
  },
  subscribeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  subscribeButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
  },
  notNowButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
  },
  notNowButtonText: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: adjustFontWeight('600'),
  },
  freeAccessNote: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

