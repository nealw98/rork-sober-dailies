// Twelve & Twelve (redesign 3.0), per hifi-literature.jsx Screen1212: lavender
// theme, hero strip with the cover, grouped Intro / Twelve Steps / Twelve
// Traditions list. Each row shows the Step/Tradition's one-line summary and its
// page, and opens the official A.A. essay as a bundled, offline PDF — shown with
// real BOOK pages and per-page bookmarks. A bookmarks list lives in the header.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Bookmark, Trash2, X } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import PdfReader from '@/components/PdfReader';
import { TwelveCover } from '@/components/literature/literature-ui';
import { twelveAndTwelveData } from '@/constants/twelve-and-twelve';
import { TWELVE_PDFS } from '@/constants/twelve-and-twelve-pdfs';
import { usePdfBookmarks, type PdfBookmark } from '@/hooks/use-pdf-bookmarks';
import { useReadingSession } from '@/hooks/useReadingSession';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const LAV_SOFT = colors.tertiarySoft; // #E9E0F6
const TT_INK = '#6A4FA0';
const BOOK = 'twelve';

type Section = { id: string; title: string; url: string; description?: string; pageNumber?: string };
type OpenPdf = { id: string; title: string; startPage: number; initialPage?: number };

const parsePage = (s?: string) => {
  const n = parseInt((s ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

export default function TwelveAndTwelveScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('12 Steps & 12 Traditions');
  const router = useRouter();
  const { forBook, remove } = usePdfBookmarks();
  const [pdf, setPdf] = useState<OpenPdf | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const bookmarks = forBook(BOOK);

  const openBookmark = (b: PdfBookmark) => {
    setShowBookmarks(false);
    // Let the sheet dismiss before presenting the reader (avoids modal clash).
    setTimeout(() => setPdf({ id: b.sectionId, title: b.title, startPage: b.startPage, initialPage: b.pdfPage }), 300);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.topRow}>
          <BackButton onPress={() => router.back()} />
          <Pressable onPress={() => setShowBookmarks(true)} hitSlop={8} style={styles.bmIconBtn} accessibilityRole="button" accessibilityLabel="Bookmarks">
            <Bookmark size={20} color={TT_INK} strokeWidth={2} fill={bookmarks.length > 0 ? TT_INK : 'transparent'} />
            {bookmarks.length > 0 && <View style={styles.bmBadge}><Text style={styles.bmBadgeText}>{bookmarks.length}</Text></View>}
          </Pressable>
        </View>
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
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  bmIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bmBadge: { position: 'absolute', top: 2, right: 0, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: TT_INK, alignItems: 'center', justifyContent: 'center' },
  bmBadgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 28, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },

  scroll: { paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  heroText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },

  body: { paddingHorizontal: 20 },
  group: { marginTop: 14 },
  groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  rowLine: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
  rowPage: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, flexShrink: 0 },
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
});
