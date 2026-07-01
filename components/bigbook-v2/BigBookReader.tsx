/**
 * Big Book Reader — full-screen text reader (redesign 3.0).
 * Lora on warm white, amber accents, "— PAGE n —" markers, sentence-level
 * highlights, per-page bookmark, prev/next chapter nav. Body text scales with
 * the global text-size setting (no in-reader font control). All reading logic
 * (highlights, bookmarks, page tracking, search-term highlighting) is unchanged.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Platform, BackHandler, UIManager } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Highlighter, Bookmark as BookmarkIcon } from 'lucide-react-native';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { BigBookParagraph } from './BigBookParagraph';
import { HighlightEditMenu } from './HighlightEditMenu';
import { HighlightColor, BigBookHighlight } from '@/types/bigbook-v2';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const c = getSemanticColors('light');
const PAPER = '#FCFBF8';
const AMBER = colors.steel;       // Steel Navy — Big Book accent
const AMBER_SOFT = colors.steelSoft;
const AMBER_INK = colors.steelDark;
const HIGHLIGHT_COLOR = HighlightColor.YELLOW;
// Highlight button matches the yellow highlight underlay (#FCE9A8) when active.
const HL_FILL = '#FCE9A8';
const HL_BORDER = '#E6C766';
const HL_INK = '#7A5B12';

interface BigBookReaderProps {
  visible: boolean;
  initialChapterId: string;
  scrollToParagraphId?: string | null;
  scrollToPage?: number | null;
  searchTerm?: string | null;
  onClose: () => void;
}

export function BigBookReader({ visible, initialChapterId, scrollToParagraphId, scrollToPage, searchTerm, onClose }: BigBookReaderProps) {
  const { currentChapter, currentChapterId, loadChapter, goToNextChapter, goToPreviousChapter } = useBigBookContent();
  const { fontSize, lineHeight } = useTextSettings();

  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showHighlightEditMenu, setShowHighlightEditMenu] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<BigBookHighlight | null>(null);
  const [layoutKey, setLayoutKey] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphRefs = useRef<Map<string, View>>(new Map());
  const paragraphPositions = useRef<Map<string, { y: number; height: number; pageNumber: number }>>(new Map());
  const activeScrollTargetRef = useRef<string | null>(scrollToParagraphId || null);

  const { addBookmark, deleteBookmark, isPageBookmarked, getBookmarkForPage } = useBigBookBookmarks();
  const { addHighlight, updateHighlightNote, deleteHighlight, getHighlightById } = useBigBookHighlights();

  const meta = currentChapterId ? getChapterMeta(currentChapterId) : undefined;
  const useRoman = meta?.useRomanNumerals || false;
  const chapterNumber = meta?.chapterNumber;

  // Android hardware back closes the reader.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => { loadChapter(initialChapterId); }, [initialChapterId, loadChapter]);

  // Android: nudge a layout pass when the chapter changes (fixes initial measure).
  useEffect(() => {
    if (visible && Platform.OS === 'android') {
      setIsLayoutReady(false);
      const t = setTimeout(() => { setLayoutKey((k) => k + 1); setIsLayoutReady(true); }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, currentChapterId]);

  const scrollToParagraph = useCallback((paragraphId: string) => {
    if (!paragraphId) return;
    activeScrollTargetRef.current = paragraphId;
    const node = paragraphRefs.current.get(paragraphId);
    if (node && scrollViewRef.current) {
      setTimeout(() => {
        node.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true }),
          () => {},
        );
      }, 100);
    }
  }, []);

  useEffect(() => { scrollViewRef.current?.scrollTo({ y: 0, animated: false }); }, [currentChapterId]);

  useEffect(() => {
    if (scrollToParagraphId && currentChapter) {
      activeScrollTargetRef.current = scrollToParagraphId;
      setTimeout(() => scrollToParagraph(scrollToParagraphId), 200);
    }
  }, [scrollToParagraphId, currentChapter, scrollToParagraph]);

  // Go-to-page: once the chapter loads, scroll to the first paragraph of that page.
  useEffect(() => {
    if (scrollToPage && currentChapter) {
      const p = currentChapter.paragraphs.find((par) => par.pageNumber === scrollToPage);
      if (p) { activeScrollTargetRef.current = p.id; setTimeout(() => scrollToParagraph(p.id), 250); }
    }
  }, [scrollToPage, currentChapter, scrollToParagraph]);

  // Keep the active paragraph in view when the global font size changes.
  useEffect(() => {
    if (!visible || !activeScrollTargetRef.current) return;
    const t = setTimeout(() => scrollToParagraph(activeScrollTargetRef.current as string), 250);
    return () => clearTimeout(t);
  }, [fontSize, visible, scrollToParagraph]);

  const handleScroll = useCallback((event: any) => {
    if (!currentChapter || paragraphPositions.current.size === 0) return;
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportHeight = event.nativeEvent.layoutMeasurement.height;
    const midpoint = scrollY + viewportHeight / 3;
    let found: number | null = null;
    let closest = Infinity;
    paragraphPositions.current.forEach((pos) => {
      const d = Math.abs(pos.y - midpoint);
      if (d < closest && pos.y <= midpoint && pos.y + pos.height >= scrollY) { closest = d; found = pos.pageNumber; }
    });
    if (found !== null && found !== currentPageNumber) setCurrentPageNumber(found);
  }, [currentChapter, currentPageNumber]);

  const handleParagraphLayout = useCallback((paragraphId: string, pageNumber: number, event: any) => {
    const { y, height } = event.nativeEvent.layout;
    paragraphPositions.current.set(paragraphId, { y, height, pageNumber });
  }, []);

  useEffect(() => {
    if (currentChapter) {
      paragraphPositions.current.clear();
      paragraphRefs.current.clear();
      setCurrentPageNumber(currentChapter.pageRange[0]);
    }
  }, [currentChapter]);

  const handleBookmarkPress = async () => {
    if (!currentPageNumber || !currentChapterId) return;
    try {
      const existing = getBookmarkForPage(currentPageNumber);
      if (existing) await deleteBookmark(existing.id);
      else await addBookmark(currentPageNumber, currentChapterId, '');
    } catch (e) { console.error('[BigBookReader] bookmark toggle', e); }
  };
  const isCurrentPageBookmarked = currentPageNumber ? isPageBookmarked(currentPageNumber) : false;

  const handleSentenceTap = useCallback(async (paragraphId: string, sentenceIndex: number, sentenceText: string) => {
    if (!currentChapterId) return;
    try { await addHighlight(paragraphId, currentChapterId, sentenceIndex, HIGHLIGHT_COLOR, sentenceText); }
    catch (e) { console.error('[BigBookReader] create highlight', e); }
  }, [currentChapterId, addHighlight]);

  const handleHighlightTap = useCallback(async (paragraphId: string, sentenceIndex: number) => {
    if (!highlightMode) return;
    try {
      const hs = await getHighlightById(paragraphId, sentenceIndex);
      if (hs.length > 0) await deleteHighlight(hs[0].id);
    } catch (e) { console.error('[BigBookReader] toggle highlight', e); }
  }, [highlightMode, getHighlightById, deleteHighlight]);

  const handleUpdateHighlightNote = async (note: string) => {
    if (!editingHighlight) return;
    try { await updateHighlightNote(editingHighlight.id, note); setShowHighlightEditMenu(false); setEditingHighlight(null); }
    catch (e) { console.error('[BigBookReader] update note', e); }
  };
  const handleRemoveHighlight = async () => {
    if (!editingHighlight) return;
    try { await deleteHighlight(editingHighlight.id); setShowHighlightEditMenu(false); setEditingHighlight(null); }
    catch (e) { console.error('[BigBookReader] remove highlight', e); }
  };

  const displayTitle = (currentChapter?.title ?? '').replace(/^\d+\.\s*/, '');
  const subtitle = chapterNumber ? `Big Book · Chapter ${chapterNumber}` : 'Big Book';
  const range = currentChapter
    ? `pp. ${formatPageNumber(currentChapter.pageRange[0], useRoman)}–${formatPageNumber(currentChapter.pageRange[1], useRoman)}`
    : '';
  const chapterLabel = `${chapterNumber ? `CHAPTER ${chapterNumber} · ` : ''}${range}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Close">
              <ChevronLeft size={22} color={c.text} strokeWidth={2} />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.title} numberOfLines={1}>{displayTitle || 'Loading…'}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          {/* Action row — page · highlight · bookmark */}
          <View style={styles.actionRow}>
            <Text style={styles.pageLabel}>
              {currentPageNumber ? `Page ${formatPageNumber(currentPageNumber, useRoman)}` : ' '}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => setHighlightMode((v) => !v)}
                style={[styles.hlPill, highlightMode ? { backgroundColor: HL_FILL, borderColor: HL_BORDER } : { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle highlight mode"
              >
                <Highlighter size={14} color={highlightMode ? HL_INK : c.textSecondary} strokeWidth={2} />
                <Text style={[styles.hlText, { color: highlightMode ? HL_INK : c.textSecondary }]}>Highlight</Text>
              </Pressable>
              <Pressable onPress={handleBookmarkPress} hitSlop={6} style={[styles.bmBtn, { borderColor: isCurrentPageBookmarked ? AMBER : c.border }]} accessibilityRole="button" accessibilityLabel="Bookmark this page">
                <BookmarkIcon size={16} color={isCurrentPageBookmarked ? AMBER_INK : c.textSecondary} fill={isCurrentPageBookmarked ? AMBER : 'transparent'} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Reading body */}
          <View style={[styles.body, !isLayoutReady && { opacity: 0 }]} collapsable={false} pointerEvents={isLayoutReady ? 'auto' : 'none'}>
            <ScrollView
              key={`bb-scroll-${layoutKey}`}
              ref={scrollViewRef}
              style={styles.flex}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={150}
            >
              {!!chapterLabel.trim() && <Text style={styles.chapterLabel}>{chapterLabel}</Text>}

              {currentChapter?.paragraphs.map((paragraph, index) => {
                const prev = index > 0 ? currentChapter.paragraphs[index - 1] : null;
                const isPageBreak = !!prev && prev.pageNumber !== paragraph.pageNumber;
                return (
                  <View
                    key={paragraph.id}
                    ref={(ref) => { if (ref) paragraphRefs.current.set(paragraph.id, ref); else paragraphRefs.current.delete(paragraph.id); }}
                    onLayout={(e) => handleParagraphLayout(paragraph.id, paragraph.pageNumber, e)}
                    collapsable={false}
                  >
                    <BigBookParagraph
                      paragraph={paragraph}
                      showPageNumber={false}
                      isPageBreak={isPageBreak}
                      fontSize={fontSize}
                      lineHeight={lineHeight}
                      highlightMode={highlightMode}
                      searchTerm={searchTerm || undefined}
                      useRomanNumerals={useRoman}
                      onSentenceTap={(si, st) => handleSentenceTap(paragraph.id, si, st)}
                      onHighlightTap={(si) => handleHighlightTap(paragraph.id, si)}
                    />
                  </View>
                );
              })}

              <Text style={styles.footnote}>Tap any sentence with Highlight on to mark it. Bookmarks save your place automatically.</Text>
              <Text style={styles.copyright}>Copyright © Alcoholics Anonymous World Services, Inc.</Text>
            </ScrollView>
          </View>

          {/* Footer — chapter nav */}
          <View style={styles.footer}>
            <Pressable onPress={goToPreviousChapter} style={styles.navBtn} hitSlop={8}>
              <ChevronLeft size={18} color={AMBER_INK} strokeWidth={2} />
              <Text style={styles.navText}>Prev</Text>
            </Pressable>
            <Text style={styles.footerCenter}>{chapterNumber ? `Chapter ${chapterNumber}` : 'Front matter'}</Text>
            <Pressable onPress={goToNextChapter} style={styles.navBtn} hitSlop={8}>
              <Text style={styles.navText}>Next</Text>
              <ChevronRight size={18} color={AMBER_INK} strokeWidth={2} />
            </Pressable>
          </View>

          <HighlightEditMenu
            visible={showHighlightEditMenu}
            highlight={editingHighlight}
            onUpdateNote={handleUpdateHighlightNote}
            onRemove={handleRemoveHighlight}
            onClose={() => { setShowHighlightEditMenu(false); setEditingHighlight(null); }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 20, letterSpacing: -0.4, color: c.text },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 1 },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
  pageLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hlPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1 },
  hlText: { fontFamily: fontFamily.semiBold, fontSize: 12 },
  bmBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1 },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 32 },
  chapterLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.6, color: AMBER_INK, marginBottom: 16 },
  footnote: { fontFamily: fontFamily.serifItalic, fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 18, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.background, borderRadius: 12 },
  copyright: { fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 14 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.divider },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  navText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: AMBER_INK },
  footerCenter: { fontFamily: fontFamily.semiBold, fontSize: 12, color: c.textMuted },
});
