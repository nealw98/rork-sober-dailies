/**
 * Big Book Main Entry Component
 * 
 * Renders the full Big Book chapter list and reader.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { BigBookChapterList } from './BigBookChapterList';
import { BigBookReader } from './BigBookReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import { recordLiteratureReaderOpen, maybeAskForReview } from '@/lib/reviewPrompt';

export function BigBookMain() {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);
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
    
    // Track successful reading session and maybe ask for review
    // Triggered on close = after they've (hopefully) enjoyed the content
    recordLiteratureReaderOpen()
      .then(() => maybeAskForReview('literature'))
      .catch((error) => console.warn('[reviewPrompt] Literature trigger failed', error));
    
    // Small delay before clearing state to allow modal animation to complete
    setTimeout(() => {
      setSelectedChapterId(null);
      setScrollToParagraphId(null);
      setSearchTerm(null);
    }, 300);
  };

  return (
    <View style={{ flex: 1 }}>
      <BigBookHighlightsProvider>
        <BigBookChapterList
          onSelectChapter={handleSelectChapter}
          isReaderOpen={showReaderModal}
        />

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
    </View>
  );
}
