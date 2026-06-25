// Full-text search over the Big Book PDF parts (forewords, personal stories,
// Appendix VII). The in-app TEXT (chapters/front matter/appendices) is searched
// separately via use-bigbook-content's searchContent; the Contents page merges
// both so one search spans the whole book. The index is lazy-required so its
// ~600 KB never touches app startup.
type IndexChunk = { k: string; p: number; b: string; t: string };

export type PdfSearchHit = {
  pdfKey: string;
  bookPage: string;
  pdfPage: number;
  snippet: string;
};

let INDEX: IndexChunk[] | null = null;
function loadIndex(): IndexChunk[] {
  if (!INDEX) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    INDEX = require('@/constants/bigbook-pdf-search.json') as IndexChunk[];
  }
  return INDEX;
}

function makeSnippet(text: string, at: number, matchLen: number): string {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + matchLen + 60);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

// Word-prefix match (mirrors the in-app text search), case-insensitive.
export function searchBigBookPdfs(query: string, limit = 30): PdfSearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}`, 'i');
  const hits: PdfSearchHit[] = [];
  for (const c of loadIndex()) {
    const m = re.exec(c.t);
    if (m) {
      hits.push({ pdfKey: c.k, bookPage: c.b, pdfPage: c.p, snippet: makeSnippet(c.t, m.index, m[0].length) });
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
