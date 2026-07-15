// Reflection titles arrive from the source in ALL CAPS (e.g. "ONE DAY AT A
// TIME"). Render them as a normal reading title — Title Case, with minor words
// lowercased and the "A.A." acronym preserved. Used by both the Today hero and
// the Daily Reflections reading page.
//
// Titles can be wrapped in literal quotation marks (e.g. `"A MEASURE OF
// HUMILITY"`), so capitalize the first LETTER of each word — not charAt(0),
// which would hit the quote — and match minor words / A.A. on the word with
// its surrounding punctuation stripped.
const MINOR_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export const titleCase = (raw: string): string =>
  raw.trim().toLowerCase().split(/\s+/).map((w, i) => {
    const core = w.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9.]+$/, '');
    if (core === 'aa' || core === 'a.a.' || core === 'a.a') return w.replace(core, 'A.A.');
    if (i !== 0 && MINOR_WORDS.has(core)) return w;
    const idx = w.search(/[a-z0-9]/);
    return idx === -1 ? w : w.slice(0, idx) + w.charAt(idx).toUpperCase() + w.slice(idx + 1);
  }).join(' ');
