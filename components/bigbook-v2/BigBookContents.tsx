// Big Book — Contents page (redesign 3.0). Reskinned table of contents for the
// full 4th edition (constants/bigbook-toc.ts): grouped Front Matter / The Big
// Book / Personal Stories / Appendices, amber theme, cover hero. Each row opens
// the right reader — text → in-app reader (onOpenText), PDF → bundled PdfReader
// (onOpenPdf). The header carries go-to-page and a UNIFIED bookmarks list that
// merges text + PDF bookmarks; both jump into the correct format at the page.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Keyboard } from 'react-native';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Bookmark, Hash, X, Trash2, Search, Highlighter } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { Image } from 'expo-image';
import { FindCard } from '@/components/literature/literature-ui';

// Real cover scan (1290×1700) — shared with the Literature home shelf.
const BIG_BOOK_COVER = require('@/assets/images/big-book_cover.webp');
import { BIGBOOK_TOC, findEntryById, findEntryByPdfKey, findEntryForPage, type TocEntry } from '@/constants/bigbook-toc';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { BigBookHighlightsList } from './BigBookHighlightsList';
import { usePdfBookmarks } from '@/hooks/use-pdf-bookmarks';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { searchBigBookPdfs } from '@/lib/pdf-search';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const BOOK = 'bigbook';

