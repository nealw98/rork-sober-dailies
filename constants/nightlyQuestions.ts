// The 7 Tenth-Step questions of the Nightly Review (AA, p. 86). Shared by the
// Nightly Review editor and the Journey Notebook detail. `key` matches the
// evening-review store's DetailedEveningEntry reflection fields.
export const NIGHTLY_QUESTIONS = [
  { key: 'reflectionResentful', q: 'Was I resentful, selfish, dishonest, or afraid?' },
  { key: 'reflectionApology', q: 'Do I owe an apology?' },
  { key: 'reflectionShared', q: 'Did I keep something to myself that should be shared with another?' },
  { key: 'reflectionOthers', q: 'Was I thinking of myself most of the time, or of what I could do for others?' },
  { key: 'reflectionKind', q: 'Was I kind and loving toward all?' },
  { key: 'reflectionWell', q: 'What have I done well today?' },
  { key: 'reflectionBetter', q: 'What could I have done better?' },
] as const;
