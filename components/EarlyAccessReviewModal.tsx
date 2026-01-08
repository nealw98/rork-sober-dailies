/**
 * Early Access Review Request Modal
 * 
 * One-time modal requesting App Store reviews from early access users.
 * Shows up to 3 times with 7-day intervals if user taps "Maybe Later".
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { adjustFontWeight } from '@/constants/fonts';
import { recordModalShown, recordUserReviewed, openAppStoreReview } from '@/lib/reviewModal';

const { width: screenWidth } = Dimensions.get('window');

interface EarlyAccessReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EarlyAccessReviewModal({ visible, onClose }: EarlyAccessReviewModalProps) {
  
  const handleMaybeLater = async () => {
    await recordModalShown();
    onClose();
  };
  
  const handleLeaveReview = async () => {
    await recordUserReviewed();
    await openAppStoreReview();
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleMaybeLater}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>You Have Lifetime Free Access</Text>
          </View>
          
          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.bodyText}>
              As one of our earliest users, you've had exclusive early access to Sober Dailies 2.0 - including a completely redesigned interface, enhanced Big Book reader, and four new AI Sponsors.
            </Text>
            
            <Text style={styles.bodyText}>
              When we launch version 2.0 as a paid app ($4.99), you'll continue receiving all updates free, forever.
            </Text>
            
            <Text style={styles.emphasisText}>
              We really need your help.
            </Text>
            
            <Text style={styles.bodyText}>
              If you've found these tools valuable, would you leave a review? It really helps people find the app. And if you've encountered any bugs, please report them via the About/Support page.
            </Text>
            
            <Text style={styles.thankYouText}>
              Thank you for being part of our community.
            </Text>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLeaveReview}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Leave a Review</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleMaybeLater}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: screenWidth - 48,
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    backgroundColor: '#3D8B8B',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  headerText: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
    textAlign: 'center',
  },
  body: {
    padding: 24,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  emphasisText: {
    fontSize: 17,
    fontWeight: adjustFontWeight('600'),
    color: '#3D8B8B',
    marginBottom: 12,
  },
  thankYouText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#555',
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3D8B8B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: adjustFontWeight('500'),
  },
});

