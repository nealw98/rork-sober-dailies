// Twelve & Twelve (redesign 3.0), per hifi-literature.jsx Screen1212: lavender
// theme, hero strip with the cover, grouped Intro / Twelve Steps / Twelve
// Traditions list. Each row shows the Step/Tradition's one-line summary and its
// page, and opens the official A.A. essay as a bundled, offline PDF — shown with
// real BOOK pages and per-page bookmarks. A bookmarks list lives in the header.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Keyboard } from 'react-native';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Bookmark, Trash2, X, Search, Hash } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import PdfReader from '@/components/PdfReader';
import { TwelveCover, FindCard } from '@/components/literature/literature-ui';
import { twelveAndTwelveData } from '@/constants/twelve-and-twelve';
import { TWELVE_PDFS } from '@/constants/twelve-and-twelve-pdfs';
import { searchTwelvePdfs } from '@/lib/pdf-search';
import { usePdfBookmarks, type PdfBookmark } from '@/hooks/use-pdf-bookmarks';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const LAV_SOFT = colors.primarySoft; // Teal soft — 12 & 12 accent
const TT_INK = colors.primaryDark;   // Teal ink
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
  const { forBook, remove } = usePdfBookmarks();
  const [pdf, setPdf] = useState<OpenPdf | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGoTo, setShowGoTo] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pageInput, setPageInput] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 220); return () => clearTimeout(t); }, [query]);

  const bookmarks = forBook(BOOK);

  // Dismiss any modal before presenting the reader (avoids modal clash).
  const jump = (fn: () => void) => { setShowBookmarks(false); setShowSearch(false); setShowGoTo(false); setTimeout(fn, 300); };

  const openBookmark = (b: PdfBookmark) => jump(() => setPdf({ id: b.sectionId, title: b.title, startPage: b.startPage, initialPage: b.pdfPage }));

  const searchResults = useMemo(() => {
    const q = debounced.trim();
    type Row = { key: string; title: string; pageLabel: string; before: string; match: string; after: string; open: () => void };
    if (q.length < 2) return [] as Row[];
    const out: Row[] = [];
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
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Twelve &amp; Twelve</Text>
        <Text style={styles.sub}>Steps and Traditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero strip */}
        <LinearGradient colors={[LAV_SOFT, 'rgba(233,224,246,0)']} style={styles.hero}>
          <TwelveCover w={72} h={101} />
          <View style={styles.flex}>
            <Text style={styles.heroText}>Essays on A.A.’s 24 basic principles — a chapter on each of the Twelve Steps and Twelve Traditions, interpreting them for personal recovery and group life.</Text>
          </View>
        </LinearGradient>

        {/* Find tools */}
        <View style={styles.findRow}>
          <FindCard Icon={Search} label="Search" accent={TT_INK} soft={LAV_SOFT} onPress={() => setShowSearch(true)} />
          <FindCard Icon={Hash} label="Go to page" accent={TT_INK} soft={LAV_SOFT} onPress={() => setShowGoTo(true)} />
          <FindCard Icon={Bookmark} label="Bookmarks" count={bookmarks.length} accent={TT_INK} soft={LAV_SOFT} onPress={() => setShowBookmarks(true)} />
        </View>

        {/* Grouped Step / Tradition list */}
        <View style={styles.body}>
          {twelveAndTwelveData.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>{group.title.toUpperCase()}</Text>
              {(group.sections as Section[]).map((s, i) => (
                <TTRow
                  key={s.id}
                  section={s}
                  last={i === group.sections.length - 1}
                  onOpen={() => setPdf({ id: s.id, title: s.title, startPage: parsePage(s.pageNumber) })}
                />
              ))}
            </View>
          ))}
          <Text style={styles.copyright}>Copyright © 1952, 1953, 1981 by Alcoholics Anonymous World Services, Inc.</Text>
        </View>
      </ScrollView>

      {/* PDF reader */}
      <Modal visible={!!pdf} animationType="slide" onRequestClose={() => setPdf(null)} presentationStyle="fullScreen">
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
              {debounced.trim().length < 2 ? (
                <Text style={styles.searchHint}>Search across the Steps, Traditions, and introductions.</Text>
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
            <TextInput value={pageInput} onChangeText={setPageInput} keyboardType="number-pad" style={styles.goToInput} autoFocus returnKeyType="go" onSubmitEditing={submitGoTo} />
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
    </SafeAreaView>
  );
}

function TTRow({ section, last, onOpen }: { section: Section; last: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{section.title}</Text>
        {!!section.description && <Text style={styles.rowLine} numberOfLines={1}>{section.description}</Text>}
      </View>
      {!!section.pageNumber && <Text style={styles.rowPage}>{section.pageNumber}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 28, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  heroText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },
  findRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 14 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, lineHeight: 20, color: c.text },
  rowLine: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 20, color: c.textMuted, flexShrink: 0 },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 15 },

  // bookmarks sheet
  sheet: { flex: 1, backgroundColor: c.background },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
  sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sheetList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  bmRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8 },
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
  resultCard: { flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 8, overflow: 'hidden' },
  resultBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: TT_INK },
  resultTitle: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: TT_INK, paddingLeft: 6 },
  resultSnippet: { fontFamily: fontFamily.serif, fontSize: 14.5, lineHeight: 21, color: c.text, marginTop: 5, paddingLeft: 6 },
  resultMatch: { backgroundColor: '#FCE9A8', color: c.text },
  resultMeta: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 6, paddingLeft: 6 },

  // go to page
  goToBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  goToCard: { width: '100%', backgroundColor: c.background, borderRadius: 18, padding: 20 },
  goToTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: c.text },
  goToSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  goToInput: { marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.semiBold, fontSize: 20, color: c.text, textAlign: 'center', backgroundColor: c.surface },
  goToBtn: { marginTop: 14, backgroundColor: TT_INK, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goToBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
});
