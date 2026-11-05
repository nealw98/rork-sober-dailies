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
import { useLayoutMode } from '@/hooks/useLayoutMode';
import ListDetailLayout from '@/components/layout/ListDetailLayout';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import { logEvent } from '@/lib/analytics';
import { colors } from '@/constants/designTokens';

const PDF_ACCENT = colors.steelDark; // Steel Navy ink for the Big Book
// Contents pane width on expanded layouts — matches Today/Literature.
const BB_LIST_WIDTH = 360;

type OpenPdf = { id: string; title: string; pdfKey: string; startPage: number; initialPage?: number };

export function BigBookMain() {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);
  const [scrollToParagraphId, setScrollToParagraphId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [pdf, setPdf] = useState<OpenPdf | null>(null);

  // 3.5 wide layouts: on expanded widths the text reader docks in a pane
  // beside the Contents (handoff Screen 3) instead of presenting full-screen.
  // The same chapter state drives both, so folding mid-read hands the chapter
  // to the full-screen Modal and unfolding hands it back to the pane.
  const expanded = useLayoutMode() === 'expanded';
  // What the pane shows before anything is picked: the book's first chapter.
  const paneChapterId = chapterId ?? 'chapter-1';
  // The chapter actually displayed (the reader's Prev/Next moves it without
  // touching chapterId) — keeps the Contents selection tint in step.
  const [liveChapterId, setLiveChapterId] = useState<string | null>(null);

  // text entry → open the in-app reader, optionally scrolled to a page and
  // highlighting a search term. A search-result tap also passes the matched
  // paragraph so the reader centers the term itself, not just the page top.
  const openText = (id: string, page?: number, term?: string, paragraphId?: string) => {
    logEvent('literature_opened', { book: 'Big Book', format: 'text', section: id });
    setChapterId(id);
    setLiveChapterId(id);
    setScrollToPage(page ?? null);
    setScrollToParagraphId(paragraphId ?? null);
    setSearchTerm(term ?? null);
    setShowReader(true);
  };

  // highlight nav → open the reader at the highlight's chapter and scroll
  // to its paragraph.
  const openTextAtParagraph = (id: string, paragraphId: string) => {
    setChapterId(id);
    setLiveChapterId(id);
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

  const contents = (
    <BigBookContents
      onOpenText={openText}
      onOpenPdf={openPdf}
      onOpenTextAtParagraph={openTextAtParagraph}
      selectedId={expanded ? (liveChapterId ?? paneChapterId) : undefined}
    />
  );

  return (
    <BigBookHighlightsProvider>
      <View style={{ flex: 1 }}>
        {expanded ? (
          <ListDetailLayout
            listWidth={BB_LIST_WIDTH}
            list={<View style={{ flex: 1 }}>{contents}</View>}
            detail={
              <BigBookHtmlReader
                embedded
                visible
                // liveChapterId first, so a fold/unfold resumes at the chapter
                // the OTHER reader was last showing (loadChapter no-ops when
                // the id is already displayed, so this never forces a reload).
                initialChapterId={liveChapterId ?? paneChapterId}
                scrollToPage={scrollToPage}
                scrollToParagraphId={scrollToParagraphId}
                searchTerm={searchTerm}
                onClose={handleCloseReader}
                onChapterChange={setLiveChapterId}
              />
            }
          />
        ) : (
          contents
        )}

        {/* Compact (and a fold mid-read): the full-screen Modal reader. On
            expanded the pane owns the chapter, so the Modal stays out. */}
        {!expanded && chapterId && (
          <BigBookHtmlReader
            visible={showReader}
            initialChapterId={liveChapterId ?? chapterId}
            scrollToPage={scrollToPage}
            scrollToParagraphId={scrollToParagraphId}
            searchTerm={searchTerm}
            onClose={handleCloseReader}
            onChapterChange={setLiveChapterId}
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
