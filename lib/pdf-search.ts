// Full-text search over a bundled PDF text index (per-page chunks: {k,p,b,t}).
// One factory, two books — the Big Book stories and the 12&12 essays. Indexes
// are lazy-required so their text never touches app startup.
type IndexChunk = { k: string; p: number; b: string; t: string };

export type PdfSearchHit = {
  pdfKey: string;
  bookPage: string;
  pdfPage: number;
  // snippet split around the match so the preview can highlight the term
  before: string;
  match: string;
  after: string;
};

// {before, match, after} around a match; `match` extends to the full word.
function contextAround(text: string, at: number, matchLen: number) {
  let end = at + matchLen;
  while (end < text.length && /[A-Za-z'’-]/.test(text[end])) end++;
  const before = (at - 40 > 0 ? '…' : '') + text.slice(Math.max(0, at - 40), at);
  const after = text.slice(end, Math.min(text.length, end + 60)) + (end + 60 < text.length ? '…' : '');
  return { before, match: text.slice(at, end), after };
}

function makeSearcher(load: () => IndexChunk[]) {
  let index: IndexChunk[] | null = null;
  return (query: string, limit = 30): PdfSearchHit[] => {
    const q = query.trim();
    if (q.length < 2) return [];
    if (!index) index = load();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}`, 'i');
    const hits: PdfSearchHit[] = [];
    for (const c of index) {
      const m = re.exec(c.t);
      if (m) {
        hits.push({ pdfKey: c.k, bookPage: c.b, pdfPage: c.p, ...contextAround(c.t, m.index, m[0].length) });
        if (hits.length >= limit) break;
      }
    }
    return hits;
  };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const searchBigBookPdfs = makeSearcher(() => require('@/constants/bigbook-pdf-search.json') as IndexChunk[]);
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const searchTwelvePdfs = makeSearcher(() => require('@/constants/twelve-pdf-search.json') as IndexChunk[]);
