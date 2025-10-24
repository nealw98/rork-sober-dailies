/**
 * Big Book Main Entry Component
 * 
 * Checks access and routes to:
 * - BigBookFreeBrowser (no access)
 * - BigBookChapterList with modal Reader (has access)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { hasBigBookAccess } from '@/lib/bigbook-access';
import BigBookFreeBrowser from './BigBookFreeBrowser';
import { BigBookChapterList } from './BigBookChapterList';
import { BigBookReader } from './BigBookReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import Colors from '@/constants/colors';

export function BigBookMain() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [forceShowFree, setForceShowFree] = useState(false); // Temporary toggle
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
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

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // Determine which view to show
  const shouldShowFree = !hasAccess || forceShowFree;

  // Render the appropriate view with toggle button
  return (
    <View style={{ flex: 1 }}>
      {/* Show free or premium version */}
      {shouldShowFree ? (
        <BigBookFreeBrowser 
          showToggle={hasAccess}
          onToggle={() => setForceShowFree(!forceShowFree)}
          toggleLabel="Show Premium"
        />
      ) : (
        <BigBookHighlightsProvider>
          <BigBookChapterList
            onSelectChapter={handleSelectChapter}
            showToggle={hasAccess}
            onToggle={() => setForceShowFree(!forceShowFree)}
            toggleLabel="Show Free"
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
});