export function BigBookContents({ onOpenText, onOpenPdf, onOpenTextAtParagraph }: {
  onOpenText: (chapterId: string, page?: number, searchTerm?: string, paragraphId?: string) => void;
  onOpenPdf: (entry: TocEntry, initialPage?: number) => void;
  onOpenTextAtParagraph: (chapterId: string, paragraphId: string) => void;
}) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  // Steel Navy — Big Book accent (brightens automatically on dark).
  const AMBER_SOFT = colors.steelSoft;
  const AMBER_INK = colors.steelDark;
  const { bookmarks: textBookmarks, deleteBookmark: deleteTextBookmark, refresh: refreshText } = useBigBookBookmarks();
  const { forBook, remove: removePdfBookmark } = usePdfBookmarks();
  const { searchContent } = useBigBookContent();
  const { highlights } = useBigBookHighlights();
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showGoTo, setShowGoTo] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

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
  const jump = (fn: () => void) => { setShowBookmarks(false); setShowHighlights(false); setShowGoTo(false); setShowSearch(false); setTimeout(fn, 300); };

  // Unified search — in-app text + the bundled PDF index. One list, each result
  // opens its own format at the matched page.
  type SearchRow = { key: string; isPdf: boolean; title: string; pageLabel: string; before: string; match: string; after: string; open: () => void };
  const searchResults = useMemo(() => {
    const q = debounced.trim();
    const out: SearchRow[] = [];
    // A plain page number is a search too — offer the jump above the text hits.
    if (/^\d{1,3}$/.test(q)) {
      const n = parseInt(q, 10);
      const entry = findEntryForPage(n);
      if (entry) {
        out.push({
          key: `goto-${n}`, isPdf: entry.kind === 'pdf', title: `Go to page ${n}`, pageLabel: String(n), before: '', match: '', after: entry.title,
          open: () => {
            if (entry.kind === 'text' && entry.chapterId) jump(() => onOpenText(entry.chapterId!, n));
            else if (entry.kind === 'pdf') jump(() => onOpenPdf(entry, Math.max(1, n - (entry.startPage ?? n) + 1)));
          },
        });
      }
    }
    if (q.length < 2) return out;
    for (const r of searchContent(q).slice(0, 25)) {
      const meta = getChapterMeta(r.chapterId);
      const ctx = r.matches?.[0]?.context;
      out.push({
        key: `t-${r.paragraphId}`, isPdf: false,
        title: (r.chapterTitle ?? meta?.title ?? 'Big Book').replace(/^\d+\.\s*/, ''),
        pageLabel: formatPageNumber(r.paragraph.pageNumber, meta?.useRomanNumerals || false),
        before: ctx?.before ?? '', match: ctx?.match ?? '', after: ctx?.after ?? '',
        open: () => jump(() => onOpenText(r.chapterId, r.paragraph.pageNumber, q, r.paragraphId)),
      });
    }
    for (const h of searchBigBookPdfs(q, 25)) {
      const e = findEntryByPdfKey(h.pdfKey);
      if (!e) continue;
      out.push({
        key: `p-${h.pdfKey}-${h.pdfPage}`, isPdf: true,
        title: e.title, pageLabel: h.bookPage, before: h.before, match: h.match, after: h.after,
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
        <BackButton onPress={() => router.back()} />
        <Pressable onPress={() => setSizeSheetOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Text size" style={styles.aaBtn}>
          <Text style={styles.aaLabel}>aA</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title block: cover + book title together, minimal subtitle. */}
        <LinearGradient colors={[AMBER_SOFT, 'rgba(252,240,222,0)']} style={styles.hero}>
          <Image source={BIG_BOOK_COVER} style={styles.heroCover} contentFit="cover" />
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>Alcoholics Anonymous</Text>
            <Text style={styles.heroSub}>The Big Book · 4th edition</Text>
          </View>
        </LinearGradient>

        {/* Find tools — presented as features, not header utilities */}
        <View style={styles.findRow}>
          <FindCard Icon={Search} label="Search" accent={AMBER_INK} soft={AMBER_SOFT} onPress={() => setShowSearch(true)} />
          <FindCard Icon={Hash} label="Go to page" accent={AMBER_INK} soft={AMBER_SOFT} onPress={() => setShowGoTo(true)} />
          <FindCard Icon={Bookmark} label="Bookmarks" count={unified.length} accent={AMBER_INK} soft={AMBER_SOFT} onPress={openBookmarks} />
          <FindCard Icon={Highlighter} label="Highlights" count={highlights.length} accent={AMBER_INK} soft={AMBER_SOFT} onPress={() => setShowHighlights(true)} />
        </View>

        <View style={styles.body}>
          {BIGBOOK_TOC.map((g) => (
            <View key={g.label} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                {!!g.sub && <Text style={styles.groupSub}>{g.sub}</Text>}
              </View>
              {g.entries.map((e, i) => {
                // Every entry takes the 12 & 12 shape: the title as the hero and
                // its page metadata in a caption underneath, with a chevron to
                // open it. Chapters add a numeral and carry a page RANGE
                // (start–end, ending at the next chapter or the book's 164); the
                // chapter number is NOT repeated in the caption. Front matter,
                // stories and appendices have no numeral and a single page.
                const m = e.title.match(/^(\d+)\.\s+(.*)$/);
                const note = e.note ? ` · ${e.note.toUpperCase()}` : '';
                let caption = `PAGE ${e.page.toUpperCase()}`;
                if (m) {
                  const next = g.entries[i + 1];
                  const end = next ? parseInt(next.page, 10) - 1 : 164;
                  caption = Number.isFinite(end) ? `PAGES ${e.page}–${end}` : `PAGE ${e.page}`;
                }
                return (
                  <Row
                    key={e.id}
                    num={m?.[1]}
                    title={m ? m[2] : e.title}
                    caption={caption + note}
                    last={i === g.entries.length - 1}
                    onPress={() => open(e)}
                  />
                );
              })}
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
        <KeyboardModalScope>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <SafeAreaView style={styles.sheet} edges={['top']}>
            <View style={styles.searchHeader}>
              <Text style={styles.sheetTitle}>Search</Text>
              <Pressable onPress={() => { setQuery(''); setDebounced(''); setShowSearch(false); }} hitSlop={8} style={styles.closeBtn}>
                <X size={18} color={c.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            <View style={styles.searchBarWrap}>
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
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}><X size={16} color={c.textMuted} strokeWidth={2} /></Pressable>
                )}
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {searchResults.length === 0 && debounced.trim().length < 2 ? (
                <Text style={styles.searchHint}>Search a word, a phrase, or a page number — across every chapter, story, and appendix.</Text>
              ) : searchResults.length === 0 ? (
                <Text style={styles.searchEmpty}>No matches for “{debounced.trim()}”.</Text>
              ) : (
                <>
                  <Text style={styles.searchCount}>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</Text>
                  {searchResults.map((r) => (
                    <Pressable key={r.key} onPress={r.open} style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.7 }]}>
                      <View style={styles.resultBar} />
                      <View style={styles.flex}>
                        <View style={styles.resultHead}>
                          <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                          {r.isPdf && <View style={styles.pdfTag}><Text style={styles.pdfTagText}>PDF</Text></View>}
                        </View>
                        <Text style={styles.resultSnippet} numberOfLines={2}>
                          {r.before}<Text style={styles.resultMatch}>{r.match}</Text>{r.after}
                        </Text>
                        <Text style={styles.resultMeta}>Page {r.pageLabel}</Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
        </KeyboardModalScope>
      </Modal>

      {/* Highlights — jump straight to the highlighted paragraph in the reader */}
      <BigBookHighlightsList
        visible={showHighlights}
        onClose={() => setShowHighlights(false)}
        onNavigateToHighlight={(chapterId, paragraphId) => jump(() => onOpenTextAtParagraph(chapterId, paragraphId))}
      />

      {/* Go to page */}
      <Modal visible={showGoTo} transparent animationType="fade" onRequestClose={() => setShowGoTo(false)}>
        <KeyboardModalScope>
        <Pressable style={styles.goToBackdrop} onPress={() => { Keyboard.dismiss(); setShowGoTo(false); }}>
          <Pressable style={styles.goToCard} onPress={() => {}}>
            <Text style={styles.goToTitle}>Go to page</Text>
            <Text style={styles.goToSub}>Enter a page number (1–575).</Text>
            <TextInput
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="number-pad"
              style={styles.goToInput}
              autoFocus
            />
            <Pressable onPress={submitGoTo} style={styles.goToBtn}><Text style={styles.goToBtnText}>Go</Text></Pressable>
          </Pressable>
        </Pressable>
        </KeyboardModalScope>
      </Modal>

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

// One row shape for the whole Contents, matching the 12 & 12: the title gets the
// line, its page metadata follows in a caption underneath, and a chevron opens
// it. Chapters add a numeral column in front; everything else starts at the
// margin.
function Row({ num, title, caption, last, onPress }: { num?: string; title: string; caption?: string; last: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  // Entry text rides the shared "Aa" reading scale, like the readers.
  const { readingSize: size, readingLineHeight: lineHeight } = useReadingSize();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={num !== undefined ? `Chapter ${num}. ${title}` : title}
    >
      {/* Numeral rides the title's line; column sized for two digits (10, 11). */}
      {num !== undefined && <Text numberOfLines={1} style={[styles.rowNum, { fontSize: size * 1.2, lineHeight, width: size * 1.8 }]}>{num}</Text>}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { fontSize: size, lineHeight }]} numberOfLines={2}>{title}</Text>
        {!!caption && <Text style={styles.rowCaption}>{caption}</Text>}
      </View>
      <ChevronRight size={16} color={c.textMuted} style={styles.rowChevron} />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const AMBER_SOFT = colors.steelSoft;
  const AMBER_INK = colors.steelDark;
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aaBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  aaLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  heroCover: {
    width: 88, height: 116, borderRadius: 4,
    shadowColor: '#1F3A4D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 9, elevation: 5,
  },
  heroTitle: { fontFamily: readerSerif, fontWeight: '700', fontSize: 23, lineHeight: 28, color: c.text },
  heroSub: { fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textSecondary, marginTop: 5 },

  findRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted },
  groupSub: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  // Chapter numeral column — navy serif, sized to sit with the serif titles.
  rowNum: { fontFamily: readerSerif, fontWeight: '700', fontSize: 20, lineHeight: 22, color: AMBER_INK, width: 26, textAlign: 'left' },
  rowTitle: { fontFamily: readerSerif, fontSize: 16.5, lineHeight: 22, color: c.text },
  // Caption under a chapter title: "PAGES 151–164".
  rowCaption: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.9, color: c.textMuted, marginTop: 5 },
  rowChevron: { alignSelf: 'center' },
  pdfTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: AMBER_SOFT },
  pdfTagText: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.4, color: AMBER_INK },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 22, lineHeight: 15 },

  // bookmarks sheet
  sheet: { flex: 1, backgroundColor: c.background },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sheetList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  bmRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8, ...darkCard },
  bmMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: 15, paddingRight: 8 },
  bmTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  bmMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  bmPage: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted },
  bmDelete: { width: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36, gap: 10 },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, marginTop: 4 },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textMuted, textAlign: 'center' },

  // search
  searchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: c.text, paddingVertical: 0 },
  searchList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  searchHint: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: 'center', marginTop: 48, paddingHorizontal: 40 },
  searchEmpty: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 40 },
  searchCount: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 10, marginLeft: 2 },
  resultCard: { flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 8, overflow: 'hidden', ...darkCard },
  resultBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: AMBER_INK },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6 },
  resultTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: AMBER_INK, flexShrink: 1 },
  resultSnippet: { fontFamily: readerSerif, fontSize: 14.5, lineHeight: 21, color: c.text, marginTop: 5, paddingLeft: 6 },
  resultMatch: { backgroundColor: isDark ? 'rgba(79,179,172,0.25)' : '#FCE9A8', color: c.text },
  resultMeta: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 6, paddingLeft: 6 },

  // go to page
  goToBackdrop: { flex: 1, backgroundColor: isDark ? c.overlay : 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  goToCard: { width: '100%', backgroundColor: isDark ? c.surface : c.background, borderRadius: 18, padding: 20, ...(isDark ? { borderWidth: 1, ...darkCard } : null) },
  goToTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: c.text },
  goToSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  goToInput: { marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.semiBold, fontSize: 20, color: c.text, textAlign: 'center', backgroundColor: c.surface },
  goToBtn: { marginTop: 14, backgroundColor: AMBER_INK, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goToBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
});
};
