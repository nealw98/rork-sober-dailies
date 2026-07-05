// Native PDF reader (redesign 3.0) for the bundled, offline A.A. essays.
// Renders a require()'d PDF asset via react-native-pdf (smooth native zoom/
// paging on iOS + Android). expo-asset resolves the bundled module to a local
// file URI. Shows BOOK pages (not the PDF's own 1..n) by mapping pdfPage →
// startPage + pdfPage - 1, and lets you bookmark the current page. Presented
// full-screen in a Modal by the caller.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import Pdf from 'react-native-pdf';
import { X, Bookmark } from 'lucide-react-native';
import { colors, fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { usePdfBookmarks } from '@/hooks/use-pdf-bookmarks';
import { useReadingTime } from '@/hooks/useReadingTime';

// bookmark-namespace → display name for analytics
const BOOK_NAMES: Record<string, string> = { bigbook: 'Big Book', twelve: '12 & 12' };

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

  useEffect(() => {
    let alive = true;
    setUri(null);
    setFailed(false);
    setPdfPage(initialPage ?? 1);
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
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex]} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={c.textSecondary} strokeWidth={2} />
          </Pressable>
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

        <View style={styles.body}>
          {failed ? (
            <Text style={styles.msg}>This document couldn’t be opened.</Text>
          ) : !uri ? (
            <ActivityIndicator color={accent} style={{ marginTop: 48 }} />
          ) : (
            <Pdf
              ref={pdfRef}
              source={{ uri, cache: true }}
              onLoadComplete={(n) => {
                setPageCount(n);
                // Jump AFTER load so the page offset is exact (otherwise the
                // page's running header gets clipped under our header bar).
                if (initialPage && initialPage > 1) setTimeout(() => pdfRef.current?.setPage(initialPage), 0);
              }}
              onPageChanged={(p) => setPdfPage(p)}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.display, fontSize: 17, color: c.text, letterSpacing: -0.2 },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.divider },
  pageLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.textSecondary },
  bmBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1 },
  bmText: { fontFamily: fontFamily.semiBold, fontSize: 12 },

  body: { flex: 1, backgroundColor: isDark ? c.background : '#E6E1D7' },
  pdf: { flex: 1, width: '100%', height: '100%', backgroundColor: isDark ? c.background : '#E6E1D7' },
  msg: { fontFamily: fontFamily.regular, fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 48 },
});
};
