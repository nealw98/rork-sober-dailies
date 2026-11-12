// Onboarding "try the sponsors" (v4 handoff 4) — the fixed intro each sponsor
// opens with and the closing appended after the third reply. App text, not
// generated: Neal settled on these wordings. The server repeats the intros and
// closings in the onboarding prompt so replies stay consistent with them —
// keep in sync with ONBOARDING in supabase/functions/sponsor-chat/index.ts.

export type TrySponsorId = 'supportive' | 'salty' | 'grace';
export type TryTarget = TrySponsorId | 'spotcheck';
// Which button and closing someone sees: a free trial on offer, subscribe only
// (trial already used), or nothing to buy (already has access).
export type TryOffer = 'trial' | 'subscribe' | 'member';

export const TRY_SPONSORS: TrySponsorId[] = ['supportive', 'salty', 'grace'];
export const TRY_MESSAGES = 3;

export const TRY_FIRST_NAME: Record<TrySponsorId, string> = {
  supportive: 'Eddie',
  salty: 'Sam',
  grace: 'Grace',
};

// Analytics names for each target.
export const TRY_EVENT_NAME: Record<TryTarget, string> = {
  supportive: 'eddie',
  salty: 'sam',
  grace: 'grace',
  spotcheck: 'spotcheck',
};

export const TRY_INTRO: Record<TrySponsorId, string> = {
  supportive: [
    'Hey, I’m Eddie. You can bring me the drinking thoughts, the resentment, the fear, the bad day, or the thing you’re ashamed to say out loud—any hour.',
    'I’m not a substitute for a sponsor, a meeting, a doctor, therapist, or emergency help, but I can help you find the next right thing.',
    'Tell me what’s going on.',
  ].join('\n\n'),
  salty: [
    'I’m Salty Sam, sober since October 18, 1983. Bring me the urge to drink, the resentment, the fear, the lie you’re nursing, or the crap you’re avoiding at any hour.',
    'I’m not a substitute for emergency services, a doctor, a therapist, or a real-life sponsor when you need immediate help.',
    'Quit circling the runway and tell me what’s going on.',
  ].join('\n\n'),
  grace: [
    'Hi, I’m Gentle Grace, and I’m glad you found your way here. You can bring me the cravings, the fear, the resentment, the shame, the gratitude—whatever is sitting heavy on your heart, at any hour.',
    'I’m an AI sponsor, not a substitute for emergency services, professional mental health care, medical care, or a real local recovery community, but I can help you pause, turn toward your Higher Power, and find the next right thing.',
    'Take a breath, and start wherever you are.',
  ].join('\n\n'),
};

type ClosingCopy = {
  opening: string;
  // Paragraph 2, by what is still untried. `o` is the untried sponsors' first
  // names ("Sam and Grace", or just "Sam").
  bothLeft: (o: string) => string;
  othersLeft: (o: string) => string;
  spotCheckLeft: string;
  offer: Record<TryOffer, string>;
};

const CLOSING: Record<TrySponsorId, ClosingCopy> = {
  supportive: {
    opening: 'You’ve seen a little of how I work — steady, honest, and focused on the next right thing.',
    bothLeft: (o) => `You can also try ${o} or do a spot-check inventory if you need to get clear on what’s eating at you.`,
    othersLeft: (o) => `You can also try ${o}.`,
    spotCheckLeft: 'You can also do a spot-check inventory if you need to get clear on what’s eating at you.',
    offer: {
      trial: 'If you want to keep talking with me, sign up for the free trial and we’ll keep it simple, one day at a time. You’re doing the work.',
      subscribe: 'If you want to keep talking with me, subscribe and we’ll keep it simple, one day at a time. You’re doing the work.',
      member: 'You’re doing the work.',
    },
  },
  salty: {
    opening: 'Well, you’ve had your three messages, so now you’ve seen I’m not here to pet your head and feed you recovery fortune cookies.',
    bothLeft: (o) => `Try ${o} if you want a different angle, or do a spot-check inventory and quit pretending that resentment will solve itself.`,
    othersLeft: (o) => `Try ${o} if you want a different angle.`,
    spotCheckLeft: 'Do a spot-check inventory and quit pretending that resentment will solve itself.',
    offer: {
      trial: 'Sign up for the free trial if you want to keep talking, and bring me the truth instead of the polished bullshit.',
      subscribe: 'Subscribe if you want to keep talking, and bring me the truth instead of the polished bullshit.',
      member: 'Come back anytime, and bring me the truth instead of the polished bullshit.',
    },
  },
  grace: {
    opening: 'I’m glad we got to share these few moments together, and I hope you’ve seen a little of how we can bring things back to the program—one day at a time.',
    bothLeft: (o) => `You might also try talking with ${o}, or do a spot-check inventory and let your Higher Power show you what’s yours to release.`,
    othersLeft: (o) => `You might also try talking with ${o}.`,
    spotCheckLeft: 'You might also do a spot-check inventory and let your Higher Power show you what’s yours to release.',
    offer: {
      trial: 'If you’d like to keep talking with me, sign up for the free trial and we’ll keep taking the next right step together. You don’t have to carry recovery alone.',
      subscribe: 'If you’d like to keep talking with me, subscribe and we’ll keep taking the next right step together. You don’t have to carry recovery alone.',
      member: 'You don’t have to carry recovery alone.',
    },
  },
};

// The closing for `sponsor`, naming only what is still untried. `tried` must
// already include `sponsor` itself.
export function tryClosing(sponsor: TrySponsorId, tried: ReadonlySet<TryTarget>, offer: TryOffer): string {
  const copy = CLOSING[sponsor];
  const others = TRY_SPONSORS.filter((id) => !tried.has(id)).map((id) => TRY_FIRST_NAME[id]).join(' and ');
  const spotCheck = !tried.has('spotcheck');
  const leftover = others && spotCheck ? copy.bothLeft(others)
    : others ? copy.othersLeft(others)
    : spotCheck ? copy.spotCheckLeft
    : null;
  return [copy.opening, leftover, copy.offer[offer]].filter(Boolean).join('\n\n');
}

export const tryButtonLabel = (offer: TryOffer) =>
  offer === 'trial' ? 'Start my free trial' : offer === 'subscribe' ? 'Subscribe' : 'Continue';
