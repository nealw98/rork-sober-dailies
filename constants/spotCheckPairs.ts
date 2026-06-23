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
