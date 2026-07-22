// Spot Check — fixed per-persona content for the sponsor-driven guided flow.
// Steps 1–2 asks and the step-4 closing line are FIXED scripts (zero LLM calls);
// ship verbatim per the design handoff. The step-3 question and step-4 summary
// are live LLM output (lib/spotCheckLLM.ts) — never hardcoded here, except the
// offline fallback question used when that call fails.
import type { SponsorType } from '@/types';

export type SpotCheckScript = { ask1: string; ask2: string; close: string };

// Keyed by the app's real SponsorType ids (the design doc's eddie/sam/grace
// nicknames map to supportive/salty/grace).
export const SPOT_CHECK_SCRIPTS: Partial<Record<SponsorType, SpotCheckScript>> = {
  supportive: {
    ask1: 'Alright, let’s take a minute. How are you feeling right now? No reason needed yet — just tap what’s true.',
    ask2: 'Okay. What’s going on? If you’re not sure where it started, just walk me through the day.',
    close: 'You did the work. That’s a spot check.',
  },
  salty: {
    ask1: 'Alright, out with it. How are you feeling — right now, not how you think you should feel. Tap ’em.',
    ask2: 'So what happened? Don’t polish it. Walk me through the day.',
    close: 'Good. Now go do it — not tomorrow.',
  },
  grace: {
    ask1: 'Hi, love. Let’s just pause for a moment. How are you feeling right now? There’s no wrong answer — tap whatever’s there.',
    ask2: 'Thank you for naming that. What’s going on today? If it’s foggy, just start with this morning.',
    close: 'I’m proud of you for pausing. That’s the practice.',
  },
};

export const getSpotCheckScript = (id: SponsorType): SpotCheckScript =>
  SPOT_CHECK_SCRIPTS[id] ?? SPOT_CHECK_SCRIPTS.supportive!;

// Step-1 feeling pills — fixed set per the design spec. The screen appends an
// "Other" pill that opens a free-text input for feelings not listed here.
export const SPOT_CHECK_FEELINGS = [
  'Angry', 'Afraid', 'Anxious', 'Resentful', 'Restless',
  'Irritable', 'Discontent', 'Ashamed', 'Lonely', 'Self-pity',
];

// Offline / LLM-failure fallback for the step-3 question, voiced per persona.
export const SPOT_CHECK_FALLBACK_QUESTION: Partial<Record<SponsorType, string>> = {
  supportive: 'If this points at a person — what’s your part in it? And if it doesn’t, what’s the fear underneath?',
  salty: 'If somebody’s name came up back there — what’s YOUR part in it? And if not, what are you actually afraid of?',
  grace: 'Gently now — if this touches another person, what feels like yours in it? And if not, what might the fear be underneath?',
};

export const getSpotCheckFallbackQuestion = (id: SponsorType): string =>
  SPOT_CHECK_FALLBACK_QUESTION[id] ?? SPOT_CHECK_FALLBACK_QUESTION.supportive!;

// The three personas eligible to conduct a spot check (matches the sponsor
// switcher's SELECTION_SPONSOR_IDS).
export const SPOT_CHECK_SPONSOR_IDS: SponsorType[] = ['supportive', 'salty', 'grace'];

// Short-lived AsyncStorage handoff: the Spot Check screen writes the saved
// entry here before routing to sponsor-chat, which reads-and-clears it and
// injects the context card. (Route params would risk URL-length limits with
// free-text fields.)
export const SPOT_CHECK_HANDOFF_KEY = 'pending_spot_check_handoff';
