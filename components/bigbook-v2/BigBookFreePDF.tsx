/**
 * Big Book Free PDF Component
 * 
 * Shown to users without access (not grandfathered, no subscription).
 * Provides link to official AA.org PDF, similar to 12x12 implementation.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

const BIG_BOOK_PDF_URL = 'https://www.aa.org/sites/default/files/literature/Big_Book_1-164.pdf';

export function BigBookFreePDF() {
  const handleOpenPDF = async () => {
    try {
      const supported = await Linking.canOpenURL(BIG_BOOK_PDF_URL);
      if (supported) {
        await Linking.openURL(BIG_BOOK_PDF_URL);
      } else {
        console.error('[BigBookFreePDF] Cannot open URL:', BIG_BOOK_PDF_URL);
      }
    } catch (error) {
      console.error('[BigBookFreePDF] Error opening PDF:', error);
    }
  };

  const handleSubscribe = () => {
    // Navigate to store/subscription page
    router.push('/(tabs)/store');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
        pointerEvents="none"
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {Platform.OS !== 'android' && (
            <Text style={styles.title}>Alcoholics Anonymous</Text>
          )}
          <Text style={styles.subtitle}>The Big Book</Text>
          <Text style={styles.description}>
            The basic text of Alcoholics Anonymous
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Read the Big Book</Text>
          <Text style={styles.sectionText}>
            Access the official Big Book (first 164 pages) from AA World Services.
          </Text>
          
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleOpenPDF}
            activeOpacity={0.7}
          >
            <ExternalLink size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.pdfButtonText}>Open Big Book PDF</Text>
          </TouchableOpacity>
          
          <Text style={styles.pdfNote}>
            Opens in your device's PDF viewer
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Big Book Reader</Text>
          <Text style={styles.sectionText}>
            Subscribe to unlock the premium Big Book Reader with advanced features:
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Text highlighting in 4 colors</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Add notes to highlights</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Bookmark important passages</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Search within the text</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Navigate by page number</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>View all your highlights and bookmarks</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            activeOpacity={0.7}
          >
            <Text style={styles.subscribeButtonText}>Subscribe to Unlock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Copyright © 1939, 1955, 1976 by Alcoholics Anonymous World Services, Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  pdfButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  pdfNote: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border || '#E5E7EB',
    marginVertical: 24,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 20,
    color: Colors.light.tint,
    marginRight: 12,
    marginTop: -2,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
  },
  subscribeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border || '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

