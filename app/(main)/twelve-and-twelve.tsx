// Twelve & Twelve (redesign 3.0): teal theme, a tinted band carrying the cover,
// title and find tools, then the grouped Intro / Twelve Steps / Twelve
// Traditions list. Step and Tradition rows lead with a pale numeral and put the
// Step's own words on the row (title + page ride above as an eyebrow); front
// matter stays a plain title + page. Every row opens the official A.A. essay as
// a bundled, offline PDF — real BOOK pages, per-page bookmarks.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Keyboard } from 'react-native';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Bookmark, Trash2, X, Search, Hash } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { logEvent } from '@/lib/analytics';
import PdfReader from '@/components/PdfReader';
import { Image } from 'expo-image';
import { FindRow } from '@/components/literature/literature-ui';

// Real cover scan (1290×1700) — shared with the Literature home shelf.
const TWELVE_COVER = require('@/assets/images/12x12_cover.webp');
import { twelveAndTwelveData } from '@/constants/twelve-and-twelve';
import { TWELVE_PDFS } from '@/constants/twelve-and-twelve-pdfs';
import { searchTwelvePdfs } from '@/lib/pdf-search';
import { usePdfBookmarks, type PdfBookmark } from '@/hooks/use-pdf-bookmarks';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const BOOK = 'twelve';

type Section = { id: string; title: string; url: string; description?: string; pageNumber?: string };
type OpenPdf = { id: string; title: string; startPage: number; initialPage?: number };

