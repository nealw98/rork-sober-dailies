// Spot Check entry — the saved record.
//
// 2026-08-05 (Neal): the sponsor handoff is retired, so a spot check is the
// FORM alone — feelings + situation + reflection. The wizard/take-era fields
// below are kept because Journey still renders old records that carry them;
// new records always write them null. `SpotCheckSeed` (form → chat) is gone
// with the chat.
import type { SponsorType } from './index';

export type SpotCheckEntry = {
  id: string;
  createdAt: number; // epoch ms
  sponsorId: SponsorType; // wizard-era: persona that conducted it. New records write a fixed default; only the legacy "What {name} heard" heading reads it.
  feelings: string[]; // step 1 pills
  whatsGoingOn: string; // step 2 free text
  reflection?: string | null; // the form's app-voice response (2026-08-04+; absent on older records)
  causesQuestion: string | null; // wizard-era: the step-3 ask shown (LLM or fallback)
  causesAnswer: string | null; // wizard-era: step 3 free text (null if skipped)
  summary: string | null; // wizard-era / take-era: LLM lead paragraph
  suggestions: string[] | null; // wizard-era / take-era: bullets
};
