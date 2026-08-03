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
  causesQuestion: string | null; // the step-3 ask shown (LLM or fallback), kept for the record
  causesAnswer: string | null; // step 3 free text (null if skipped)
  summary: string | null; // step 4 LLM lead paragraph (null if the call failed)
  suggestions: string[] | null; // step 4 bullets (null if the call failed)
};

// Redesign (docs/spotcheck-redesign-spec.md): what the form hands the chat.
// On the new form, entries save with the wizard fields null; if the user later
// accepts "Add {name}'s take", the chat writes summary/suggestions/sponsorId
// back onto the saved record (matched by savedEntryId).
export type SpotCheckSeed = {
  sponsorId: SponsorType;
  feelings: string[];
  whatsGoingOn: string;
  savedEntryId: string | null; // null = user never saved; take prompt never shows
};
