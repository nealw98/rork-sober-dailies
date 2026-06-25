// PDF page bookmarks (redesign 3.0). Generic over a "book" namespace so the
// 12 & 12 essays (and later the Big Book Personal Stories PDFs) can each keep
// their own page bookmarks. A bookmark pins a page within a specific essay PDF
// and remembers the BOOK page it represents (for display). Local-first; the key
// is in SYNC_KEYS so it backs up to iCloud.
import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type PdfBookmark = {
  id: string;        // `${book}:${sectionId}:${pdfPage}`
  book: string;      // namespace, e.g. 'twelve'
  sectionId: string; // which essay (section id in the book's data)
  title: string;     // essay title, for the list
  startPage: number; // the book page the essay starts on (to reopen + map)
  pdfPage: number;   // 1-based page within the PDF
  bookPage: number;  // the displayed book page (startPage + pdfPage - 1)
  createdAt: number;
};

const STORAGE_KEY = 'pdf_bookmarks_v1';
const bmId = (book: string, sectionId: string, pdfPage: number) => `${book}:${sectionId}:${pdfPage}`;

export const [PdfBookmarksProvider, usePdfBookmarks] = createContextHook(() => {
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setBookmarks(JSON.parse(stored));
      } catch (e) {
        console.warn('[pdf-bookmarks] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)).catch((e) => console.warn('[pdf-bookmarks] save failed', e));
  }, [bookmarks, loaded]);

  const isBookmarked = useCallback(
    (book: string, sectionId: string, pdfPage: number) => bookmarks.some((b) => b.id === bmId(book, sectionId, pdfPage)),
    [bookmarks],
  );

  // Add the page if it's not bookmarked, remove it if it is.
  const toggle = useCallback((bm: Omit<PdfBookmark, 'id' | 'createdAt'>) => {
    const id = bmId(bm.book, bm.sectionId, bm.pdfPage);
    setBookmarks((prev) =>
      prev.some((b) => b.id === id) ? prev.filter((b) => b.id !== id) : [{ ...bm, id, createdAt: Date.now() }, ...prev],
    );
  }, []);

  const remove = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // All bookmarks for one book, in reading order.
  const forBook = useCallback(
    (book: string) => bookmarks.filter((b) => b.book === book).sort((a, b) => a.bookPage - b.bookPage),
    [bookmarks],
  );

  return useMemo(
    () => ({ bookmarks, loaded, isBookmarked, toggle, remove, forBook }),
    [bookmarks, loaded, isBookmarked, toggle, remove, forBook],
  );
});
