/**
 * Big Book Free Browser
 * 
 * Shows chapter navigation with links to AA.org PDF.
 * Similar to TwelveAndTwelveBrowser for consistent UX.
 */

import React, { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import { bigBookFreeData, BigBookFreeSection, BigBookFreeCategory } from '@/constants/bigbook-free';
import { BigBookStoreProvider, useBigBookStore } from '@/hooks/use-bigbook-store';
import { adjustFontWeight } from '@/constants/fonts';
import PDFViewer from '@/components/PDFViewer';
import { BigBookSubscriptionModal } from './BigBookSubscriptionModal';
import { IS_TESTFLIGHT_PREVIEW } from '@/constants/featureFlags';
import { enableBigBookTestflightBypass } from '@/lib/bigbook-access';
import { useFocusEffect } from 'expo-router';

const SUBSCRIPTION_MODAL_KEY = '@sober_dailies:bigbook_subscription_modal_shown';
const SUBSCRIPTION_ACCEPTED_KEY = '@sober_dailies:bigbook_subscription_accepted';

const SectionItem = ({ 
  section, 
  categoryId, 
  onOpenPDF 
}: { 
  section: BigBookFreeSection; 
  categoryId: string; 
  onOpenPDF: (url: string, title: string) => void;
}) => {
  const { addToRecent } = useBigBookStore();

  const handlePress = () => {
    addToRecent(section.id, section.title, section.url);
    onOpenPDF(section.url, section.title);
  };

  return (
    <TouchableOpacity 
      style={styles.sectionItem} 
      onPress={handlePress} 
      testID={`section-${section.id}`}
    >
      <View style={styles.sectionInfo}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.pageRange && (
            <Text style={styles.pageRange}>pp. {section.pageRange}</Text>
          )}
        </View>
        {section.description && (
          <Text style={styles.sectionDescription}>{section.description}</Text>
        )}
      </View>
      <ExternalLink size={16} color={Colors.light.muted} />
    </TouchableOpacity>
  );
};

const CategorySection = ({ 
  category, 
  onOpenPDF,
  defaultExpanded = false,
}: { 
  category: BigBookFreeCategory; 
  onOpenPDF: (url: string, title: string) => void;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setExpanded(!expanded)}
        testID={`category-${category.id}`}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        {expanded ? (
          <ChevronDown size={20} color={Colors.light.muted} />
        ) : (
          <ChevronRight size={20} color={Colors.light.muted} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionsContainer}>
          {category.sections.map((section) => (
            <SectionItem 
              key={section.id} 
              section={section} 
              categoryId={category.id} 
              onOpenPDF={onOpenPDF} 
            />
          ))}
        </View>
      )}
    </View>
  );
};

const UpgradeBanner = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity 
      style={styles.upgradeBanner} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#4A90E2', '#5CB85C']}
        style={styles.upgradeBannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={styles.upgradeBannerContent}>
        <View style={styles.upgradeBannerIcon}>
          <FontAwesome5 name="gem" size={22} color="#fff" />
        </View>
        <View style={styles.upgradeBannerText}>
          <Text style={styles.upgradeBannerTitle}>Unlock Premium Features</Text>
          <Text style={styles.upgradeBannerSubtitle}>
            Highlights, notes, bookmarks, and more
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255, 255, 255, 0.8)" />
      </View>
    </TouchableOpacity>
  );
};

interface BigBookFreeBrowserContentProps {
  showToggle?: boolean;
  onToggle?: () => void;
  toggleLabel?: string;
  isPremiumUnlocked?: boolean;
}

