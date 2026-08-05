// Spot Check — the feeling pills.
//
// This file used to carry the sponsor-driven wizard's per-persona scripts,
// its offline fallback questions, the eligible-persona list, and the
// form→chat handoff keys. All of it died with the sponsor handoff
// (2026-08-05, Neal): Spot Check is one self-contained form whose only
// generated content is the reflection card, so no persona speaks in this
// flow any more and there is nothing to hand off.
//
// Step-1 feeling pills — fixed set per the design spec. The screen appends an
// "Other" pill that opens a free-text input for feelings not listed here.
// 'Frustrated' added 2026-08-05 (Neal) — common enough that it shouldn't
// need the Other… pill; it kept showing up as free text.
export const SPOT_CHECK_FEELINGS = [
  'Angry', 'Afraid', 'Anxious', 'Resentful', 'Jealous', 'Hurt',
  'Restless', 'Irritable', 'Frustrated', 'Discontent', 'Overwhelmed',
  'Ashamed', 'Guilty', 'Self-pity',
];
