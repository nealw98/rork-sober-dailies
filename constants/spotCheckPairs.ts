// The 18 Spot Check "Watch For → Strive For" pairs (off-the-beam → on-the-beam),
// shared by the Spot Check editor and the Journey Notebook detail so both read
// from one source. `core` = the six surfaced before "Show all 18".
export type SpotPair = { id: string; off: string; on: string; core?: boolean };

export const SPOT_PAIRS: SpotPair[] = [
  { id: 'fear', off: 'Fear', on: 'Faith', core: true },
  { id: 'resentment', off: 'Resentment', on: 'Forgiveness', core: true },
  { id: 'dishonesty', off: 'Dishonesty', on: 'Honesty', core: true },
  { id: 'pride', off: 'Pride', on: 'Humility', core: true },
  { id: 'selfPity', off: 'Self-pity', on: 'Self-forgiveness', core: true },
  { id: 'anger', off: 'Anger', on: 'Self-control', core: true },
  { id: 'selfJustification', off: 'Self-justification', on: 'Integrity' },
  { id: 'selfImportance', off: 'Self-importance', on: 'Modesty' },
  { id: 'selfCondemnation', off: 'Self-condemnation', on: 'Self-esteem' },
  { id: 'impatience', off: 'Impatience', on: 'Patience' },
  { id: 'hate', off: 'Hate', on: 'Love' },
  { id: 'jealousy', off: 'Jealousy', on: 'Trust' },
  { id: 'envy', off: 'Envy', on: 'Generosity' },
  { id: 'laziness', off: 'Laziness', on: 'Activity' },
  { id: 'procrastination', off: 'Procrastination', on: 'Promptness' },
  { id: 'insincerity', off: 'Insincerity', on: 'Straightforwardness' },
  { id: 'negativeThinking', off: 'Negative thinking', on: 'Positive thinking' },
  { id: 'criticizing', off: 'Criticizing', on: 'Look for the good' },
];

// Spot Check redesign (2026-08-03, docs/spotcheck-redesign-spec.md): each
// feeling chip maps to ONE of the 18 pairs so the form can preview
// Watch For → Strive For live. DRAFT CONTRACT — the prototype's mapping used
// vocabulary the 18 pairs don't have, so the nearest real pair was chosen;
// the honest stretches are Anxious→fear, Restless/Irritable→impatience,
// Discontent/Lonely→negativeThinking. Consumers should dedupe by pair id
// (Afraid+Anxious both land on fear).
export const FEELING_PAIR: Record<string, string> = {
  Angry: 'anger',
  Afraid: 'fear',
  Anxious: 'fear',
  Resentful: 'resentment',
  // 2026-08-04 chip additions (Lonely chip removed but stays mapped for
  // Other…-typed entries): Jealous is exact; Hurt → the resentment it turns
  // into; Overwhelmed → fear/faith (self-reliance failing); Guilty joins
  // Ashamed on self-condemnation — dedupe by pair id covers both selected.
  Jealous: 'jealousy',
  Hurt: 'resentment',
  Overwhelmed: 'fear',
  Guilty: 'selfCondemnation',
  Restless: 'impatience',
  Irritable: 'impatience',
  Discontent: 'negativeThinking',
  Ashamed: 'selfCondemnation',
  Lonely: 'negativeThinking',
  'Self-pity': 'selfPity',
};

export const pairsForFeelings = (feelings: string[]): SpotPair[] => {
  const ids = new Set(feelings.map((f) => FEELING_PAIR[f]).filter(Boolean));
  return SPOT_PAIRS.filter((p) => ids.has(p.id));
};
