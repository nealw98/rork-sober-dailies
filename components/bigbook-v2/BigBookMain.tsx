/**
 * Big Book Main Entry Component
 *
 * Renders the Contents page (full 4th-ed. TOC) plus two readers:
 *  • text entries → the in-app BigBookHtmlReader (highlights/bookmarks/search)
 *  • PDF entries  → the bundled PdfReader (book-page mapping + bookmarks)
 * Exposes open-at-page handlers so the Contents header's go-to-page and the
 * unified bookmarks list can jump into either format at a specific page.
 */

import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { BigBookContents } from './BigBookContents';
import { BigBookHtmlReader } from './BigBookHtmlReader';
import { BigBookHighlightsProvider } from '@/hooks/use-bigbook-highlights';
import PdfReader from '@/components/PdfReader';
import { BIGBOOK_PDFS } from '@/constants/bigbook-pdfs';
import type { TocEntry } from '@/constants/bigbook-toc';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import { logEvent } from '@/lib/analytics';
import { colors } from '@/constants/designTokens';

const PDF_ACCENT = colors.steelDark; // Steel Navy ink for the Big Book

type OpenPdf = { id: string; title: string; pdfKey: string; startPage: number; initialPage?: number };

export function BigBookMain() {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [pdf, setPdf] = useState<OpenPdf | null>(null);

  // text entry → open the in-app reader, optionally scrolled to a page and
  // highlighting a search term.
  const openText = (id: string, page?: number, term?: string) => {
    logEvent('literature_opened', { book: 'Big Book', format: 'text', section: id });
    setChapterId(id);
    setScrollToPage(page ?? null);
    setScrollToParagraphId(null);
    setSearchTerm(term ?? null);
    setShowReader(true);
  };

  // highlight nav → open the reader at the highlight's chapter and scroll
  // to its paragraph.
  const openTextAtParagraph = (id: string, paragraphId: string) => {
    setChapterId(id);
    setScrollToPage(null);
    setSearchTerm(null);
    setScrollToParagraphId(paragraphId);
    setShowReader(true);
  };

  // pdf entry → open the bundled PDF, optionally at a page
  const openPdf = (entry: TocEntry, initialPage?: number) => {
    if (!entry.pdfKey) return;
    logEvent('literature_opened', { book: 'Big Book', format: 'pdf', section: entry.id });
    setPdf({ id: entry.id, title: entry.title, pdfKey: entry.pdfKey, startPage: entry.startPage ?? 0, initialPage });
  };

  const handleCloseReader = () => {
    setShowReader(false);
    // Review trigger: finishing a Big Book reading session.
    maybeAskForReview('literature').catch((error) => console.warn('[reviewPrompt] Literature trigger failed', error));
    setTimeout(() => { setChapterId(null); setScrollToPage(null); setScrollToParagraphId(null); setSearchTerm(null); }, 300);
  };

  return (
    <BigBookHighlightsProvider>
      <View style={{ flex: 1 }}>
        <BigBookContents onOpenText={openText} onOpenPdf={openPdf} onOpenTextAtParagraph={openTextAtParagraph} />

        {chapterId && (
          <BigBookHtmlReader
            visible={showReader}
            initialChapterId={chapterId}
            scrollToPage={scrollToPage}
            scrollToParagraphId={scrollToParagraphId}
            searchTerm={searchTerm}
            onClose={handleCloseReader}
          />
        )}

        {/* supportedOrientations: iOS Modals stay portrait-only without it,
            even though PdfReader unlocks rotation — landscape = bigger PDF text. */}
        <Modal visible={!!pdf} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPdf(null)} supportedOrientations={['portrait', 'landscape']}>
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
