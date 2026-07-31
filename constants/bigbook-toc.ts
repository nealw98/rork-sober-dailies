// The Big Book (4th ed.) table of contents — the blueprint for the Contents
// page. Each entry is flagged `text` (opens the in-app text reader, chapterId →
// constants/bigbook-v2/metadata.ts) or `pdf` (opens the bundled PdfReader,
// pdfKey → constants/bigbook-pdfs.ts). `startPage` is the entry's first BOOK
// page, used to show real book pages in the PDF reader; 0 means suppress the
// page label (roman-numeral front matter). Mirrors en_bigbook_contents.pdf.

export type TocKind = 'text' | 'pdf';

export type TocEntry = {
  id: string;
  title: string;
  page: string;        // printed page label as in the book (e.g. 'xi', '171')
  kind: TocKind;
  chapterId?: string;  // bigbook-v2 chapter id (text)
  pdfKey?: string;     // BIGBOOK_PDFS key (pdf)
  startPage?: number;  // numeric first book page (pdf page mapping); 0 = hide page label
  note?: string;       // small right-aligned note (e.g. '17 stories')
};

export type TocGroup = { label: string; sub?: string; entries: TocEntry[] };

// All entries, flat. Helpers below let "go to page" and bookmarks resolve a book
// page (or entry id) to the right reader regardless of text/PDF.
export function flatEntries(): TocEntry[] {
  return BIGBOOK_TOC.flatMap((g) => g.entries);
}

export function findEntryById(id: string): TocEntry | undefined {
  return flatEntries().find((e) => e.id === id);
}

export function findEntryByPdfKey(pdfKey: string): TocEntry | undefined {
  return flatEntries().find((e) => e.pdfKey === pdfKey);
}

// Numeric first book page for arabic-paginated entries (chapters, stories,
// appendices). Roman-numeral front matter has no numeric page, so it's excluded
// from page lookup — "go to page 58" means the arabic page.
function numericStart(e: TocEntry): number | null {
  if (e.kind === 'pdf' && e.startPage && e.startPage > 0) return e.startPage;
  const n = parseInt(e.page, 10);
  return Number.isFinite(n) ? n : null;
}

// Which entry contains a given (arabic) book page. Each entry runs until the
// next entry's start page.
export function findEntryForPage(bookPage: number): TocEntry | undefined {
  const ranged = flatEntries()
    .map((e) => ({ e, start: numericStart(e) }))
    .filter((x): x is { e: TocEntry; start: number } => x.start != null)
    .sort((a, b) => a.start - b.start);
  for (let i = 0; i < ranged.length; i++) {
    const start = ranged[i].start;
    const end = i + 1 < ranged.length ? ranged[i + 1].start - 1 : start + 999;
    if (bookPage >= start && bookPage <= end) return ranged[i].e;
  }
  return undefined;
}

