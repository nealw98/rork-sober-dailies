// Spot Check — the flow's one-off LLM calls (deliberately its only LLM
// usage): step-3 causes-and-conditions question, step-4 summary+suggestions,
// and the "Keep talking" chat opener.
// Uses the same Rork endpoint + request shape as use-chat-store's callAI, but
// THROWS on failure instead of returning a chat-voice fallback string, so the
// screen can apply the design's offline fallbacks (fixed generic question /
// plain saved confirmation).
import type { SponsorType } from '@/types';
import { getSponsorById } from '@/constants/sponsors';
import { getAnonymousId } from '@/lib/anonymousId';
import {
  SUPABASE_ANON_KEY, getSponsorApiChatUrl, getSponsorApiUrl,
} from '@/lib/sponsorApiSettings';
import { STEADY_EDDIE_SYSTEM_PROMPT } from '@/constants/steady-eddie';
import { SALTY_SAM_SYSTEM_PROMPT } from '@/constants/salty-sam';
import { GENTLE_GRACE_SYSTEM_PROMPT } from '@/constants/gentle-grace';
import { COWBOY_PETE_SYSTEM_PROMPT } from '@/constants/cowboy-pete';
import { CO_SIGN_SALLY_SYSTEM_PROMPT } from '@/constants/co-sign-sally';
import { FRESH_FREDDIE_SYSTEM_PROMPT } from '@/constants/fresh-freddie';
import { MAMA_JO_SYSTEM_PROMPT } from '@/constants/mama-jo';

const LLM_URL = 'https://toolkit.rork.com/text/llm/';

// Full roster (redesign 2026-08-03): the form's sponsor sheet is no longer
// limited to the original three, so the spot-check turns must speak in every
// persona's voice — same mapping as use-chat-store's convertToAPIMessages.
function systemPromptFor(sponsorId: SponsorType): string {
  switch (sponsorId) {
    case 'salty':
    case 'salty-v2': return SALTY_SAM_SYSTEM_PROMPT;
    case 'grace':
    case 'grace-v2': return GENTLE_GRACE_SYSTEM_PROMPT;
    case 'cowboy-pete': return COWBOY_PETE_SYSTEM_PROMPT;
    case 'co-sign-sally': return CO_SIGN_SALLY_SYSTEM_PROMPT;
    case 'fresh': return FRESH_FREDDIE_SYSTEM_PROMPT;
    case 'mama-jo': return MAMA_JO_SYSTEM_PROMPT;
    case 'supportive':
    case 'supportive-v2':
    default: return STEADY_EDDIE_SYSTEM_PROMPT;
  }
}