const parsePage = (s?: string) => {
  const n = parseInt((s ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

// Flat section lookups for search + go-to-page.
const SECTIONS: Section[] = twelveAndTwelveData.flatMap((g) => g.sections as Section[]);
const findSectionById = (id: string) => SECTIONS.find((s) => s.id === id);
const RANGED = SECTIONS.map((s) => ({ s, start: parsePage(s.pageNumber) }))
  .filter((x) => x.start > 0)
  .sort((a, b) => a.start - b.start);
// "24 essays" in the hero — the Steps and Traditions, not the front matter.
const ESSAY_COUNT = twelveAndTwelveData
  .filter((g) => g.id !== 'intro')
  .reduce((n, g) => n + g.sections.length, 0);

function findSectionForPage(page: number): Section | undefined {
  for (let i = 0; i < RANGED.length; i++) {
    const start = RANGED[i].start;
    const end = i + 1 < RANGED.length ? RANGED[i + 1].start - 1 : start + 50;
    if (page >= start && page <= end) return RANGED[i].s;
  }
  return undefined;
}

export default function TwelveAndTwelveScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('12 Steps & 12 Traditions');
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  // Teal — 12 & 12 accent (brightens automatically on dark).
  const LAV_SOFT = colors.primarySoft;
  const TT_INK = colors.primaryDark;
  // The same tint at zero alpha, so the title gradient dissolves into the page
  // without drifting through another hue. (Soft is a hex in light, rgba in dark.)
  const LAV_FADE = LAV_SOFT.startsWith('rgba')
    ? LAV_SOFT.replace(/[\d.]+\s*\)$/, '0)')
    : `${LAV_SOFT}00`;
  const { forBook, remove } = usePdfBookmarks();
  const [pdf, setPdf] = useState<OpenPdf | null>(null);

  // Analytics: one site covers every way a section opens (row, bookmark, search, go-to).
  useEffect(() => {
    if (pdf) logEvent('literature_opened', { book: '12 & 12', format: 'pdf', section: pdf.id });
  }, [pdf]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGoTo, setShowGoTo] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pageInput, setPageInput] = useState('');
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 220); return () => clearTimeout(t); }, [query]);

  const bookmarks = forBook(BOOK);

  // Dismiss any modal before presenting the reader (avoids modal clash).
  const jump = (fn: () => void) => { setShowBookmarks(false); setShowSearch(false); setShowGoTo(false); setTimeout(fn, 300); };

  // A live query swaps the list for results, in place — and the bookmark
  // circle does the same with its own list. Nothing slides up from the bottom.
  const searching = query.trim().length > 0;
  const [panel, setPanel] = useState<null | 'bookmarks'>(null);
  const onQueryChange = (next: string) => { setQuery(next); if (next) setPanel(null); };

  const openBookmark = (b: PdfBookmark) => jump(() => setPdf({ id: b.sectionId, title: b.title, startPage: b.startPage, initialPage: b.pdfPage }));

  const searchResults = useMemo(() => {
    const q = debounced.trim();
    type Row = { key: string; title: string; pageLabel: string; before: string; match: string; after: string; open: () => void };
    const out: Row[] = [];
    // A plain page number is a search too — offer the jump above the text hits.
    if (/^\d{1,3}$/.test(q)) {
      const n = parseInt(q, 10);
      const s = findSectionForPage(n);
      if (s) {
        const start = parsePage(s.pageNumber);
        out.push({
          key: `goto-${n}`, title: `Go to page ${n}`, pageLabel: String(n), before: '', match: '', after: s.title,
          open: () => jump(() => setPdf({ id: s.id, title: s.title, startPage: start, initialPage: Math.max(1, n - start + 1) })),
        });
      }
    }
    if (q.length < 2) return out;
    for (const h of searchTwelvePdfs(q, 30)) {
      const s = findSectionById(h.pdfKey);
      if (!s) continue;
      out.push({
        key: `${h.pdfKey}-${h.pdfPage}`, title: s.title, pageLabel: h.bookPage, before: h.before, match: h.match, after: h.after,
        open: () => jump(() => setPdf({ id: s.id, title: s.title, startPage: parsePage(s.pageNumber), initialPage: h.pdfPage })),
      });
    }
    return out;
  }, [debounced]);

  const submitGoTo = () => {
    Keyboard.dismiss();
    const n = parseInt(pageInput, 10);
    setPageInput('');
    if (!Number.isFinite(n)) { setShowGoTo(false); return; }
    const s = findSectionForPage(n);
    if (!s) { setShowGoTo(false); return; }
    const start = parsePage(s.pageNumber);
    jump(() => setPdf({ id: s.id, title: s.title, startPage: start, initialPage: Math.max(1, n - start + 1) }));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Pressable onPress={() => setSizeSheetOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Text size" style={styles.aaBtn}>
          <Text style={styles.aaLabel}>aA</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title block: cover + book title on a tint that fades out — same
            treatment as the Big Book contents page. */}
        <LinearGradient colors={[LAV_SOFT, LAV_FADE]} style={styles.hero}>
          <Image source={TWELVE_COVER} style={styles.heroCover} contentFit="cover" />
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>Twelve & Twelve</Text>
            <Text style={styles.heroSub}>Steps and Traditions</Text>
            <Text style={styles.heroMeta}>{ESSAY_COUNT} essays</Text>
          </View>
        </LinearGradient>

        {/* Find tools — soft-filled cards on the page, as on the Big Book page */}
        <View style={styles.findRow}>
          <FindRow
            accent={TT_INK}
            query={query}
            onQueryChange={onQueryChange}
            onBookmarks={() => { setQuery(''); setPanel((cur) => (cur ? null : 'bookmarks')); }}
            bookmarkCount={bookmarks.length}
            bookmarksOpen={panel === 'bookmarks'}
          />
        </View>

        {/* Typing replaces the list with results, in place — the field lives on
            the page, so there is no search modal to open. */}
        {panel === 'bookmarks' ? (
          <View style={styles.body}>
            {bookmarks.length === 0 ? (
              <Text style={styles.searchEmpty}>No bookmarks yet. Open an essay and tap “Bookmark” to save a page.</Text>
            ) : (
              bookmarks.map((b) => (
                <View key={b.id} style={styles.bmRow}>
                  <Pressable style={styles.bmRowMain} onPress={() => openBookmark(b)} accessibilityRole="button">
                    <View style={styles.flex}>
                      <Text style={styles.bmRowTitle}>{b.title}</Text>
                      <Text style={styles.bmRowPage}>p. {b.bookPage}</Text>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => remove(b.id)} hitSlop={8} style={styles.bmDelete} accessibilityRole="button" accessibilityLabel="Remove bookmark">
                    <Trash2 size={17} color={c.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : searching ? (
          <View style={styles.body}>
            {searchResults.length === 0 ? (
              <Text style={styles.searchEmpty}>
                {debounced.trim().length < 2 ? 'Keep typing — or enter a page number.' : `No matches for \u201C${debounced.trim()}\u201D.`}
              </Text>
            ) : (
              <>
                <Text style={styles.searchCount}>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</Text>
                {searchResults.map((r) => (
                  <Pressable key={r.key} onPress={r.open} style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.7 }]}>
                    <View style={styles.resultBar} />
                    <View style={styles.flex}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                      {!!r.match && (
                        <Text style={styles.resultSnippet} numberOfLines={2}>{r.before}<Text style={styles.resultMatch}>{r.match}</Text>{r.after}</Text>
                      )}
                      <Text style={styles.resultMeta}>Page {r.pageLabel}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        ) : (
        <View style={styles.body}>
          {twelveAndTwelveData.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>{group.title.toUpperCase()}</Text>
              {(group.sections as Section[]).map((s, i) => (
                <TTRow
                  key={s.id}
                  section={s}
                  numbered={group.id !== 'intro'}
                  last={i === group.sections.length - 1}
                  onOpen={() => setPdf({ id: s.id, title: s.title, startPage: parsePage(s.pageNumber) })}
                />
              ))}
            </View>
          ))}
          <Text style={styles.copyright}>Copyright © 1952, 1953, 1981 by Alcoholics Anonymous World Services, Inc.</Text>
        </View>
        )}
      </ScrollView>

      {/* PDF reader. supportedOrientations: iOS Modals stay portrait-only
          without it, even though PdfReader unlocks rotation — landscape =
          bigger PDF text. */}
      <Modal visible={!!pdf} animationType="slide" onRequestClose={() => setPdf(null)} presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape']}>
        {pdf && TWELVE_PDFS[pdf.id] != null && (
          <PdfReader
            assetModule={TWELVE_PDFS[pdf.id]}
            title={pdf.title}
            book={BOOK}
            sectionId={pdf.id}
            startPage={pdf.startPage}
            initialPage={pdf.initialPage}
            accent={TT_INK}
            onClose={() => setPdf(null)}
          />
        )}
      </Modal>

      {/* Search */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowSearch(false)}>
        <KeyboardModalScope>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <SafeAreaView style={styles.sheet} edges={['top']}>
            <View style={styles.searchHeader}>
              <Text style={styles.sheetTitle}>Search</Text>
              <Pressable onPress={() => { setQuery(''); setDebounced(''); setShowSearch(false); }} hitSlop={8} style={styles.closeBtn}><X size={18} color={c.textSecondary} strokeWidth={2} /></Pressable>
            </View>
            <View style={styles.searchBarWrap}>
              <View style={styles.searchBar}>
                <Search size={18} color={c.textMuted} strokeWidth={2} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search the Twelve & Twelve" placeholderTextColor={c.textMuted} style={styles.searchInput} autoFocus autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
                {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><X size={16} color={c.textMuted} strokeWidth={2} /></Pressable>}
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.searchList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {searchResults.length === 0 && debounced.trim().length < 2 ? (
                <Text style={styles.searchHint}>Search a word, a phrase, or a page number.</Text>
              ) : searchResults.length === 0 ? (
                <Text style={styles.searchEmpty}>No matches for “{debounced.trim()}”.</Text>
              ) : (
                <>
                  <Text style={styles.searchCount}>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</Text>
                  {searchResults.map((r) => (
                    <Pressable key={r.key} onPress={r.open} style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.7 }]}>
                      <View style={styles.resultBar} />
                      <View style={styles.flex}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                        <Text style={styles.resultSnippet} numberOfLines={2}>{r.before}<Text style={styles.resultMatch}>{r.match}</Text>{r.after}</Text>
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

      {/* Go to page */}
      <Modal visible={showGoTo} transparent animationType="fade" onRequestClose={() => setShowGoTo(false)}>
        <KeyboardModalScope>
        <Pressable style={styles.goToBackdrop} onPress={() => { Keyboard.dismiss(); setShowGoTo(false); }}>
          <Pressable style={styles.goToCard} onPress={() => {}}>
            <Text style={styles.goToTitle}>Go to page</Text>
            <Text style={styles.goToSub}>Enter a page number (14–190).</Text>
            <TextInput value={pageInput} onChangeText={setPageInput} keyboardType="number-pad" style={styles.goToInput} autoFocus />
            <Pressable onPress={submitGoTo} style={styles.goToBtn}><Text style={styles.goToBtnText}>Go</Text></Pressable>
          </Pressable>
        </Pressable>
        </KeyboardModalScope>
      </Modal>

      {/* Bookmarks sheet */}
      <Modal visible={showBookmarks} animationType="slide" onRequestClose={() => setShowBookmarks(false)} presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Bookmarks</Text>
            <Pressable onPress={() => setShowBookmarks(false)} hitSlop={8} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <X size={18} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
          {bookmarks.length === 0 ? (
            <View style={styles.empty}>
              <Bookmark size={30} color={c.textMuted} strokeWidth={1.6} />
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptyBody}>Open an essay and tap “Bookmark” to save a page. Saved pages show up here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {bookmarks.map((b) => (
                <View key={b.id} style={styles.bmRow}>
                  <Pressable style={styles.bmRowMain} onPress={() => openBookmark(b)} accessibilityRole="button">
                    <View style={styles.flex}>
                      <Text style={styles.bmRowTitle}>{b.title}</Text>
                      <Text style={styles.bmRowPage}>p. {b.bookPage}</Text>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => remove(b.id)} hitSlop={8} style={styles.bmDelete} accessibilityRole="button" accessibilityLabel="Remove bookmark">
                    <Trash2 size={17} color={c.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

// Two row shapes. Front matter is a plain title + page. A Step or Tradition
// leads with its numeral and gives the row to the Step's own words, in full —
// the title and page follow underneath as a caption, so the list reads like
// the book rather than like a table of contents.
function TTRow({ section, numbered, last, onOpen }: { section: Section; numbered: boolean; last: boolean; onOpen: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  // Entry text rides the shared "Aa" reading scale, like the readers.
  const { readingSize: size, readingLineHeight: lineHeight } = useReadingSize();
  const press = ({ pressed }: { pressed: boolean }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }];

  if (!numbered) {
    return (
      <Pressable onPress={onOpen} style={press} accessibilityRole="button" accessibilityLabel={section.title}>
        <Text style={[styles.rowTitle, styles.flex, { fontSize: size, lineHeight }]}>{section.title}</Text>
        {!!section.pageNumber && <Text style={[styles.rowPage, { lineHeight }]}>{section.pageNumber}</Text>}
      </Pressable>
    );
  }

  const numeral = section.id.match(/(\d+)$/)?.[1];
  return (
    <Pressable onPress={onOpen} style={press} accessibilityRole="button" accessibilityLabel={`${section.title}. ${section.description ?? ''}`}>
      {/* Numeral sits on the first line of the Step, and the column is sized for
          TWO digits — Steps/Traditions 10–12 must not wrap. */}
      {!!numeral && <Text numberOfLines={1} style={[styles.rowNum, { fontSize: size, lineHeight, width: size * 1.6 }]}>{numeral}</Text>}
      <View style={styles.flex}>
        <Text style={[styles.rowBody, { fontSize: size, lineHeight }]}>{section.description}</Text>
        <Text style={styles.rowCaption}>
          {section.title.toUpperCase()}
          {!!section.pageNumber && <Text style={styles.rowCaptionPage}>{`  ·  ${section.pageNumber}`}</Text>}
        </Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} style={styles.rowChevron} />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const TT_INK = colors.primaryDark;
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aaBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  aaLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },

  scroll: { paddingBottom: 40 },
  // The gradient IS the hero, as on the Big Book contents page.
  hero: { flexDirection: 'row', gap: 18, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  heroCover: {
    width: 88, height: 116, borderRadius: 4,
    shadowColor: '#1F3A4D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 9, elevation: 5,
  },
  heroTitle: { fontFamily: readerSerif, fontWeight: '700', fontSize: 26, lineHeight: 31, color: c.text },
  heroSub: { fontFamily: fontFamily.regular, fontSize: 14.5, color: c.textSecondary, marginTop: 6 },
  heroMeta: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },
  // Padding only — FindRow lays out its own row, so this must NOT be a row
  // container or the search field has no width to flex into.
  findRow: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 },

  body: { paddingHorizontal: 20, paddingTop: 6 },
  group: { marginTop: 14 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: readerSerif, fontSize: 16.5, lineHeight: 22, color: c.text },
  // Step / Tradition numeral — bold serif in the text ink, riding the first line.
  rowNum: { fontFamily: readerSerif, fontWeight: '700', color: c.text, textAlign: 'left' },
  rowBody: { fontFamily: readerSerif, fontSize: 16.5, lineHeight: 22, color: c.text },
  // Caption under the Step's words: "STEP ONE · p. 21".
  rowCaption: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.9, color: c.textMuted, marginTop: 6 },
  rowCaptionPage: { fontFamily: fontFamily.regular, fontSize: 11.5, letterSpacing: 0 },
  rowChevron: { alignSelf: 'center' },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 20, color: c.textMuted, flexShrink: 0 },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 15 },

  // bookmarks sheet
  sheet: { flex: 1, backgroundColor: c.background },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sheetList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  bmRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8, ...darkCard },
  bmRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: 15, paddingRight: 8 },
  bmRowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  bmRowPage: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
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
  resultBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: TT_INK },
  resultTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: TT_INK, paddingLeft: 6 },
  resultSnippet: { fontFamily: readerSerif, fontSize: 14.5, lineHeight: 21, color: c.text, marginTop: 5, paddingLeft: 6 },
  resultMatch: { backgroundColor: isDark ? 'rgba(79,179,172,0.25)' : '#FCE9A8', color: c.text },
  resultMeta: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 6, paddingLeft: 6 },

  // go to page
  goToBackdrop: { flex: 1, backgroundColor: isDark ? c.overlay : 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  goToCard: { width: '100%', backgroundColor: isDark ? c.surface : c.background, borderRadius: 18, padding: 20, ...(isDark ? { borderWidth: 1, ...darkCard } : null) },
  goToTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: c.text },
  goToSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  goToInput: { marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.semiBold, fontSize: 20, color: c.text, textAlign: 'center', backgroundColor: c.surface },
  goToBtn: { marginTop: 14, backgroundColor: TT_INK, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goToBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
});
};
