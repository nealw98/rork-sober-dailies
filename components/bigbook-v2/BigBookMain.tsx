/**
 * Big Book Main Entry Component
 * 
 * Checks access and routes to:
 * - BigBookFreePDF (no access)
 * - BigBookChapterList with modal Reader (has access)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { hasBigBookAccess } from '@/lib/bigbook-access';
import { BigBookFreePDF } from './BigBookFreePDF';
import { BigBookChapterList } from './BigBookChapterList';
import { BigBookReader } from './BigBookReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import Colors from '@/constants/colors';

export function BigBookMain() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);

  // Check access on mount
  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const access = await hasBigBookAccess();
    setHasAccess(access);
  };
  
  // Handle chapter selection - open modal
  const handleSelectChapter = (chapterId: string, scrollToId?: string) => {
    console.log('[BigBookMain] handleSelectChapter:', { chapterId, scrollToId });
    setSelectedChapterId(chapterId);
    setScrollToParagraphId(scrollToId || null);
    setShowReaderModal(true);
  };
  
  // Handle closing reader modal
  const handleCloseReader = () => {
    setShowReaderModal(false);
    // Small delay before clearing state to allow modal animation to complete
    setTimeout(() => {
      setSelectedChapterId(null);
      setScrollToParagraphId(null);
    }, 300);
  };

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // No access - show free PDF link
  if (!hasAccess) {
    return <BigBookFreePDF />;
  }

  // Has access - wrap with HighlightsProvider for shared state
  return (
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
          onClose={handleCloseReader}
        />
      )}
    </BigBookHighlightsProvider>
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
});

