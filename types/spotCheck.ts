// Spot Check entry — the sponsor-driven 4-step flow's record shape
// (redesign: sponsor-voiced guided flow, July 2026). Clean cutover from the
// old { situation, selections } shape; old-shape records are not read back.
import type { SponsorType } from './index';

export type SpotCheckEntry = {
  id: string;
  createdAt: number; // epoch ms
  sponsorId: SponsorType; // persona that conducted it (last one, if changed mid-flow)
  feelings: string[]; // step 1 pills
  whatsGoingOn: string; // step 2 free text
  reflection?: string | null; // the form's app-voice response (2026-08-04+; absent on older records)
  causesQuestion: string | null; // wizard-era: the step-3 ask shown (LLM or fallback)
  causesAnswer: string | null; // wizard-era: step 3 free text (null if skipped)
  summary: string | null; // wizard-era / take-era: LLM lead paragraph
  suggestions: string[] | null; // wizard-era / take-era: bullets
};

// Redesign (docs/spotcheck-redesign-spec.md): what the form hands the chat.
// The save is the FORM PAGE ONLY (feelings + situation + reflection); the
// chat is a separate, ephemeral session and writes nothing back (the
// "Add {name}'s take" flow was retired 2026-08-04 — summary/suggestions
// survive on older records only).
export type SpotCheckSeed = {
  sponsorId: SponsorType;
  feelings: string[];
  whatsGoingOn: string;
  savedEntryId: string | null; // informational; the chat no longer writes back
};
