/**
 * Big Book Main Entry Component
 *
 * Renders the Contents page (full 4th-ed. TOC) plus two readers:
 *  • text entries → the in-app BigBookReader (highlights/bookmarks/search)
 *  • PDF entries  → the bundled PdfReader (book-page mapping + bookmarks)
 * Exposes open-at-page handlers so the Contents header's go-to-page and the
 * unified bookmarks list can jump into either format at a specific page.
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
import { colors } from '@/constants/designTokens';

const PDF_ACCENT = colors.steelDark; // Steel Navy ink for the Big Book

type OpenPdf = { id: string; title: string; pdfKey: string; startPage: number; initialPage?: number };

export function BigBookMain() {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [pdf, setPdf] = useState<OpenPdf | null>(null);

  // text entry → open the in-app reader, optionally scrolled to a page and
  // highlighting a search term.
  const openText = (id: string, page?: number, term?: string) => {
    setChapterId(id);
    setScrollToPage(page ?? null);
    setSearchTerm(term ?? null);
    setShowReader(true);
  };

  // pdf entry → open the bundled PDF, optionally at a page
  const openPdf = (entry: TocEntry, initialPage?: number) => {
    if (!entry.pdfKey) return;
    setPdf({ id: entry.id, title: entry.title, pdfKey: entry.pdfKey, startPage: entry.startPage ?? 0, initialPage });
  };

  const handleCloseReader = () => {
    setShowReader(false);
    recordLiteratureReaderOpen()
      .then(() => maybeAskForReview('literature'))
      .catch((error) => console.warn('[reviewPrompt] Literature trigger failed', error));
    setTimeout(() => { setChapterId(null); setScrollToPage(null); setSearchTerm(null); }, 300);
  };

  return (
    <BigBookHighlightsProvider>
      <View style={{ flex: 1 }}>
        <BigBookContents onOpenText={openText} onOpenPdf={openPdf} />

        {chapterId && (
          <BigBookReader
            visible={showReader}
            initialChapterId={chapterId}
            scrollToPage={scrollToPage}
            searchTerm={searchTerm}
            onClose={handleCloseReader}
          />
        )}

        <Modal visible={!!pdf} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPdf(null)}>
          {pdf && BIGBOOK_PDFS[pdf.pdfKey] != null && (
            <PdfReader
              assetModule={BIGBOOK_PDFS[pdf.pdfKey]}
              title={pdf.title}
              book="bigbook"
              sectionId={pdf.id}
              startPage={pdf.startPage}
              initialPage={pdf.initialPage}
              accent={PDF_ACCENT}
              onClose={() => setPdf(null)}
            />
          )}
        </Modal>
      </View>
    </BigBookHighlightsProvider>
  );
}
