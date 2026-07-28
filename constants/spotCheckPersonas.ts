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
    ask2: 'Okay, so what happened? And don’t hand me the polished version, kid — walk me through the day, warts and all.',
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
// The LLM can't see the user's words here, but the tapped feelings are local
// structured data — flavor the question by the FIRST feeling that maps to a
// category, so it still lands near what they named. Unmapped feelings
// (Restless, Discontent) fall through to the generic variant.
type FallbackFlavor = 'resentment' | 'fear' | 'shame' | 'generic';

const FEELING_FLAVOR: Record<string, Exclude<FallbackFlavor, 'generic'>> = {
  Angry: 'resentment', Resentful: 'resentment', Irritable: 'resentment',
  Afraid: 'fear', Anxious: 'fear',
  Ashamed: 'shame', 'Self-pity': 'shame', Lonely: 'shame',
};

const SPOT_CHECK_FALLBACK_QUESTIONS: Partial<Record<SponsorType, Record<FallbackFlavor, string>>> = {
  supportive: {
    resentment: 'Sounds like somebody or something crossed you. Look at it honestly — what’s your part in it, even a small one?',
    fear: 'There’s some fear moving under this. What are you afraid of losing — or afraid you won’t get? Naming it takes half its power.',
    shame: 'Be gentle with yourself here, but honest too — what’s the thing you keep replaying, and what would you tell a friend who brought it to you?',
    generic: 'Take an honest look underneath this one — is it a resentment, a fear, or something that’s sitting wrong? Name whichever one it is.',
  },
  salty: {
    resentment: 'Somebody got under your skin, huh? Fine — what’s YOUR part in it? Nobody stays this worked up over something they had no hand in.',
    fear: 'That’s fear talking. So out with it — what are you scared of losing, or scared you’ll never get?',
    shame: 'Quit beating yourself up — that’s just pride turned inside out. What actually happened, and what’s yours to clean up?',
    generic: 'Alright, straight talk. What’s your part in this — and if you’re about to say “nothing,” tell me what you’re afraid of instead.',
  },
  grace: {
    resentment: 'It sounds like someone or something hurt you. When you’re ready — is there a small piece of it that belongs to you? There’s freedom in finding it.',
    fear: 'I think there’s fear underneath this. Can you name what feels threatened — what you’re afraid to lose, or afraid won’t come?',
    shame: 'You’re carrying something heavy. Look at it kindly — what happened, and what would it mean to set it down or make it right?',
    generic: 'Let’s sit with it for a moment. When you look beneath the feeling, what’s there — a hurt, a fear, something that isn’t finished? Whatever comes up is enough.',
  },
};

export const getSpotCheckFallbackQuestion = (id: SponsorType, feelings: string[] = []): string => {
  const variants = SPOT_CHECK_FALLBACK_QUESTIONS[id] ?? SPOT_CHECK_FALLBACK_QUESTIONS.supportive!;
  const flavor = feelings.map(f => FEELING_FLAVOR[f]).find(Boolean) ?? 'generic';
  return variants[flavor];
};

// The three personas eligible to conduct a spot check (matches the sponsor
// switcher's SELECTION_SPONSOR_IDS).
export const SPOT_CHECK_SPONSOR_IDS: SponsorType[] = ['supportive', 'salty', 'grace'];

// Short-lived AsyncStorage handoff: the Spot Check screen writes the saved
// entry here before routing to sponsor-chat, which reads-and-clears it and
// injects the context card. (Route params would risk URL-length limits with
// free-text fields.)
export const SPOT_CHECK_HANDOFF_KEY = 'pending_spot_check_handoff';