export const BIGBOOK_TOC: TocGroup[] = [
  {
    label: 'Front Matter',
    entries: [
      { id: 'preface', title: 'Preface', page: 'xi', kind: 'pdf', pdfKey: 'preface', startPage: 0 },
      { id: 'foreword-first', title: 'Foreword to First Edition', page: 'xiii', kind: 'text', chapterId: 'foreword-first' },
      { id: 'foreword-second', title: 'Foreword to Second Edition', page: 'xv', kind: 'text', chapterId: 'foreword-second' },
      { id: 'foreword-third', title: 'Foreword to Third Edition', page: 'xxii', kind: 'pdf', pdfKey: 'foreword-third', startPage: 0 },
      { id: 'foreword-fourth', title: 'Foreword to Fourth Edition', page: 'xxiii', kind: 'pdf', pdfKey: 'foreword-fourth', startPage: 0 },
      { id: 'doctors-opinion', title: "The Doctor's Opinion", page: 'xxv', kind: 'text', chapterId: 'doctors-opinion' },
    ],
  },
  {
    label: 'The Big Book',
    sub: 'The first 164 pages',
    entries: [
      { id: 'chapter-1', title: "1. Bill's Story", page: '1', kind: 'text', chapterId: 'chapter-1' },
      { id: 'chapter-2', title: '2. There Is a Solution', page: '17', kind: 'text', chapterId: 'chapter-2' },
      { id: 'chapter-3', title: '3. More About Alcoholism', page: '30', kind: 'text', chapterId: 'chapter-3' },
      { id: 'chapter-4', title: '4. We Agnostics', page: '44', kind: 'text', chapterId: 'chapter-4' },
      { id: 'chapter-5', title: '5. How It Works', page: '58', kind: 'text', chapterId: 'chapter-5' },
      { id: 'chapter-6', title: '6. Into Action', page: '72', kind: 'text', chapterId: 'chapter-6' },
      { id: 'chapter-7', title: '7. Working with Others', page: '89', kind: 'text', chapterId: 'chapter-7' },
      { id: 'chapter-8', title: '8. To Wives', page: '104', kind: 'text', chapterId: 'chapter-8' },
      { id: 'chapter-9', title: '9. The Family Afterward', page: '122', kind: 'text', chapterId: 'chapter-9' },
      { id: 'chapter-10', title: '10. To Employers', page: '136', kind: 'text', chapterId: 'chapter-10' },
      { id: 'chapter-11', title: '11. A Vision for You', page: '151', kind: 'text', chapterId: 'chapter-11' },
    ],
  },
  {
    label: 'Personal Stories · Part I',
    sub: 'Pioneers of A.A.',
    entries: [
      { id: 'story-doctor-bobs-nightmare', title: "Doctor Bob's Nightmare", page: '171', kind: 'pdf', pdfKey: 'doctor-bobs-nightmare', startPage: 171 },
      { id: 'story-aa-number-three', title: 'Alcoholics Anonymous Number Three', page: '182', kind: 'pdf', pdfKey: 'aa-number-three', startPage: 182 },
      { id: 'story-gratitude-in-action', title: 'Gratitude in Action', page: '193', kind: 'pdf', pdfKey: 'gratitude-in-action', startPage: 193 },
      { id: 'story-women-suffer-too', title: 'Women Suffer Too', page: '200', kind: 'pdf', pdfKey: 'women-suffer-too', startPage: 200 },
      { id: 'story-our-southern-friend', title: 'Our Southern Friend', page: '208', kind: 'pdf', pdfKey: 'our-southern-friend', startPage: 208 },
      { id: 'story-the-vicious-cycle', title: 'The Vicious Cycle', page: '219', kind: 'pdf', pdfKey: 'the-vicious-cycle', startPage: 219 },
      { id: 'story-jims-story', title: "Jim's Story", page: '232', kind: 'pdf', pdfKey: 'jims-story', startPage: 232 },
      { id: 'story-man-who-mastered-fear', title: 'The Man Who Mastered Fear', page: '246', kind: 'pdf', pdfKey: 'man-who-mastered-fear', startPage: 246 },
      { id: 'story-he-sold-himself-short', title: 'He Sold Himself Short', page: '258', kind: 'pdf', pdfKey: 'he-sold-himself-short', startPage: 258 },
      { id: 'story-keys-of-the-kingdom', title: 'The Keys of the Kingdom', page: '268', kind: 'pdf', pdfKey: 'keys-of-the-kingdom', startPage: 268 },
    ],
  },
  {
    label: 'Personal Stories · Part II',
    sub: 'They Stopped in Time',
    entries: [
      { id: 'story-the-missing-link', title: 'The Missing Link', page: '281', kind: 'pdf', pdfKey: 'the-missing-link', startPage: 281 },
      { id: 'story-fear-of-fear', title: 'Fear of Fear', page: '289', kind: 'pdf', pdfKey: 'fear-of-fear', startPage: 289 },
      { id: 'story-the-housewife-who-drank-at-home', title: 'The Housewife Who Drank at Home', page: '295', kind: 'pdf', pdfKey: 'the-housewife-who-drank-at-home', startPage: 295 },
      { id: 'story-physician-heal-thyself', title: 'Physician, Heal Thyself!', page: '301', kind: 'pdf', pdfKey: 'physician-heal-thyself', startPage: 301 },
      { id: 'story-my-chance-to-live', title: 'My Chance to Live', page: '309', kind: 'pdf', pdfKey: 'my-chance-to-live', startPage: 309 },
      { id: 'story-student-of-life', title: 'Student of Life', page: '319', kind: 'pdf', pdfKey: 'student-of-life', startPage: 319 },
      { id: 'story-crossing-the-river-of-denial', title: 'Crossing the River of Denial', page: '328', kind: 'pdf', pdfKey: 'crossing-the-river-of-denial', startPage: 328 },
      { id: 'story-because-im-an-alcoholic', title: "Because I'm an Alcoholic", page: '338', kind: 'pdf', pdfKey: 'because-im-an-alcoholic', startPage: 338 },
      { id: 'story-it-might-have-been-worse', title: 'It Might Have Been Worse', page: '348', kind: 'pdf', pdfKey: 'it-might-have-been-worse', startPage: 348 },
      { id: 'story-tightrope', title: 'Tightrope', page: '359', kind: 'pdf', pdfKey: 'tightrope', startPage: 359 },
      { id: 'story-flooded-with-feeling', title: 'Flooded With Feeling', page: '369', kind: 'pdf', pdfKey: 'flooded-with-feeling', startPage: 369 },
      { id: 'story-winner-takes-all', title: 'Winner Takes All', page: '375', kind: 'pdf', pdfKey: 'winner-takes-all', startPage: 375 },
      { id: 'story-me-an-alcoholic', title: 'ME an Alcoholic?', page: '382', kind: 'pdf', pdfKey: 'me-an-alcoholic', startPage: 382 },
      { id: 'story-the-perpetual-quest', title: 'The Perpetual Quest', page: '388', kind: 'pdf', pdfKey: 'the-perpetual-quest', startPage: 388 },
      { id: 'story-a-drunk-like-you', title: 'A Drunk, Like You', page: '398', kind: 'pdf', pdfKey: 'a-drunk-like-you', startPage: 398 },
      { id: 'story-acceptance-was-the-answer', title: 'Acceptance Was the Answer', page: '407', kind: 'pdf', pdfKey: 'acceptance-was-the-answer', startPage: 407 },
      { id: 'story-window-of-opportunity', title: 'Window of Opportunity', page: '421', kind: 'pdf', pdfKey: 'window-of-opportunity', startPage: 421 },
    ],
  },
  {
    label: 'Personal Stories · Part III',
    sub: 'They Lost Nearly All',
    entries: [
      { id: 'story-my-bottle-my-resentments-and-me', title: 'My Bottle, My Resentments, and Me', page: '437', kind: 'pdf', pdfKey: 'my-bottle-my-resentments-and-me', startPage: 437 },
      { id: 'story-he-lived-only-to-drink', title: 'He Lived Only to Drink', page: '446', kind: 'pdf', pdfKey: 'he-lived-only-to-drink', startPage: 446 },
      { id: 'story-safe-haven', title: 'Safe Haven', page: '452', kind: 'pdf', pdfKey: 'safe-haven', startPage: 452 },
      { id: 'story-listening-to-the-wind', title: 'Listening to the Wind', page: '458', kind: 'pdf', pdfKey: 'listening-to-the-wind', startPage: 458 },
      { id: 'story-twice-gifted', title: 'Twice Gifted', page: '470', kind: 'pdf', pdfKey: 'twice-gifted', startPage: 470 },
      { id: 'story-building-a-new-life', title: 'Building a New Life', page: '476', kind: 'pdf', pdfKey: 'building-a-new-life', startPage: 476 },
      { id: 'story-on-the-move', title: 'On the Move', page: '486', kind: 'pdf', pdfKey: 'on-the-move', startPage: 486 },
      { id: 'story-a-vision-of-recovery', title: 'A Vision of Recovery', page: '494', kind: 'pdf', pdfKey: 'a-vision-of-recovery', startPage: 494 },
      { id: 'story-gutter-bravado', title: 'Gutter Bravado', page: '501', kind: 'pdf', pdfKey: 'gutter-bravado', startPage: 501 },
      { id: 'story-empty-on-the-inside', title: 'Empty on the Inside', page: '512', kind: 'pdf', pdfKey: 'empty-on-the-inside', startPage: 512 },
      { id: 'story-grounded', title: 'Grounded', page: '522', kind: 'pdf', pdfKey: 'grounded', startPage: 522 },
      { id: 'story-another-chance', title: 'Another Chance', page: '531', kind: 'pdf', pdfKey: 'another-chance', startPage: 531 },
      { id: 'story-a-late-start', title: 'A Late Start', page: '535', kind: 'pdf', pdfKey: 'a-late-start', startPage: 535 },
      { id: 'story-freedom-from-bondage', title: 'Freedom From Bondage', page: '544', kind: 'pdf', pdfKey: 'freedom-from-bondage', startPage: 544 },
      { id: 'story-aa-taught-him-to-handle-sobriety', title: 'A.A. Taught Him to Handle Sobriety', page: '553', kind: 'pdf', pdfKey: 'aa-taught-him-to-handle-sobriety', startPage: 553 },
    ],
  },
  {
    label: 'Appendices',
    entries: [
      { id: 'appendix-1', title: 'I. The A.A. Tradition', page: '561', kind: 'text', chapterId: 'appendix-1' },
      { id: 'appendix-2', title: 'II. Spiritual Experience', page: '567', kind: 'text', chapterId: 'appendix-2' },
      { id: 'appendix-3', title: 'III. The Medical View on A.A.', page: '569', kind: 'text', chapterId: 'appendix-3' },
      { id: 'appendix-4', title: 'IV. The Lasker Award', page: '571', kind: 'text', chapterId: 'appendix-4' },
      { id: 'appendix-5', title: 'V. The Religious View on A.A.', page: '572', kind: 'text', chapterId: 'appendix-5' },
      { id: 'appendix-6', title: 'VI. How to Get in Touch with A.A.', page: '573', kind: 'text', chapterId: 'appendix-6' },
      { id: 'appendix-7', title: 'VII. Twelve Concepts (Short Form)', page: '574', kind: 'pdf', pdfKey: 'appendix-7', startPage: 574 },
    ],
  },
];
