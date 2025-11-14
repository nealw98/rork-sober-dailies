/**
 * Big Book Main Entry Component
 * 
 * Checks access and routes to:
 * - BigBookFreeBrowser (no access)
 * - BigBookChapterList with modal Reader (has access)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { hasBigBookAccess, onBigBookBypassChange, isBigBookBypassEnabled } from '@/lib/bigbook-access';
import { IS_TESTFLIGHT_PREVIEW } from '@/constants/featureFlags';
import BigBookFreeBrowser from './BigBookFreeBrowser';
import { BigBookChapterList } from './BigBookChapterList';
import { BigBookReader } from './BigBookReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import Colors from '@/constants/colors';
import { useNavigation } from 'expo-router';

export function BigBookMain() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [forceShowFree, setForceShowFree] = useState(false); // Default to premium view when unlocked
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const navigation = useNavigation();
  const previousHasAccess = useRef<boolean | null>(null);

  // Check access on mount
  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    if (isBigBookBypassEnabled()) {
      setHasAccess(true);
      return;
    }
    const access = await hasBigBookAccess();
    setHasAccess(access);
  };
  
  // Handle chapter selection - open modal
  const handleSelectChapter = (chapterId: string, scrollToId?: string, search?: string) => {
    console.log('[BigBookMain] handleSelectChapter:', { chapterId, scrollToId, search });
    setSelectedChapterId(chapterId);
    setScrollToParagraphId(scrollToId || null);
    setSearchTerm(search || null);
    setShowReaderModal(true);
  };
  
  // Handle closing reader modal
  const handleCloseReader = () => {
    setShowReaderModal(false);
    // Small delay before clearing state to allow modal animation to complete
    setTimeout(() => {
      setSelectedChapterId(null);
      setScrollToParagraphId(null);
      setSearchTerm(null);
    }, 300);
  };

  // Subscribe to TestFlight bypass changes
  useEffect(() => {
    const unsubscribe = onBigBookBypassChange(() => {
      // Clear any forced free view and enable access immediately
      setForceShowFree(false);
      setHasAccess(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (previousHasAccess.current === false && hasAccess) {
      setForceShowFree(false);
    }
    previousHasAccess.current = hasAccess;
  }, [hasAccess]);

  // Determine which view to show
  const shouldShowFree = !hasAccess || forceShowFree;

  const handleShowFree = useCallback(() => {
    setForceShowFree(true);
  }, []);

  const handleShowPremium = useCallback(() => {
    setForceShowFree(false);
  }, []);

  useEffect(() => {
    if (hasAccess === null) {
      return;
    }

    const showGoToFreeButton = hasAccess && !shouldShowFree;
    const showGoToPremiumButton = hasAccess && shouldShowFree;
    navigation.setOptions({
      headerRight: showGoToFreeButton
        ? () => (
            <TouchableOpacity
              style={styles.headerFreeButton}
              onPress={handleShowFree}
              activeOpacity={0.7}
            >
              <Text style={styles.headerFreeButtonText}>Go to Free</Text>
            </TouchableOpacity>
          )
        : showGoToPremiumButton
        ? () => (
            <TouchableOpacity
              style={styles.headerFreeButton}
              onPress={handleShowPremium}
              activeOpacity={0.7}
            >
              <Text style={styles.headerFreeButtonText}>Go to Premium</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [navigation, shouldShowFree, hasAccess, handleShowFree, handleShowPremium]);

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // Render the appropriate view
  return (
    <View style={{ flex: 1 }}>
      {/* Show free or premium version */}
      {shouldShowFree ? (
        <BigBookFreeBrowser isPremiumUnlocked={!!hasAccess} />
      ) : (
        <BigBookHighlightsProvider>
          <BigBookChapterList
            onSelectChapter={handleSelectChapter}
          />
          
          {/* Reader Modal */}
          {selectedChapterId && (
            <BigBookReader
              visible={showReaderModal}
              initialChapterId={selectedChapterId}
              scrollToParagraphId={scrollToParagraphId}
              searchTerm={searchTerm}
              onClose={handleCloseReader}
            />
          )}
        </BigBookHighlightsProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.muted,
  },
  headerFreeButton: {
    marginRight: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  headerFreeButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
});

