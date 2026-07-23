// Native PDF reader (redesign 3.0) for the bundled, offline A.A. essays.
// Renders a require()'d PDF asset via react-native-pdf (smooth native zoom/
// paging on iOS + Android). expo-asset resolves the bundled module to a local
// file URI. Shows BOOK pages (not the PDF's own 1..n) by mapping pdfPage →
// startPage + pdfPage - 1, and lets you bookmark the current page. Presented
// full-screen in a Modal by the caller.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import Pdf from 'react-native-pdf';
import { ChevronLeft, Bookmark } from 'lucide-react-native';
import { colors, fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { usePdfBookmarks } from '@/hooks/use-pdf-bookmarks';
import { useReadingTime } from '@/hooks/useReadingTime';

// bookmark-namespace → display name for analytics
const BOOK_NAMES: Record<string, string> = { bigbook: 'Big Book', twelve: '12 & 12' };

// PDF pages are fixed-layout — the only way to read them bigger is landscape.
// The app is otherwise portrait-locked (see app/_layout.tsx), so this reader
// unlocks rotation while open and re-locks portrait on close. Guarded require:
// on binaries without the native module (≤126) the calls reject and the reader
// simply stays portrait.
let ScreenOrientation: any = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}

export default function PdfReader({
  assetModule, title, book, sectionId, startPage, initialPage, accent = colors.primary, onClose,
}: {
  assetModule: number;
  title: string;
  book: string;          // bookmark namespace, e.g. 'twelve'
  sectionId: string;     // which essay (for bookmarks)
  startPage: number;     // book page this essay starts on
  initialPage?: number;  // open at this PDF page (e.g. from a bookmark)
  accent?: string;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const { isBookmarked, toggle } = usePdfBookmarks();
  useReadingTime(BOOK_NAMES[book] ?? book, { format: 'pdf', section: sectionId });
  const pdfRef = useRef<any>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pdfPage, setPdfPage] = useState(initialPage ?? 1);
  const [pageCount, setPageCount] = useState(0);

  // Rotation: react-native-pdf computes its fit scale once at mount and never
  // re-fits when the view resizes — rotating left the portrait-sized page
  // floating in margins. Remount it (key) on orientation change with fit-width
  // in landscape, stashing the current page at the flip so the remount's
  // onLoadComplete can restore it (onPageChanged isn't trustworthy mid-remount).
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const currentPageRef = useRef(initialPage ?? 1);
  const restorePageRef = useRef(initialPage ?? 1);
  const prevLandscapeRef = useRef(landscape);
  if (prevLandscapeRef.current !== landscape) {
    prevLandscapeRef.current = landscape;
    restorePageRef.current = currentPageRef.current;
  }

  useEffect(() => {
    if (!ScreenOrientation) return;
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setUri(null);
    setFailed(false);
    setPdfPage(initialPage ?? 1);
    currentPageRef.current = initialPage ?? 1;
    restorePageRef.current = initialPage ?? 1;
    setPageCount(0);
    (async () => {
      try {
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync(); // copies the bundled asset to a readable file
        if (alive) setUri(asset.localUri ?? asset.uri);
      } catch (e) {
        console.warn('[pdf] asset resolve failed', e);
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [assetModule, initialPage]);

  const bookPage = startPage + pdfPage - 1;
  const marked = isBookmarked(book, sectionId, pdfPage);

  const onToggleBookmark = () => {
    toggle({ book, sectionId, title, startPage, pdfPage, bookPage });
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {/* Horizontal insets apply to the chrome only (back button / title /
            bookmark clear of the landscape notch) — NOT the screen, so the
            PDF itself runs edge-to-edge and landscape actually reads bigger. */}
        <SafeAreaView edges={['left', 'right']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Close">
              <ChevronLeft size={22} color={c.text} strokeWidth={2} />
            </Pressable>
            <Text style={[styles.title, styles.flex]} numberOfLines={1}>{title}</Text>
          </View>

          {/* Action row — live BOOK page + bookmark toggle */}
          <View style={styles.actionRow}>
            <Text style={styles.pageLabel}>{uri && startPage > 0 ? `Page ${bookPage}` : ' '}</Text>
            <Pressable
              onPress={onToggleBookmark}
              disabled={!uri}
              hitSlop={8}
              style={[styles.bmBtn, marked ? { backgroundColor: accent, borderColor: accent } : { borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel={marked ? 'Remove bookmark' : 'Bookmark this page'}
            >
              <Bookmark size={14} color={marked ? '#fff' : accent} fill={marked ? '#fff' : 'transparent'} strokeWidth={2} />
              <Text style={[styles.bmText, { color: marked ? '#fff' : accent }]}>{marked ? 'Saved' : 'Bookmark'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.body}>
          {failed ? (
            <Text style={styles.msg}>This document couldn’t be opened.</Text>
          ) : !uri ? (
            <ActivityIndicator color={accent} style={{ marginTop: 48 }} />
          ) : (
            <Pdf
              ref={pdfRef}
              key={landscape ? 'landscape' : 'portrait'}
              source={{ uri, cache: true }}
              // NO `page` prop here: passing it makes the native mount route
              // through goToDestination + a scale re-application that runs
              // before the fit scale settles, leaving landscape rendered at
              // the wrong scale (side margins). Restore happens after load
              // via setPage instead — see onLoadComplete.
              // Landscape exists to read bigger: fill the width (0). Portrait
              // keeps the whole-page fit (2), matching the old behavior.
              fitPolicy={landscape ? 0 : 2}
              onLoadComplete={(n) => {
                setPageCount(n);
                // Jump AFTER load so the page offset is exact (otherwise the
                // page's running header gets clipped under our header bar).
                // A single setPage can lose the race against the view's own
                // scroll-to-page-1 (which used to reset rotation to page 1),
                // so re-assert until onPageChanged confirms it stuck.
                const target = restorePageRef.current;
                if (target > 1) {
                  let attempts = 0;
                  const assertPage = () => {
                    if (currentPageRef.current === target || attempts >= 6) return;
                    attempts += 1;
                    pdfRef.current?.setPage(target);
                    setTimeout(assertPage, 150);
                  };
                  setTimeout(assertPage, 0);
                }
              }}
              onPageChanged={(p) => { currentPageRef.current = p; setPdfPage(p); }}
              onError={(e) => { console.warn('[pdf] render error', e); setFailed(true); }}
              style={styles.pdf}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  // Header matches the Big Book text reader: back chevron + displayBold title.
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 20, letterSpacing: -0.4, color: c.text },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.divider },
  pageLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.textSecondary },
  bmBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1 },
  bmText: { fontFamily: fontFamily.semiBold, fontSize: 12 },

  body: { flex: 1, backgroundColor: isDark ? c.background : '#E6E1D7' },
  pdf: { flex: 1, width: '100%', height: '100%', backgroundColor: isDark ? c.background : '#E6E1D7' },
  msg: { fontFamily: fontFamily.regular, fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 48 },
});
};
