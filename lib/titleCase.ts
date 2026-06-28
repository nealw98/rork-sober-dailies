// Reflection titles arrive from the source in ALL CAPS (e.g. "ONE DAY AT A
// TIME"). Render them as a normal reading title — Title Case, with minor words
// lowercased and the "A.A." acronym preserved. Used by both the Today hero and
// the Daily Reflections reading page.
const MINOR_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export const titleCase = (raw: string): string =>
  raw.trim().toLowerCase().split(/\s+/).map((w, i) => {
    if (w === 'aa' || w === 'a.a.' || w === 'a.a') return 'A.A.';
    if (i !== 0 && MINOR_WORDS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
