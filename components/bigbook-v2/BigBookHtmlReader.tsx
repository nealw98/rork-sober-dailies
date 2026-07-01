/**
 * Big Book HTML Reader
 *
 * Parallel reader for native text selection. Keeps the existing BigBookReader
 * available as the Classic fallback while this path proves out range highlights.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Bookmark as BookmarkIcon, ChevronLeft, ChevronRight, FileText, Highlighter } from 'lucide-react-native';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber, isPageMarker } from '@/lib/bigbook-page-utils';
import { BigBookHighlight, BigBookParagraph, HighlightColor } from '@/types/bigbook-v2';
import { HighlightEditMenu } from './HighlightEditMenu';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const PAPER = '#FCFBF8';
const ACCENT = colors.steel;
const ACCENT_INK = colors.steelDark;
const HIGHLIGHT_COLOR = HighlightColor.YELLOW;
const HL_FILL = '#FCE9A8';
const HL_BORDER = '#E6C766';
const HL_INK = '#7A5B12';

interface BigBookHtmlReaderProps {
  visible: boolean;
  initialChapterId: string;
  scrollToPage?: number | null;
  searchTerm?: string | null;
  onClose: () => void;
  onSwitchToClassic: () => void;
}

type WebMessage =
  | { type: 'page'; pageNumber: number }
  | { type: 'selection'; paragraphId: string; startOffset: number; endOffset: number; text: string }
  | { type: 'highlightTap'; highlightId: string }
  | { type: 'unsupportedSelection'; reason: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextForOffsets(text: string): string {
  return text.replace(/(\*([^*]+)\*|_([^_]+)_)/g, (_match, _all, asteriskText, underscoreText) => asteriskText || underscoreText);
}

function renderInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(/(\*([^*]+)\*|_([^_]+)_)/g, (_match, _all, asteriskText, underscoreText) => {
    return `<em>${asteriskText || underscoreText}</em>`;
  });
}

function renderParagraph(paragraph: BigBookParagraph, useRoman: boolean, isPageBreak: boolean, fontSize: number, lineHeight: number): string {
  if (isPageMarker(paragraph.content)) return '';

  const pageMarker = isPageBreak
    ? `<div class="page-marker"><span></span><strong>PAGE ${formatPageNumber(paragraph.pageNumber, useRoman)}</strong><span></span></div>`
    : '';
  const text = renderInlineMarkdown(paragraph.content).replace(/\n/g, '<br />');
  const isVerse = paragraph.content.includes('\n') && !paragraph.content.includes('|');
  const isNumbered = /^(\d{1,2}\.\s)/s.test(paragraph.content);
  const isLettered = /^(\([a-z]\)\s)/s.test(paragraph.content);
  const classes = ['bb-paragraph', isVerse ? 'verse' : '', isNumbered ? 'numbered' : '', isLettered ? 'lettered' : '', paragraph.isItalic ? 'italic' : '']
    .filter(Boolean)
    .join(' ');

  return `${pageMarker}<p class="${classes}" data-pid="${escapeHtml(paragraph.id)}" data-page="${paragraph.pageNumber}" style="font-size:${fontSize}px;line-height:${lineHeight}px">${text}</p>`;
}

function sentenceRanges(text: string): Array<{ start: number; end: number }> {
  const plain = plainTextForOffsets(text);
  const regex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const ranges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(plain)) !== null) {
    const raw = match[0];
    const leading = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
    ranges.push({
      start: match.index + leading,
      end: match.index + raw.length - trailing,
    });
  }
  return ranges;
}

function buildHtml(params: {
  chapterLabel: string;
  paragraphs: BigBookParagraph[];
  highlights: BigBookHighlight[];
  fontSize: number;
  lineHeight: number;
  useRoman: boolean;
  highlightMode: boolean;
  scrollToPage?: number | null;
  searchTerm?: string | null;
}) {
  const body = params.paragraphs
    .map((paragraph, index) => {
      const prev = index > 0 ? params.paragraphs[index - 1] : null;
      return renderParagraph(paragraph, params.useRoman, !!prev && prev.pageNumber !== paragraph.pageNumber, params.fontSize, params.lineHeight);
    })
    .join('\n');

  const paragraphById = new Map(params.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  const rangeHighlights = params.highlights
    .map((h) => {
      if (h.startOffset !== undefined && h.endOffset !== undefined) {
        return {
          id: h.id,
          paragraphId: h.paragraphId,
          startOffset: h.startOffset,
          endOffset: h.endOffset,
          color: h.color,
        };
      }
      if (h.sentenceIndex !== undefined) {
        const paragraph = paragraphById.get(h.paragraphId);
        const range = paragraph ? sentenceRanges(paragraph.content)[h.sentenceIndex] : undefined;
        if (range) {
          return {
            id: h.id,
            paragraphId: h.paragraphId,
            startOffset: range.start,
            endOffset: range.end,
            color: h.color,
          };
        }
      }
      return null;
    })
    .filter((h): h is { id: string; paragraphId: string; startOffset: number; endOffset: number; color: HighlightColor } => h !== null)
    .map((h) => ({
      id: h.id,
      paragraphId: h.paragraphId,
      startOffset: h.startOffset,
      endOffset: h.endOffset,
      color: h.color,
    }));

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>
  :root { color-scheme: light; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; color: ${c.text}; -webkit-text-size-adjust: none; }
  body { font-family: Georgia, "Times New Roman", serif; padding: 16px 26px 36px; user-select: text; -webkit-user-select: text; }
  .chapter-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 10.5px; line-height: 15px; letter-spacing: 1.6px; text-transform: uppercase; color: ${ACCENT_INK}; font-weight: 700; margin: 0 0 16px; }
  .bb-paragraph { margin: 0 0 18px; letter-spacing: 0; }
  .bb-paragraph.verse { margin-left: 24px; font-style: italic; }
  .bb-paragraph.italic { font-style: italic; }
  .bb-paragraph.numbered, .bb-paragraph.lettered { padding-left: 18px; text-indent: -18px; }
  em { font-style: italic; }
  .page-marker { display: flex; align-items: center; gap: 10px; margin: 6px 0 16px; }
  .page-marker span { flex: 1; height: 1px; background: ${c.divider}; }
  .page-marker strong { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${c.textMuted}; font-size: 10.5px; letter-spacing: 1.5px; }
  .bb-highlight { background: ${HL_FILL}; border-radius: 3px; padding: 0 1px; }
  .search-hit { background: ${colors.primarySoft}; border-radius: 3px; }
  body.highlight-mode .bb-paragraph { cursor: text; }
  .footnote { margin: 22px 16px 0; padding: 12px 14px; border-radius: 12px; background: ${c.background}; color: ${c.textMuted}; text-align: center; font-size: 12px; line-height: 18px; font-style: italic; }
</style>
</head>
<body class="${params.highlightMode ? 'highlight-mode' : ''}">
  ${params.chapterLabel.trim() ? `<div class="chapter-label">${escapeHtml(params.chapterLabel)}</div>` : ''}
  ${body}
  <div class="footnote">Turn Highlight on, select words, and the selected passage will be saved.</div>
<script>
  window.__highlightMode = ${JSON.stringify(params.highlightMode)};
  window.__savedHighlights = ${JSON.stringify(rangeHighlights)};
  window.__searchTerm = ${JSON.stringify(params.searchTerm || '')};

  function post(payload) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  function textNodesWithin(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function rangeForOffsets(element, start, end) {
    const nodes = textNodesWithin(element);
    let current = 0;
    let startNode = null;
    let endNode = null;
    let startNodeOffset = 0;
    let endNodeOffset = 0;

    for (const node of nodes) {
      const next = current + node.textContent.length;
      if (!startNode && start >= current && start <= next) {
        startNode = node;
        startNodeOffset = start - current;
      }
      if (!endNode && end >= current && end <= next) {
        endNode = node;
        endNodeOffset = end - current;
        break;
      }
      current = next;
    }

    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  function applyHighlight(highlight) {
    const paragraph = document.querySelector('[data-pid="' + highlight.paragraphId + '"]');
    if (!paragraph || highlight.startOffset == null || highlight.endOffset == null) return;
    const range = rangeForOffsets(paragraph, highlight.startOffset, highlight.endOffset);
    if (!range || range.collapsed) return;
    const span = document.createElement('span');
    span.className = 'bb-highlight';
    span.dataset.highlightId = highlight.id;
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    } catch (_err) {
      // Ignore malformed or overlapping ranges; the saved snapshot still exists in the list.
    }
  }

  function applySearch(term) {
    if (!term) return;
    const safe = term.replace(/[.*+?^${'{}'}()|[\\]\\\\]/g, '\\\\$&');
    const regex = new RegExp('\\\\b' + safe, 'gi');
    document.querySelectorAll('.bb-paragraph').forEach((paragraph) => {
      textNodesWithin(paragraph).forEach((node) => {
        if (!regex.test(node.textContent)) return;
        regex.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let match;
        while ((match = regex.exec(node.textContent))) {
          if (match.index > last) frag.appendChild(document.createTextNode(node.textContent.slice(last, match.index)));
          let end = match.index + match[0].length;
          while (end < node.textContent.length && /[a-zA-Z]/.test(node.textContent[end])) end++;
          const mark = document.createElement('span');
          mark.className = 'search-hit';
          mark.textContent = node.textContent.slice(match.index, end);
          frag.appendChild(mark);
          last = end;
          regex.lastIndex = end;
        }
        if (last < node.textContent.length) frag.appendChild(document.createTextNode(node.textContent.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    });
  }

  function currentPage() {
    const paragraphs = Array.from(document.querySelectorAll('.bb-paragraph'));
    let active = paragraphs[0];
    for (const paragraph of paragraphs) {
      if (paragraph.getBoundingClientRect().top <= window.innerHeight / 3) active = paragraph;
      else break;
    }
    if (active) post({ type: 'page', pageNumber: Number(active.dataset.page) });
  }

  function readSelection() {
    if (!window.__highlightMode) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const startParagraph = range.startContainer.parentElement && range.startContainer.parentElement.closest('.bb-paragraph');
    const endParagraph = range.endContainer.parentElement && range.endContainer.parentElement.closest('.bb-paragraph');
    if (!startParagraph || !endParagraph || startParagraph !== endParagraph) {
      selection.removeAllRanges();
      post({ type: 'unsupportedSelection', reason: 'Select text inside one paragraph for now.' });
      return;
    }
    const preStart = document.createRange();
    preStart.selectNodeContents(startParagraph);
    preStart.setEnd(range.startContainer, range.startOffset);
    const preEnd = document.createRange();
    preEnd.selectNodeContents(startParagraph);
    preEnd.setEnd(range.endContainer, range.endOffset);
    const startOffset = preStart.toString().length;
    const endOffset = preEnd.toString().length;
    const text = selection.toString().trim();
    selection.removeAllRanges();
    if (!text || endOffset <= startOffset) return;
    post({ type: 'selection', paragraphId: startParagraph.dataset.pid, startOffset, endOffset, text });
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest && event.target.closest('.bb-highlight');
    if (target && target.dataset.highlightId) post({ type: 'highlightTap', highlightId: target.dataset.highlightId });
  });
  document.addEventListener('selectionchange', () => clearTimeout(window.__selectionTimer));
  document.addEventListener('touchend', () => { clearTimeout(window.__selectionTimer); window.__selectionTimer = setTimeout(readSelection, 180); });
  document.addEventListener('mouseup', () => { clearTimeout(window.__selectionTimer); window.__selectionTimer = setTimeout(readSelection, 120); });
  window.addEventListener('scroll', () => { clearTimeout(window.__pageTimer); window.__pageTimer = setTimeout(currentPage, 100); });
  window.__setHighlightMode = function(value) {
    window.__highlightMode = !!value;
    document.body.classList.toggle('highlight-mode', window.__highlightMode);
  };
  window.__addSavedHighlight = function(highlight) { applyHighlight(highlight); };

  applySearch(window.__searchTerm);
  window.__savedHighlights.forEach(applyHighlight);
  setTimeout(() => {
    ${params.scrollToPage ? `const target = document.querySelector('[data-page="${params.scrollToPage}"]'); if (target) target.scrollIntoView();` : ''}
    currentPage();
  }, 60);
</script>
</body>
</html>`;
}

export function BigBookHtmlReader({ visible, initialChapterId, scrollToPage, searchTerm, onClose, onSwitchToClassic }: BigBookHtmlReaderProps) {
  const webViewRef = useRef<WebView>(null);
  const { currentChapter, currentChapterId, loadChapter, goToNextChapter, goToPreviousChapter } = useBigBookContent();
  const { fontSize, lineHeight } = useTextSettings();
  const { addBookmark, deleteBookmark, isPageBookmarked, getBookmarkForPage } = useBigBookBookmarks();
  const { highlights, addRangeHighlight, updateHighlightNote, deleteHighlight } = useBigBookHighlights();
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<BigBookHighlight | null>(null);
  const [showHighlightEditMenu, setShowHighlightEditMenu] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);

  const meta = currentChapterId ? getChapterMeta(currentChapterId) : undefined;
  const useRoman = meta?.useRomanNumerals || false;
  const chapterNumber = meta?.chapterNumber;

  useEffect(() => { loadChapter(initialChapterId); }, [initialChapterId, loadChapter]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (currentChapter) setCurrentPageNumber(currentChapter.pageRange[0]);
  }, [currentChapter]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`window.__setHighlightMode && window.__setHighlightMode(${highlightMode ? 'true' : 'false'}); true;`);
  }, [highlightMode]);

  const currentHighlights = useMemo(() => {
    if (!currentChapterId) return [];
    return highlights.filter((highlight) => highlight.chapterId === currentChapterId);
  }, [currentChapterId, highlights]);

  const displayTitle = (currentChapter?.title ?? '').replace(/^\d+\.\s*/, '');
  const subtitle = chapterNumber ? `Big Book · Chapter ${chapterNumber}` : 'Big Book';
  const range = currentChapter
    ? `pp. ${formatPageNumber(currentChapter.pageRange[0], useRoman)}-${formatPageNumber(currentChapter.pageRange[1], useRoman)}`
    : '';
  const chapterLabel = `${chapterNumber ? `CHAPTER ${chapterNumber} · ` : ''}${range}`;

  const html = useMemo(() => {
    if (!currentChapter) return '<html><body></body></html>';
    return buildHtml({
      chapterLabel,
      paragraphs: currentChapter.paragraphs,
      highlights: currentHighlights,
      fontSize,
      lineHeight,
      useRoman,
      highlightMode,
      scrollToPage,
      searchTerm,
    });
  }, [currentChapter, displayTitle, chapterLabel, currentHighlights, fontSize, lineHeight, useRoman, highlightMode, scrollToPage, searchTerm, renderVersion]);

  const handleBookmarkPress = async () => {
    if (!currentPageNumber || !currentChapterId) return;
    try {
      const existing = getBookmarkForPage(currentPageNumber);
      if (existing) await deleteBookmark(existing.id);
      else await addBookmark(currentPageNumber, currentChapterId, '');
    } catch (error) {
      console.error('[BigBookHtmlReader] bookmark toggle', error);
    }
  };

  const handleWebMessage = useCallback(async (event: WebViewMessageEvent) => {
    let message: WebMessage;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (message.type === 'page') {
      if (Number.isFinite(message.pageNumber)) setCurrentPageNumber(message.pageNumber);
      return;
    }

    if (message.type === 'unsupportedSelection') {
      Alert.alert('Selection too large', message.reason);
      return;
    }

    if (message.type === 'highlightTap') {
      const highlight = highlights.find((item) => item.id === message.highlightId);
      if (highlight) {
        setEditingHighlight(highlight);
        setShowHighlightEditMenu(true);
      }
      return;
    }

    if (message.type === 'selection') {
      if (!currentChapterId) return;
      try {
        const highlight = await addRangeHighlight(
          message.paragraphId,
          currentChapterId,
          message.startOffset,
          message.endOffset,
          HIGHLIGHT_COLOR,
          message.text
        );
        webViewRef.current?.injectJavaScript(`window.__addSavedHighlight && window.__addSavedHighlight(${JSON.stringify({
          id: highlight.id,
          paragraphId: highlight.paragraphId,
          startOffset: highlight.startOffset,
          endOffset: highlight.endOffset,
          color: highlight.color,
        })}); true;`);
      } catch (error) {
        console.error('[BigBookHtmlReader] create range highlight', error);
      }
    }
  }, [addRangeHighlight, currentChapterId, highlights]);

  const handleUpdateHighlightNote = async (note: string) => {
    if (!editingHighlight) return;
    try {
      await updateHighlightNote(editingHighlight.id, note);
      setShowHighlightEditMenu(false);
      setEditingHighlight(null);
    } catch (error) {
      console.error('[BigBookHtmlReader] update note', error);
    }
  };

  const handleRemoveHighlight = async () => {
    if (!editingHighlight) return;
    try {
      await deleteHighlight(editingHighlight.id);
      setShowHighlightEditMenu(false);
      setEditingHighlight(null);
      setRenderVersion((value) => value + 1);
    } catch (error) {
      console.error('[BigBookHtmlReader] remove highlight', error);
    }
  };

  const isCurrentPageBookmarked = currentPageNumber ? isPageBookmarked(currentPageNumber) : false;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Close">
              <ChevronLeft size={22} color={c.text} strokeWidth={2} />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.title} numberOfLines={1}>{displayTitle || 'Loading...'}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Text style={styles.pageLabel}>{currentPageNumber ? `Page ${formatPageNumber(currentPageNumber, useRoman)}` : ' '}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={onSwitchToClassic}
                style={[styles.modePill, { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Use classic reader"
              >
                <FileText size={14} color={c.textSecondary} strokeWidth={2} />
                <Text style={styles.modeText}>Classic</Text>
              </Pressable>
              <Pressable
                onPress={() => setHighlightMode((value) => !value)}
                style={[styles.hlPill, highlightMode ? { backgroundColor: HL_FILL, borderColor: HL_BORDER } : { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle highlight mode"
              >
                <Highlighter size={14} color={highlightMode ? HL_INK : c.textSecondary} strokeWidth={2} />
                <Text style={[styles.hlText, { color: highlightMode ? HL_INK : c.textSecondary }]}>Highlight</Text>
              </Pressable>
              <Pressable onPress={handleBookmarkPress} hitSlop={6} style={[styles.bmBtn, { borderColor: isCurrentPageBookmarked ? ACCENT : c.border }]} accessibilityRole="button" accessibilityLabel="Bookmark this page">
                <BookmarkIcon size={16} color={isCurrentPageBookmarked ? ACCENT_INK : c.textSecondary} fill={isCurrentPageBookmarked ? ACCENT : 'transparent'} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <WebView
            key={`bb-html-${currentChapterId}-${renderVersion}-${fontSize}`}
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html }}
            style={styles.webView}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            onMessage={handleWebMessage}
            javaScriptEnabled
            allowsLinkPreview={false}
          />

          <View style={styles.footer}>
            <Pressable onPress={goToPreviousChapter} style={styles.navBtn} hitSlop={8}>
              <ChevronLeft size={18} color={ACCENT_INK} strokeWidth={2} />
              <Text style={styles.navText}>Prev</Text>
            </Pressable>
            <Text style={styles.footerCenter}>{chapterNumber ? `Chapter ${chapterNumber}` : 'Front matter'}</Text>
            <Pressable onPress={goToNextChapter} style={styles.navBtn} hitSlop={8}>
              <Text style={styles.navText}>Next</Text>
              <ChevronRight size={18} color={ACCENT_INK} strokeWidth={2} />
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
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1 },
  modeText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: c.textSecondary },
  bmBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  webView: { flex: 1, backgroundColor: PAPER },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.divider },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  navText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: ACCENT_INK },
  footerCenter: { fontFamily: fontFamily.semiBold, fontSize: 12, color: c.textMuted },
});
