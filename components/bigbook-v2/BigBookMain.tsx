/**
 * Big Book Main Entry Component
 *
 * Renders the in-app reader: chapter list + modal reader, wrapped in the
 * highlights provider. The premium/free access gate (and the PDF-upsell
 * "free browser") was removed — the full reader is always available now.
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

  // Open the reader modal on a chapter (optionally scrolling to a paragraph /
  // carrying a search term to highlight).
  const handleSelectChapter = (chapterId: string, scrollToId?: string, search?: string) => {
    setSelectedChapterId(chapterId);
    setScrollToParagraphId(scrollToId || null);
    setSearchTerm(search || null);
    setShowReaderModal(true);
  };

  const handleCloseReader = () => {
    setShowReaderModal(false);

    // Track a successful reading session and maybe ask for a review on close.
    recordLiteratureReaderOpen()
      .then(() => maybeAskForReview('literature'))
      .catch((error) => console.warn('[reviewPrompt] Literature trigger failed', error));

    // Clear after the modal close animation finishes.
    setTimeout(() => {
      setSelectedChapterId(null);
      setScrollToParagraphId(null);
      setSearchTerm(null);
    }, 300);
  };

  return (
    <BigBookHighlightsProvider>
      <View style={{ flex: 1 }}>
        <BigBookChapterList onSelectChapter={handleSelectChapter} isReaderOpen={showReaderModal} />

        {selectedChapterId && (
          <BigBookReader
            visible={showReaderModal}
            initialChapterId={selectedChapterId}
            scrollToParagraphId={scrollToParagraphId}
            searchTerm={searchTerm}
            onClose={handleCloseReader}
          />
        )}
      </View>
    </BigBookHighlightsProvider>
  );
}