function BigBookFreeBrowserContent({ showToggle, onToggle, toggleLabel, isPremiumUnlocked = false }: BigBookFreeBrowserContentProps) {
  const [pdfViewerVisible, setPdfViewerVisible] = useState<boolean>(false);
  const [currentPdf, setCurrentPdf] = useState<{ url: string; title: string } | null>(null);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      checkSubscriptionModal();
      return () => {};
    }, [])
  );

  // Removed safety timeout now that modal is stable

  const checkSubscriptionModal = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(SUBSCRIPTION_MODAL_KEY);
      if (!hasShown) {
        // Show modal on first visit
        setSubscriptionModalVisible(true);
      }
    } catch (error) {
      console.error('[BigBookFreeBrowser] Error checking subscription modal:', error);
    }
  };

  const handleSubscriptionModalDismiss = async () => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_MODAL_KEY, 'true');
      setSubscriptionModalVisible(false);
    } catch (error) {
      console.error('[BigBookFreeBrowser] Error saving subscription modal state:', error);
    }
  };

  const handleSubscribe = async () => {
    await handleSubscriptionModalDismiss();
    // Mark that user has accepted the subscription offer
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_ACCEPTED_KEY, 'true');
    } catch (error) {
      console.error('[BigBookFreeBrowser] Error saving subscription accepted state:', error);
    }
    if (IS_TESTFLIGHT_PREVIEW) {
      enableBigBookTestflightBypass();
    } else {
      router.push('/(tabs)/store');
    }
  };

  const handleNotNow = async () => {
    await handleSubscriptionModalDismiss();
  };

  const handleUpgradeBanner = async () => {
    // Check if user has already accepted the subscription offer
    try {
      const hasAccepted = await AsyncStorage.getItem(SUBSCRIPTION_ACCEPTED_KEY);
      if (hasAccepted) {
        // User already accepted, go directly to store/premium
        if (IS_TESTFLIGHT_PREVIEW) {
          enableBigBookTestflightBypass();
        } else {
          router.push('/(tabs)/store');
        }
      } else {
        // First time or user clicked "Not Now" before, show modal
        setSubscriptionModalVisible(true);
      }
    } catch (error) {
      console.error('[BigBookFreeBrowser] Error checking subscription accepted state:', error);
      // On error, show modal to be safe
      setSubscriptionModalVisible(true);
    }
  };

  //

  const handleOpenPDF = (url: string, title: string) => {
    setCurrentPdf({ url, title });
    setPdfViewerVisible(true);
  };

  const handleClosePDF = () => {
    setPdfViewerVisible(false);
    setCurrentPdf(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradients.mainThreeColor}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.header}>
            {Platform.OS !== 'android' && (
              <Text style={styles.title}>Alcoholics Anonymous</Text>
            )}
            
            {/* TEMPORARY: Toggle button for testing */}
            {showToggle && onToggle && toggleLabel && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={onToggle}
              >
                <Text style={styles.toggleButtonText}>{toggleLabel}</Text>
              </TouchableOpacity>
            )}
            
            {/* Subtitle removed per request */}
            <Text style={styles.description}>
              Tap any chapter to open the official PDF from AA World Services.
            </Text>
            {/* Test button removed; Unlock Premium banner opens subscription modal */}
          </View>
          
          {/* Upgrade Banner */}
          {!isPremiumUnlocked && <UpgradeBanner onPress={handleUpgradeBanner} />}
          
          {/* Main Chapters - Expanded by default */}
          {bigBookFreeData.map((category) => (
            <CategorySection 
              key={category.id} 
              category={category} 
              onOpenPDF={handleOpenPDF}
              defaultExpanded={category.id === 'main-chapters'}
            />
          ))}
          
          <View style={styles.copyrightContainer}>
            <Text style={styles.copyrightText}>
              Copyright © 1939, 1955, 1976 by Alcoholics Anonymous World Services, Inc. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* PDF Viewer Modal */}
      <Modal
        visible={pdfViewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClosePDF}
      >
        {currentPdf && (
          <PDFViewer
            url={currentPdf.url}
            title={currentPdf.title}
            onClose={handleClosePDF}
          />
        )}
      </Modal>

      {/* Subscription Modal */}
      <BigBookSubscriptionModal
        visible={subscriptionModalVisible}
        onSubscribe={handleSubscribe}
        onNotNow={handleNotNow}
      />

      {/* Test modal removed */}
    </View>
  );
}

export default function BigBookFreeBrowser({
  showToggle,
  onToggle,
  toggleLabel,
  isPremiumUnlocked,
}: {
  showToggle?: boolean;
  onToggle?: () => void;
  toggleLabel?: string;
  isPremiumUnlocked?: boolean;
}) {
  return (
    <BigBookStoreProvider>
      <BigBookFreeBrowserContent
        showToggle={showToggle}
        onToggle={onToggle}
        toggleLabel={toggleLabel}
        isPremiumUnlocked={isPremiumUnlocked}
      />
    </BigBookStoreProvider>
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
  header: {
    padding: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    marginBottom: 4,
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
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  upgradeBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  upgradeBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  upgradeBannerIcon: {
    marginRight: 12,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
    color: '#fff',
    marginBottom: 2,
  },
  upgradeBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  sectionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    flex: 1,
  },
  pageRange: {
    fontSize: 13,
    color: Colors.light.muted,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  testButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
  },
  toggleButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

