/**
 * Big Book Main Entry Component
 *
 * Renders the Contents page (full 4th-ed. TOC) plus two readers:
 *  • text entries → the in-app BigBookReader (highlights/bookmarks/search)
 *  • PDF entries  → the bundled PdfReader (book-page mapping + bookmarks)
 * No access gate — the full reader is always available.
 */

import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { BigBookContents } from './BigBookContents';
import { BigBookReader } from './BigBookReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import PdfReader from '@/components/PdfReader';
import { BIGBOOK_PDFS } from '@/constants/bigbook-pdfs';
import type { TocEntry } from '@/constants/bigbook-toc';
import { recordLiteratureReaderOpen, maybeAskForReview } from '@/lib/reviewPrompt';

const PDF_ACCENT = '#B27330'; // amber-ink for the Big Book

export function BigBookMain() {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [pdf, setPdf] = useState<TocEntry | null>(null);

  // Open the text reader on a chapter (optionally scrolling to a paragraph /
  // carrying a search term to highlight).
  const handleSelectChapter = (chapterId: string, scrollToId?: string, search?: string) => {
    setSelectedChapterId(chapterId);
    setScrollToParagraphId(scrollToId || null);
    setSearchTerm(search || null);
    setShowReaderModal(true);
  };

  const handleCloseReader = () => {
    setShowReaderModal(false);
    recordLiteratureReaderOpen()
      .then(() => maybeAskForReview('literature'))
      .catch((error) => console.warn('[reviewPrompt] Literature trigger failed', error));
    setTimeout(() => {
      setSelectedChapterId(null);
      setScrollToParagraphId(null);
      setSearchTerm(null);
    }, 300);
  };

  return (
    <BigBookHighlightsProvider>
      <View style={{ flex: 1 }}>
        <BigBookContents onSelectText={handleSelectChapter} onSelectPdf={setPdf} />

        {selectedChapterId && (
          <BigBookReader
            visible={showReaderModal}
            initialChapterId={selectedChapterId}
            scrollToParagraphId={scrollToParagraphId}
            searchTerm={searchTerm}
            onClose={handleCloseReader}
          />
        )}

        <Modal visible={!!pdf} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPdf(null)}>
          {pdf?.pdfKey && BIGBOOK_PDFS[pdf.pdfKey] != null && (
            <PdfReader
              assetModule={BIGBOOK_PDFS[pdf.pdfKey]}
              title={pdf.title}
              book="bigbook"
              sectionId={pdf.id}
              startPage={pdf.startPage ?? 0}
              accent={PDF_ACCENT}
              onClose={() => setPdf(null)}
            />
          )}
        </Modal>
      </View>
    </BigBookHighlightsProvider>
  );
}
