/**
 * Big Book HTML Reader
 *
 * Parallel reader for native text selection. Keeps the existing BigBookReader
 * available as the Classic fallback while this path proves out range highlights.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark as BookmarkIcon, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber, isPageMarker } from '@/lib/bigbook-page-utils';
import { BigBookHighlight, BigBookParagraph, HighlightColor } from '@/types/bigbook-v2';
import { HighlightEditMenu } from './HighlightEditMenu';
import { colors as lightColors, semanticColors, fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { useReadingTime } from '@/hooks/useReadingTime';

const PAPER = '#FCFBF8';
const HIGHLIGHT_COLOR = HighlightColor.YELLOW;
const HL_FILL = '#FCE9A8';

// Reading-surface palette injected into the book HTML. Light is the original
// paper look; dark is the handoff's dark reading surface.
type ReaderPalette = {
  paper: string; ink: string; inkSecondary: string; muted: string; divider: string;
  accentInk: string; hlFill: string; searchHit: string; toolbarBg: string; toolbarBorder: string;
  colorScheme: 'light' | 'dark';
};
const READER_PALETTES: Record<'light' | 'dark', ReaderPalette> = {
  light: {
    paper: PAPER, ink: semanticColors.light.text, inkSecondary: semanticColors.light.textSecondary,
    muted: semanticColors.light.textMuted,
    divider: semanticColors.light.divider, accentInk: lightColors.steelDark, hlFill: HL_FILL,
    searchHit: lightColors.primarySoft, toolbarBg: 'rgba(255,255,255,0.99)',
    toolbarBorder: 'rgba(0,0,0,0.06)', colorScheme: 'light',
  },
  dark: {
    paper: '#101216', ink: '#F4F4F6', inkSecondary: '#C7C8CD', muted: '#C7C8CD',
    divider: 'rgba(255,255,255,0.10)', accentInk: '#4FB3AC',
    hlFill: 'rgba(79,179,172,0.38)', searchHit: 'rgba(79,179,172,0.38)',
    toolbarBg: 'rgba(28,30,36,0.99)', toolbarBorder: 'rgba(255,255,255,0.10)',
    colorScheme: 'dark',
  },
};
const HINT_SEEN_KEY = 'bb_highlight_hint_seen';
const SIZE_BUCKETS: { k: string; size: number }[] = [
  { k: 'S', size: 14 },
  { k: 'M', size: 18 },
  { k: 'L', size: 24 },
  { k: 'XL', size: 30 },
];

interface BigBookHtmlReaderProps {
  visible: boolean;
  initialChapterId: string;
  scrollToPage?: number | null;
  scrollToParagraphId?: string | null;
  searchTerm?: string | null;
  onClose: () => void;
}

type WebMessage =
  | { type: 'page'; pageNumber: number }
  | { type: 'selection'; paragraphId: string; startOffset: number; endOffset: number; text: string }
  | { type: 'selectionRanges'; text: string; ranges: Array<{ paragraphId: string; startOffset: number; endOffset: number }> }
  | { type: 'selectionAction'; action: 'highlight' | 'copy' | 'share'; text: string; ranges: Array<{ paragraphId: string; startOffset: number; endOffset: number }> }
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
  paragraphs: BigBookParagraph[];
  highlights: BigBookHighlight[];
  fontSize: number;
  lineHeight: number;
  useRoman: boolean;
  scrollToPage?: number | null;
  scrollToParagraphId?: string | null;
  searchTerm?: string | null;
  pal: ReaderPalette;
}) {
  const pal = params.pal;
  const body = params.paragraphs
    .map((paragraph, index) => {
      const prev = index > 0 ? params.paragraphs[index - 1] : null;
      return renderParagraph(paragraph, params.useRoman, index === 0 || (!!prev && prev.pageNumber !== paragraph.pageNumber), params.fontSize, params.lineHeight);
    })
    .join('\n');

  const paragraphById = new Map(params.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  const rangeHighlights = params.highlights
    .map((h) => {
      if (h.startOffset !== undefined && h.endOffset !== undefined) {
        return {
          id: h.id,
          groupId: h.groupId,
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
            groupId: h.groupId,
            paragraphId: h.paragraphId,
            startOffset: range.start,
            endOffset: range.end,
            color: h.color,
          };
        }
      }
      return null;
    })
    .filter((h): h is { id: string; groupId?: string; paragraphId: string; startOffset: number; endOffset: number; color: HighlightColor } => h !== null)
    .map((h) => ({
      id: h.id,
      groupId: h.groupId,
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
  :root { color-scheme: ${pal.colorScheme}; }
  html, body { margin: 0; padding: 0; background: ${pal.paper}; color: ${pal.ink}; -webkit-text-size-adjust: none; }
  body { font-family: Georgia, "Times New Roman", serif; padding: 16px 26px 36px; user-select: text; -webkit-user-select: text; }
  .chapter-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 10.5px; line-height: 15px; letter-spacing: 1.6px; text-transform: uppercase; color: ${pal.accentInk}; font-weight: 700; margin: 0 0 16px; }
  .bb-paragraph { margin: 0 0 18px; letter-spacing: 0; }
  .bb-paragraph.verse { margin-left: 24px; font-style: italic; }
  .bb-paragraph.italic { font-style: italic; }
  .bb-paragraph.numbered, .bb-paragraph.lettered { padding-left: 18px; text-indent: -18px; }
  em { font-style: italic; }
  .page-marker { display: flex; align-items: center; gap: 10px; margin: 6px 0 16px; }
  .page-marker span { flex: 1; height: 1px; background: ${pal.divider}; }
  .page-marker strong { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${pal.muted}; font-size: 10.5px; letter-spacing: 1.5px; }
  .bb-highlight { background: ${pal.hlFill}; color: inherit; border-radius: 3px; padding: 0 1px; ${pal.colorScheme === 'dark' ? 'box-shadow: inset 0 -2px 0 rgba(79,179,172,0.85);' : ''} }
  .bb-hl-pulse { animation: bbpulse 1.5s ease-out; border-radius: 3px; }
  @keyframes bbpulse { 0%, 22% { box-shadow: 0 0 0 3px ${pal.colorScheme === 'dark' ? 'rgba(79,179,172,0.55)' : 'rgba(214,158,0,0.55)'}; } 100% { box-shadow: 0 0 0 0 ${pal.colorScheme === 'dark' ? 'rgba(79,179,172,0)' : 'rgba(214,158,0,0)'}; } }
  .search-hit { background: ${pal.searchHit}; color: inherit; border-radius: 3px; }
  .bb-paragraph { cursor: text; }
  .selection-toolbar { position: fixed; left: 16px; top: 16px; z-index: 9999; display: none; gap: 2px; align-items: stretch; padding: 6px; border-radius: 16px; background: ${pal.toolbarBg}; box-shadow: 0 12px 30px rgba(0,0,0,0.20); border: 1px solid ${pal.toolbarBorder}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .selection-toolbar.visible { display: flex; }
  .selection-toolbar button { appearance: none; -webkit-appearance: none; border: 0; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 5px; min-width: 60px; padding: 9px 8px 7px; color: ${pal.ink}; font-size: 11px; line-height: 12px; font-weight: 600; border-radius: 11px; }
  .selection-toolbar button:active { background: ${pal.colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; }
  .selection-toolbar .ic { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
  .selection-toolbar .ic svg { width: 21px; height: 21px; display: block; }
  .selection-toolbar .ic, .selection-toolbar .ic * { pointer-events: none; }
  .selection-toolbar .hl-swatch { width: 20px; height: 20px; border-radius: 50%; background: ${pal.colorScheme === 'dark' ? 'rgba(79,179,172,0.45)' : HL_FILL}; border: 1.5px solid ${pal.colorScheme === 'dark' ? '#4FB3AC' : '#E6C766'}; box-sizing: border-box; }
</style>
</head>
<body>
  <div id="selection-toolbar" class="selection-toolbar" aria-hidden="true">
    <button data-action="highlight" type="button"><span class="ic"><span class="hl-swatch"></span></span>Highlight</button>
    <button data-action="copy" type="button"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></span>Copy</button>
    <button data-action="share" type="button"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8.5 6.5L12 3l3.5 3.5"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></span>Share</button>
  </div>
  ${body}
<script>
  window.__savedHighlights = ${JSON.stringify(rangeHighlights)};
  window.__searchTerm = ${JSON.stringify(params.searchTerm || '')};
  window.__pendingSelection = null;

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
    if (highlight.groupId) span.dataset.groupId = highlight.groupId;
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

  function hideSelectionToolbar(clearSelection) {
    const toolbar = document.getElementById('selection-toolbar');
    toolbar.classList.remove('visible');
    toolbar.setAttribute('aria-hidden', 'true');
    window.__pendingSelection = null;
    if (clearSelection) {
      const selection = window.getSelection();
      selection && selection.removeAllRanges();
    }
  }

  function positionSelectionToolbar(range) {
    const toolbar = document.getElementById('selection-toolbar');
    const rect = range.getBoundingClientRect();
    toolbar.classList.add('visible');
    toolbar.setAttribute('aria-hidden', 'false');
    const width = toolbar.offsetWidth || 230;
    const height = toolbar.offsetHeight || 42;
    const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.left + (rect.width / 2) - (width / 2)));
    const above = rect.top - height - 10;
    const top = above > 10 ? above : Math.min(window.innerHeight - height - 10, rect.bottom + 10);
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
  }

  function readSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideSelectionToolbar(false);
      return;
    }
    const range = selection.getRangeAt(0);
    const startParagraph = range.startContainer.parentElement && range.startContainer.parentElement.closest('.bb-paragraph');
    const endParagraph = range.endContainer.parentElement && range.endContainer.parentElement.closest('.bb-paragraph');
    if (!startParagraph || !endParagraph) {
      selection.removeAllRanges();
      hideSelectionToolbar(false);
      post({ type: 'unsupportedSelection', reason: 'Select text inside the Big Book passage.' });
      return;
    }

    const paragraphs = Array.from(document.querySelectorAll('.bb-paragraph'));
    const startIndex = paragraphs.indexOf(startParagraph);
    const endIndex = paragraphs.indexOf(endParagraph);
    if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
      selection.removeAllRanges();
      hideSelectionToolbar(false);
      post({ type: 'unsupportedSelection', reason: 'Select text from top to bottom in the passage.' });
      return;
    }

    function offsetInParagraph(paragraph, node, offset) {
      const pre = document.createRange();
      pre.selectNodeContents(paragraph);
      pre.setEnd(node, offset);
      return pre.toString().length;
    }

    const startOffset = offsetInParagraph(startParagraph, range.startContainer, range.startOffset);
    const endOffset = offsetInParagraph(endParagraph, range.endContainer, range.endOffset);
    const text = selection.toString().trim();
    const ranges = [];

    if (startParagraph === endParagraph) {
      ranges.push({
        paragraphId: startParagraph.dataset.pid,
        startOffset,
        endOffset
      });
    } else {
      for (let index = startIndex; index <= endIndex; index++) {
        const paragraph = paragraphs[index];
        const paragraphTextLength = paragraph.textContent.length;
        const segmentStart = index === startIndex ? startOffset : 0;
        const segmentEnd = index === endIndex ? endOffset : paragraphTextLength;
        if (segmentEnd > segmentStart) {
          ranges.push({
            paragraphId: paragraph.dataset.pid,
            startOffset: segmentStart,
            endOffset: segmentEnd
          });
        }
      }
    }

    if (!text || ranges.length === 0) {
      hideSelectionToolbar(false);
      return;
    }
    window.__pendingSelection = { text, ranges };
    positionSelectionToolbar(range);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest && event.target.closest('.bb-highlight');
    if (target && target.dataset.highlightId) post({ type: 'highlightTap', highlightId: target.dataset.highlightId });
  });
  function runSelectionAction(event) {
    event.preventDefault();
    const button = event.target.closest && event.target.closest('button[data-action]');
    if (!button || !window.__pendingSelection) return;
    if (window.__toolbarActionInFlight) return;
    window.__toolbarActionInFlight = true;
    post({ type: 'selectionAction', action: button.dataset.action, text: window.__pendingSelection.text, ranges: window.__pendingSelection.ranges });
    hideSelectionToolbar(true);
    setTimeout(() => { window.__toolbarActionInFlight = false; }, 300);
  }

  const toolbar = document.getElementById('selection-toolbar');
  toolbar.addEventListener('touchstart', (event) => event.preventDefault());
  toolbar.addEventListener('mousedown', (event) => event.preventDefault());
  toolbar.addEventListener('touchend', runSelectionAction);
  toolbar.addEventListener('click', runSelectionAction);
  document.addEventListener('selectionchange', () => {
    clearTimeout(window.__selectionTimer);
    window.__selectionTimer = setTimeout(readSelection, 260);
  });
  document.addEventListener('touchend', () => { clearTimeout(window.__selectionTimer); window.__selectionTimer = setTimeout(readSelection, 180); });
  document.addEventListener('mouseup', () => { clearTimeout(window.__selectionTimer); window.__selectionTimer = setTimeout(readSelection, 120); });
  window.addEventListener('scroll', () => { hideSelectionToolbar(true); clearTimeout(window.__pageTimer); window.__pageTimer = setTimeout(currentPage, 100); });
  window.__addSavedHighlight = function(highlight) { applyHighlight(highlight); };

  applySearch(window.__searchTerm);
  window.__savedHighlights.forEach(applyHighlight);
  setTimeout(() => {
    ${params.scrollToParagraphId
      ? `var __p = document.querySelector('[data-pid="${escapeHtml(params.scrollToParagraphId)}"]'); if (__p) { __p.scrollIntoView({ block: 'center' }); var __hls = __p.querySelectorAll('.bb-highlight'); for (var __i=0;__i<__hls.length;__i++) __hls[__i].classList.add('bb-hl-pulse'); setTimeout(function(){ for (var __j=0;__j<__hls.length;__j++) __hls[__j].classList.remove('bb-hl-pulse'); }, 1500); }`
      : params.scrollToPage
      ? `const target = document.querySelector('[data-page="${params.scrollToPage}"]'); if (target) target.scrollIntoView();`
      : ''}
    currentPage();
  }, 60);
</script>
</body>
</html>`;
}

export function BigBookHtmlReader({ visible, initialChapterId, scrollToPage, scrollToParagraphId, searchTerm, onClose }: BigBookHtmlReaderProps) {
  useReadingTime('Big Book', { format: 'text' });
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark, mode } = useTokens();
  const ACCENT = colors.steel;
  const ACCENT_INK = colors.steelDark;
  const pal = READER_PALETTES[mode];
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const { currentChapter, currentChapterId, loadChapter, goToNextChapter, goToPreviousChapter } = useBigBookContent();
  const { fontSize, lineHeight, setFontSize } = useTextSettings();
  const { addBookmark, deleteBookmark, isPageBookmarked, getBookmarkForPage } = useBigBookBookmarks();
  const { highlights, addRangeHighlight, updateHighlight, updateHighlightNote, deleteHighlight } = useBigBookHighlights();
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<BigBookHighlight | null>(null);
  const [showHighlightEditMenu, setShowHighlightEditMenu] = useState(false);
  const [showDisplaySheet, setShowDisplaySheet] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // First-use hint: teach the press-and-hold gesture once, then never again.
  useEffect(() => {
    AsyncStorage.getItem(HINT_SEEN_KEY)
      .then((v) => { if (v !== '1') setShowHint(true); })
      .catch(() => {});
  }, []);
  const dismissHint = useCallback(() => {
    setShowHint(false);
    AsyncStorage.setItem(HINT_SEEN_KEY, '1').catch(() => {});
  }, []);

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

  const currentHighlights = useMemo(() => {
    if (!currentChapterId) return [];
    return highlights.filter((highlight) => highlight.chapterId === currentChapterId);
  }, [currentChapterId, highlights]);

  const displayTitle = (currentChapter?.title ?? '').replace(/^\d+\.\s*/, '');
  const subtitle = chapterNumber ? `Big Book · Chapter ${chapterNumber}` : 'Big Book';
  const html = useMemo(() => {
    if (!currentChapter) return `<html><body style="background:${pal.paper}"></body></html>`;
    return buildHtml({
      paragraphs: currentChapter.paragraphs,
      highlights: currentHighlights,
      fontSize,
      lineHeight,
      useRoman,
      scrollToPage,
      scrollToParagraphId,
      searchTerm,
      pal,
    });
  }, [currentChapter, fontSize, lineHeight, useRoman, scrollToPage, scrollToParagraphId, searchTerm, renderVersion, pal]);

  const webSource = useMemo(() => ({ html }), [html]);

  const handleBookmarkPress = async () => {
    if (!currentPageNumber || !currentChapterId) return;
    try {
      const existing = getBookmarkForPage(currentPageNumber);
      if (existing) {
        await deleteBookmark(existing.id);
      } else {
        await addBookmark(currentPageNumber, currentChapterId, '');
        logEvent('bookmark_added', { book: 'Big Book', page: currentPageNumber });
      }
    } catch (error) {
      console.error('[BigBookHtmlReader] bookmark toggle', error);
    }
  };

  const createRangeHighlights = useCallback(async (
    ranges: Array<{ paragraphId: string; startOffset: number; endOffset: number }>,
    text: string
  ) => {
    if (!currentChapterId || ranges.length === 0) return;
    logEvent('highlight_created', { book: 'Big Book', chapter: currentChapterId });
    const groupId = `highlight_group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created = await Promise.all(ranges.map((item) =>
      addRangeHighlight(
        item.paragraphId,
        currentChapterId,
        item.startOffset,
        item.endOffset,
        HIGHLIGHT_COLOR,
        text,
        groupId
      )
    ));
    created.forEach((highlight) => {
      webViewRef.current?.injectJavaScript(`window.__addSavedHighlight && window.__addSavedHighlight(${JSON.stringify({
        id: highlight.id,
        groupId: highlight.groupId,
        paragraphId: highlight.paragraphId,
        startOffset: highlight.startOffset,
        endOffset: highlight.endOffset,
        color: highlight.color,
      })}); true;`);
    });
  }, [addRangeHighlight, currentChapterId]);

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

    if (message.type === 'selectionAction') {
      try {
        if (message.action === 'highlight') {
          await createRangeHighlights(message.ranges, message.text);
          return;
        }
        if (message.action === 'copy') {
          await Clipboard.setStringAsync(message.text);
          return;
        }
        if (message.action === 'share') {
          await Share.share({ message: message.text });
        }
      } catch (error) {
        console.error('[BigBookHtmlReader] selection action', error);
        Alert.alert('Selection action failed', 'Please try again.');
      }
      return;
    }

    if (message.type === 'selection') {
      if (!currentChapterId) return;
      try {
        await createRangeHighlights([{
          paragraphId: message.paragraphId,
          startOffset: message.startOffset,
          endOffset: message.endOffset,
        }], message.text);
      } catch (error) {
        console.error('[BigBookHtmlReader] create range highlight', error);
      }
    }

    if (message.type === 'selectionRanges') {
      if (!currentChapterId) return;
      try {
        await createRangeHighlights(message.ranges, message.text);
      } catch (error) {
        console.error('[BigBookHtmlReader] create grouped range highlight', error);
      }
    }
  }, [createRangeHighlights, currentChapterId, highlights]);

  const handleUpdateHighlightNote = async (note: string) => {
    if (!editingHighlight) return;
    try {
      if (editingHighlight.groupId) {
        const group = highlights.filter((item) => item.groupId === editingHighlight.groupId);
        await Promise.all(group.map((item) => updateHighlight(item.id, { note })));
      } else {
        await updateHighlightNote(editingHighlight.id, note);
      }
      setShowHighlightEditMenu(false);
      setEditingHighlight(null);
    } catch (error) {
      console.error('[BigBookHtmlReader] update note', error);
    }
  };

  const handleRemoveHighlight = async () => {
    if (!editingHighlight) return;
    try {
      if (editingHighlight.groupId) {
        const group = highlights.filter((item) => item.groupId === editingHighlight.groupId);
        await Promise.all(group.map((item) => deleteHighlight(item.id)));
      } else {
        await deleteHighlight(editingHighlight.id);
      }
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
                onPress={() => setShowDisplaySheet(true)}
                style={[styles.textSizeBtn, { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Text size"
              >
                <Text style={styles.textSizeLabel}>aA</Text>
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
            source={webSource}
            style={styles.webView}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            onMessage={handleWebMessage}
            javaScriptEnabled
            allowsLinkPreview={false}
            // Suppress the native iOS selection menu (Copy/Look Up/Translate) so
            // only our custom Kindle-style toolbar shows. Empty = no native items.
            menuItems={[]}
            onCustomMenuSelection={() => {}}
          />

          {showHint && (
            <View style={styles.hintBar}>
              <Text style={styles.hintText}>Press and hold any passage to highlight, copy, or share it.</Text>
              <Pressable onPress={dismissHint} hitSlop={10} style={styles.hintClose} accessibilityRole="button" accessibilityLabel="Dismiss tip">
                <X size={16} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>
          )}

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
          <DisplaySheet
            visible={showDisplaySheet}
            current={fontSize}
            onSize={setFontSize}
            onClose={() => setShowDisplaySheet(false)}
            bottomInset={insets.bottom}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function DisplaySheet({ visible, current, onSize, onClose, bottomInset }: {
  visible: boolean;
  current: number;
  onSize: (n: number) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const selected = SIZE_BUCKETS.reduce((best, bucket) => (
    Math.abs(bucket.size - current) < Math.abs(best.size - current) ? bucket : best
  ), SIZE_BUCKETS[0]).k;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.displaySheet, { paddingBottom: bottomInset + 28 }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetLabel}>TEXT SIZE</Text>
        <View style={styles.sizeRow}>
          <View style={styles.sizeBtns}>
            {SIZE_BUCKETS.map((bucket) => {
              const active = bucket.k === selected;
              const labelSize = bucket.k === 'S' ? 11 : bucket.k === 'M' ? 13 : bucket.k === 'L' ? 15 : 17;
              return (
                <Pressable
                  key={bucket.k}
                  onPress={() => onSize(bucket.size)}
                  style={[styles.sizeBtn, active ? styles.sizeBtnOn : styles.sizeBtnOff]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set text size ${bucket.k}`}
                >
                  <Text style={[styles.sizeBtnText, { fontSize: labelSize, color: active ? '#fff' : c.textSecondary }]}>{bucket.k}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable style={styles.sheetCancel} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const ACCENT_INK = colors.steelDark;
  const PAGE = isDark ? '#101216' : PAPER;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: isDark ? c.background : PAPER },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
  title: { fontFamily: fontFamily.displayBold, fontSize: 20, letterSpacing: -0.4, color: c.text },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
  pageLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textSizeBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  textSizeLabel: { fontFamily: fontFamily.bold, fontSize: 12.5, color: c.textSecondary, letterSpacing: -0.2 },
  bmBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  webView: { flex: 1, backgroundColor: PAGE },
  hintBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8, backgroundColor: ACCENT_INK, borderRadius: 14, paddingVertical: 12, paddingLeft: 16, paddingRight: 10 },
  hintText: { flex: 1, color: '#fff', fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  hintClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.divider },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  navText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: ACCENT_INK },
  footerCenter: { fontFamily: fontFamily.semiBold, fontSize: 12, color: c.textMuted },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? c.overlay : 'rgba(26,26,46,0.32)' },
  displaySheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: -10 }, elevation: 12 },
  grabber: { width: 40, height: 4, borderRadius: 999, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
  sizeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  sizeBtns: { flex: 1, flexDirection: 'row', gap: 6 },
  sizeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sizeBtnOn: { backgroundColor: colors.primary },
  sizeBtnOff: { borderWidth: 1, borderColor: c.border },
  sizeBtnText: { fontFamily: fontFamily.semiBold },
  sheetCancel: { marginTop: 22, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  sheetCancelText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
});
};