// Hard timeout (2026-08-03): without one, a stalled Rork request shows the
// thinking dots for ~a minute before the platform gives up and the fallback
// finally appears. 20s turns that worst case into a quick fallback.
const LLM_TIMEOUT_MS = 20000;
// AbortSignal.timeout() isn't reliably present in Hermes — build it by hand.
function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function fetchCompletion(content: string): Promise<string> {
  const started = Date.now();
  try {
    const response = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Rork's endpoint doesn't accept a 'system' role — fold the system prompt
      // into the single user message, matching use-chat-store's convention.
      body: JSON.stringify({ messages: [{ role: 'user', content }] }),
      signal: timeoutSignal(LLM_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Spot check LLM request failed: ${response.status}`);
    }
    const data = JSON.parse(await response.text());
    if (!data.completion || typeof data.completion !== 'string') {
      throw new Error('Spot check LLM response missing completion');
    }
    console.log(`[spotCheckLLM] ok in ${Date.now() - started}ms (prompt ${content.length} chars)`);
    return data.completion;
  } catch (e) {
    console.warn(`[spotCheckLLM] failed after ${Date.now() - started}ms (prompt ${content.length} chars):`, (e as Error).message);
    throw e;
  }
}

// PAID PATH FIRST (Neal, 2026-08-03): spot-check turns go through the
// sponsor-chat Supabase function on our own Anthropic key (server-default
// model) — the free Rork toolkit measured 4–16s on real prompt sizes and is
// kept only as the fallback. The server holds the persona prompts, so the
// message is the TASK alone (≤2000 chars server cap); output caps at 500.
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function callPaidSponsor(
  sponsorId: SponsorType,
  message: string,
  conversation: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const started = Date.now();
  const sponsor = getSponsorById(sponsorId);
  const apiSponsorId = sponsor?.apiSponsorId ?? sponsorId;
  const url = getSponsorApiChatUrl(await getSponsorApiUrl());
  const anonymousId = await getAnonymousId().catch(() => null);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      sponsorId: apiSponsorId,
      message: trim(message, 2000),
      conversation,
      // Anthropic's max (Neal, 2026-08-03): spot-check turns run hot for
      // persona color. Stated as the real value — the server clamps
      // Anthropic to 1.0 anyway, so 1.1 was already landing here.
      temperature: 1.0,
      maxOutputTokens: 500,
      provider: 'anthropic',
      anonymous_id: anonymousId,
    }),
    signal: timeoutSignal(LLM_TIMEOUT_MS),
  });
  const data = await response.json();
  if (!response.ok || !data?.outputText) {
    console.warn(`[spotCheckLLM] paid path failed after ${Date.now() - started}ms:`, data?.error ?? response.status);
    throw new Error(data?.error || `Sponsor API request failed: ${response.status}`);
  }
  console.log(`[spotCheckLLM] paid ok in ${Date.now() - started}ms (${data.model ?? 'anthropic'})`);
  return String(data.outputText);
}

// Prefetch (2026-08-03): the form fires the page-3 question the moment the
// user taps Talk-it-through, so the network round-trip overlaps navigation +
// screen mount instead of starting after them. The chat screen consumes the
// in-flight promise; key guards against a stale prefetch for other inputs.
let prefetched: { key: string; promise: Promise<string> } | null = null;
const prefetchKey = (sponsorId: string, feelings: string[], whatsGoingOn: string) =>
  `${sponsorId}|${feelings.join(',')}|${whatsGoingOn}`;

export function prefetchCausesQuestion(sponsorId: SponsorType, feelings: string[], whatsGoingOn: string): void {
  const key = prefetchKey(sponsorId, feelings, whatsGoingOn);
  if (prefetched?.key === key) return; // same inputs already in flight (or resolved) — keep it

  const promise = askCausesQuestion(sponsorId, feelings, whatsGoingOn);
  promise.catch(() => {}); // consumed later; don't surface as unhandled
  prefetched = { key, promise };
}

export function consumePrefetchedQuestion(sponsorId: SponsorType, feelings: string[], whatsGoingOn: string): Promise<string> | null {
  const key = prefetchKey(sponsorId, feelings, whatsGoingOn);
  if (prefetched?.key !== key) return null;
  const p = prefetched.promise;
  prefetched = null;
  return p;
}

// Call 1 — the step-3 question, generated from steps 1–2.
export async function askCausesQuestion(
  sponsorId: SponsorType,
  feelings: string[],
  whatsGoingOn: string,
): Promise<string> {
  const task = [
    'TASK: You are conducting a 10th-step spot check. Based on what the user named below, ask ONE short question (2–3 sentences max, in your voice) that helps them get down to causes and conditions — their part in a resentment, a character defect at play, or a fear underneath. If nothing points at a person, don’t force “my part.” Do not give advice yet. Reply with the question only — no preamble, no markdown.',
    '',
    `Feelings they tapped: ${feelings.join(', ')}`,
    `What’s going on (their words): ${trim(whatsGoingOn, 1200)}`,
  ].join('\n');
  try {
    return (await callPaidSponsor(sponsorId, task, [])).trim();
  } catch {
    const completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
    return completion.trim();
  }
}

// Call 2 — the step-4 summary + suggestions, generated from all fields.
export async function askSummary(
  sponsorId: SponsorType,
  input: { feelings: string[]; whatsGoingOn: string; causesQuestion: string | null; causesAnswer: string | null },
): Promise<{ summary: string; suggestions: string[] }> {
  const task = [
    'TASK: You just walked the user through a 10th-step spot check. Summarize what you heard in 2–3 sentences (your voice), then give EXACTLY THREE concrete, small, doable suggestions as separate bullets — actions in the spirit of p. 84: pause/pray, tell someone, make it right, help someone else.',
    'Return ONLY valid JSON, no markdown fences, in exactly this shape: {"summary": "...", "suggestions": ["...", "..."]}',
    '',
    `Feelings they tapped: ${input.feelings.join(', ')}`,
    `What’s going on (their words): ${trim(input.whatsGoingOn, 700)}`,
    input.causesQuestion ? `You asked: ${trim(input.causesQuestion, 300)}` : '',
    input.causesAnswer
      ? `Their answer on causes & conditions: ${trim(input.causesAnswer, 600)}`
      : 'They skipped the causes & conditions question.',
  ].filter(Boolean).join('\n');

  let completion: string;
  try {
    completion = await callPaidSponsor(sponsorId, task, []);
  } catch {
    completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
  }

  // The model sometimes wraps JSON in code fences or adds stray text — extract
  // the outermost object before parsing.
  const match = completion.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Spot check summary response was not JSON');
  const parsed = JSON.parse(match[0]);
  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.suggestions)) {
    throw new Error('Spot check summary JSON missing fields');
  }
  return {
    summary: parsed.summary,
    suggestions: parsed.suggestions.filter((s: unknown): s is string => typeof s === 'string'),
  };
}

// Normal-chat turns INSIDE the ephemeral spot-check session (redesign
// 2026-08-03): after the page-4 summary, the conversation continues in the
// same window but never touches the main sponsor thread. Same Rork endpoint,
// role-tagged transcript; the system prompt + spot check context fold into
// the first user turn (the endpoint accepts no 'system' role).
export async function askSpotCheckReply(
  sponsorId: SponsorType,
  seed: { feelings: string[]; whatsGoingOn: string },
  transcript: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const context = `[We're in the middle of a 10th-step spot check. Feelings I named: ${seed.feelings.join(', ')}. What's going on: ${trim(seed.whatsGoingOn, 700)}]`;
  // Paid path: last user turn is the message, everything before it (plus the
  // spot check context) is the conversation; the server adds the persona.
  const last = transcript[transcript.length - 1];
  if (last?.role === 'user') {
    try {
      return (await callPaidSponsor(sponsorId, last.content, [
        { role: 'user', content: context },
        ...transcript.slice(0, -1),
      ])).trim();
    } catch { /* fall through to Rork */ }
  }
  const messages = [
    { role: 'user', content: `${systemPromptFor(sponsorId)}\n\nUser: ${context}` },
    ...transcript,
  ];
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal: timeoutSignal(LLM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Spot check chat request failed: ${response.status}`);
  const data = JSON.parse(await response.text());
  if (!data.completion || typeof data.completion !== 'string') {
    throw new Error('Spot check chat response missing completion');
  }
  return data.completion.trim();
}

// Call 3 — the "Keep talking" chat opener. In persona: says they've read the
// inventory, proves it with one specific detail, and asks where the user wants
// to take the conversation. Throws on failure; use-chat-store applies a
// feelings-based fallback line.
export async function askHandoffOpener(
  sponsorId: SponsorType,
  entry: { feelings: string[]; whatsGoingOn: string; causesAnswer: string | null; summary: string | null },
): Promise<string> {
  const task = [
    'TASK: The user just finished a 10th-step spot check with you and tapped "Keep talking" to continue in chat. Write your OPENING chat message (2–3 sentences, in your voice): say you’ve read their spot check inventory, show you actually read it by restating one specific thing THEY said — echo their own words back (prefer what they wrote about their part in it, e.g. “you said you snapped at her before she even finished talking”), not your interpretation or diagnosis of them (do NOT say things like “your pride and ego were involved” — that is your assessment, not what they said). One detail only, do NOT re-summarize the whole thing. Then ask ONE open question about where they want to take the conversation from here. Your message MUST end with that question — the final sentence is a direct question to the user ending in a question mark, never a statement. Reply with the message only — no preamble, no markdown.',
    '',
    `Feelings they tapped: ${entry.feelings.join(', ')}`,
    `What’s going on (their words): ${entry.whatsGoingOn}`,
    entry.causesAnswer ? `Their part in it (their words): ${entry.causesAnswer}` : '',
    entry.summary ? `The reflection you already gave them on the previous screen (do NOT repeat it): ${entry.summary}` : '',
  ].filter(Boolean).join('\n');
  const completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
  const opener = completion.trim();
  // The prompt demands a closing question, but the model occasionally ends on
  // a statement anyway — the chat then opens with nothing for the user to
  // respond to. Append a generic invitation rather than shipping a dead end.
  if (!opener.endsWith('?')) {
    return `${opener} Where do you want to start?`;
  }
  return opener;
}
