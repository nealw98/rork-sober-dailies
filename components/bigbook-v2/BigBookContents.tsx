// Big Book — Contents page (redesign 3.0). Reskinned table of contents for the
// full 4th edition (constants/bigbook-toc.ts): grouped Front Matter / The Big
// Book / Personal Stories / Appendices, amber theme, cover hero. Each row opens
// the right reader — text → in-app reader (onOpenText), PDF → bundled PdfReader
// (onOpenPdf). The header carries go-to-page and a UNIFIED bookmarks list that
// merges text + PDF bookmarks; both jump into the correct format at the page.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, FileText, Bookmark, Hash, X, Trash2, Search } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { BigBookCover } from '@/components/literature/literature-ui';
import { BIGBOOK_TOC, findEntryById, findEntryByPdfKey, findEntryForPage, type TocEntry } from '@/constants/bigbook-toc';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { usePdfBookmarks } from '@/hooks/use-pdf-bookmarks';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { searchBigBookPdfs } from '@/lib/bigbook-search';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const AMBER_SOFT = '#FCF0DE';
const AMBER_INK = '#B27330';
const BOOK = 'bigbook';

export function BigBookContents({ onOpenText, onOpenPdf }: {
  onOpenText: (chapterId: string, page?: number, searchTerm?: string) => void;
  onOpenPdf: (entry: TocEntry, initialPage?: number) => void;
}) {
  const router = useRouter();
  const { bookmarks: textBookmarks, deleteBookmark: deleteTextBookmark, refresh: refreshText } = useBigBookBookmarks();
  const { forBook, remove: removePdfBookmark } = usePdfBookmarks();
  const { searchContent } = useBigBookContent();
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showGoTo, setShowGoTo] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  const open = (e: TocEntry) => {
    if (e.kind === 'pdf') onOpenPdf(e);
    else if (e.chapterId) onOpenText(e.chapterId);
  };

  // Merge text + PDF bookmarks into one page-sorted list.
  const unified = useMemo(() => {
    const items = [
      ...textBookmarks.map((b) => {
        const meta = getChapterMeta(b.chapterId);
        return {
          key: `t-${b.id}`, isPdf: false,
          title: (meta?.title ?? 'Big Book').replace(/^\d+\.\s*/, ''),
          pageLabel: formatPageNumber(b.pageNumber, meta?.useRomanNumerals || false),
          sortPage: b.pageNumber,
          open: () => jump(() => onOpenText(b.chapterId, b.pageNumber)),
          del: () => deleteTextBookmark(b.id),
        };
      }),
      ...forBook(BOOK).map((b) => ({
        key: `p-${b.id}`, isPdf: true,
        title: b.title,
        pageLabel: String(b.bookPage),
        sortPage: b.bookPage,
        open: () => { const e = findEntryById(b.sectionId); if (e) jump(() => onOpenPdf(e, b.pdfPage)); },
        del: () => removePdfBookmark(b.id),
      })),
    ];
    return items.sort((a, b) => a.sortPage - b.sortPage);
  }, [textBookmarks, forBook, onOpenText, onOpenPdf, deleteTextBookmark, removePdfBookmark]);

  // Dismiss a sheet/modal before presenting a reader (avoids modal clash).
  const jump = (fn: () => void) => { setShowBookmarks(false); setShowGoTo(false); setShowSearch(false); setTimeout(fn, 300); };

  // Unified search — in-app text + the bundled PDF index. One list, each result
  // opens its own format at the matched page.
  const searchResults = useMemo(() => {
    const q = debounced.trim();
    if (q.length < 2) return [] as Array<{ key: string; isPdf: boolean; title: string; pageLabel: string; snippet: string; open: () => void }>;
    const out: Array<{ key: string; isPdf: boolean; title: string; pageLabel: string; snippet: string; open: () => void }> = [];
    for (const r of searchContent(q).slice(0, 25)) {
      const meta = getChapterMeta(r.chapterId);
      const ctx = r.matches?.[0]?.context;
      out.push({
        key: `t-${r.paragraphId}`, isPdf: false,
        title: (r.chapterTitle ?? meta?.title ?? 'Big Book').replace(/^\d+\.\s*/, ''),
        pageLabel: formatPageNumber(r.paragraph.pageNumber, meta?.useRomanNumerals || false),
        snippet: ctx ? `${ctx.before}${ctx.match}${ctx.after}` : '',
        open: () => jump(() => onOpenText(r.chapterId, r.paragraph.pageNumber, q)),
      });
    }
    for (const h of searchBigBookPdfs(q, 25)) {
      const e = findEntryByPdfKey(h.pdfKey);
      if (!e) continue;
      out.push({
        key: `p-${h.pdfKey}-${h.pdfPage}`, isPdf: true,
        title: e.title, pageLabel: h.bookPage, snippet: h.snippet,
        open: () => jump(() => onOpenPdf(e, h.pdfPage)),
      });
    }
    return out;
  }, [debounced, searchContent, onOpenText, onOpenPdf]);

  const openBookmarks = () => { refreshText(); setShowBookmarks(true); };

  const submitGoTo = () => {
    Keyboard.dismiss();
    const n = parseInt(pageInput, 10);
    setPageInput('');
    if (!Number.isFinite(n)) { setShowGoTo(false); return; }
    const entry = findEntryForPage(n);
    if (!entry) { setShowGoTo(false); return; }
    if (entry.kind === 'text' && entry.chapterId) jump(() => onOpenText(entry.chapterId!, n));
    else if (entry.kind === 'pdf') jump(() => onOpenPdf(entry, Math.max(1, n - (entry.startPage ?? n) + 1)));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerActions}>
            <Pressable onPress={() => setShowSearch(true)} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Search">
              <Search size={20} color={AMBER_INK} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={() => setShowGoTo(true)} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Go to page">
              <Hash size={20} color={AMBER_INK} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={openBookmarks} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Bookmarks">
              <Bookmark size={20} color={AMBER_INK} strokeWidth={2} fill={unified.length > 0 ? AMBER_INK : 'transparent'} />
              {unified.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unified.length}</Text></View>}
            </Pressable>
          </View>
        </View>
        <Text style={styles.title}>Alcoholics Anonymous</Text>
        <Text style={styles.sub}>Big Book · 4th edition</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[AMBER_SOFT, 'rgba(252,240,222,0)']} style={styles.hero}>
          <BigBookCover w={72} h={101} />
          <View style={styles.flex}>
            <Text style={styles.heroText}>Read the first 164 pages and appendices in the app. The later-edition forewords and the personal stories open as PDF.</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {BIGBOOK_TOC.map((g) => (
            <View key={g.label} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                {!!g.sub && <Text style={styles.groupSub}>{g.sub}</Text>}
              </View>
              {g.entries.map((e, i) => (
                <Row key={e.id} entry={e} last={i === g.entries.length - 1} onPress={() => open(e)} />
              ))}
            </View>
          ))}
          <Text style={styles.copyright}>Copyright © Alcoholics Anonymous World Services, Inc.</Text>
        </View>
      </ScrollView>

      {/* Unified bookmarks sheet */}
      <Modal visible={showBookmarks} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBookmarks(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Bookmarks</Text>
            <Pressable onPress={() => setShowBookmarks(false)} hitSlop={8} style={styles.closeBtn}><X size={18} color={c.textSecondary} strokeWidth={2} /></Pressable>
          </View>
          {unified.length === 0 ? (
            <View style={styles.empty}>
              <Bookmark size={30} color={c.textMuted} strokeWidth={1.6} />
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptyBody}>Bookmark a page in any chapter or story and it shows up here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {unified.map((b) => (
                <View key={b.key} style={styles.bmRow}>
                  <Pressable style={styles.bmMain} onPress={b.open}>
                    <View style={styles.flex}>
                      <Text style={styles.bmTitle} numberOfLines={1}>{b.title}</Text>
                      <View style={styles.bmMeta}>
                        {b.isPdf && <View style={styles.pdfTag}><Text style={styles.pdfTagText}>PDF</Text></View>}
                        <Text style={styles.bmPage}>p. {b.pageLabel}</Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} />
                  </Pressable>
                  <Pressable onPress={b.del} hitSlop={8} style={styles.bmDelete}><Trash2 size={17} color={c.textMuted} strokeWidth={2} /></Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Search — in-app text + PDF stories */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowSearch(false)}>
        <SafeAreaView style={styles.sheet} edges={['top']}>
          <View style={styles.searchBar}>
            <Search size={18} color={c.textMuted} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search the Big Book"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable onPress={() => { setQuery(''); setDebounced(''); setShowSearch(false); }} hitSlop={8}><Text style={styles.searchCancel}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {debounced.trim().length >= 2 && searchResults.length === 0 && (
              <Text style={styles.searchEmpty}>No matches for “{debounced.trim()}”.</Text>
            )}
            {searchResults.map((r) => (
              <Pressable key={r.key} onPress={r.open} style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.6 }]}>
                <View style={styles.resultHead}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                  {r.isPdf && <View style={styles.pdfTag}><Text style={styles.pdfTagText}>PDF</Text></View>}
                  <Text style={styles.resultPage}>p. {r.pageLabel}</Text>
                </View>
                {!!r.snippet && <Text style={styles.resultSnippet} numberOfLines={2}>{r.snippet}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Go to page */}
      <Modal visible={showGoTo} transparent animationType="fade" onRequestClose={() => setShowGoTo(false)}>
        <Pressable style={styles.goToBackdrop} onPress={() => { Keyboard.dismiss(); setShowGoTo(false); }}>
          <Pressable style={styles.goToCard} onPress={() => {}}>
            <Text style={styles.goToTitle}>Go to page</Text>
            <Text style={styles.goToSub}>Enter a page number (1–575).</Text>
            <TextInput
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="number-pad"
              placeholder="58"
              placeholderTextColor={c.textMuted}
              style={styles.goToInput}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submitGoTo}
            />
            <Pressable onPress={submitGoTo} style={styles.goToBtn}><Text style={styles.goToBtnText}>Go</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ entry, last, onPress }: { entry: TocEntry; last: boolean; onPress: () => void }) {
  const isPdf = entry.kind === 'pdf';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>{entry.title}</Text>
        <View style={styles.metaRow}>
          {isPdf && (
            <View style={styles.pdfTag}>
              <FileText size={10} color={AMBER_INK} strokeWidth={2.4} />
              <Text style={styles.pdfTagText}>PDF</Text>
            </View>
          )}
          <Text style={styles.rowPage}>p. {entry.page}{entry.note ? ` · ${entry.note}` : ''}</Text>
        </View>
      </View>
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: AMBER_INK, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 26, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  heroText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted },
  groupSub: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  pdfTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: AMBER_SOFT },
  pdfTagText: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.4, color: AMBER_INK },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 22, lineHeight: 15 },

  // bookmarks sheet
  sheet: { flex: 1, backgroundColor: c.background },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sheetList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  bmRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8 },
  bmMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: 15, paddingRight: 8 },
  bmTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  bmMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  bmPage: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted },
  bmDelete: { width: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36, gap: 10 },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, marginTop: 4 },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textMuted, textAlign: 'center' },

  // search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: c.text, paddingVertical: 2 },
  searchCancel: { fontFamily: fontFamily.semiBold, fontSize: 14, color: AMBER_INK },
  searchList: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  searchEmpty: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 40 },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  resultPage: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
  resultSnippet: { fontFamily: fontFamily.serif, fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: 4 },

  // go to page
  goToBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  goToCard: { width: '100%', backgroundColor: c.background, borderRadius: 18, padding: 20 },
  goToTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: c.text },
  goToSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  goToInput: { marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.semiBold, fontSize: 20, color: c.text, textAlign: 'center', backgroundColor: c.surface },
  goToBtn: { marginTop: 14, backgroundColor: AMBER_INK, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goToBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
});
