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
  SUPABASE_ANON_KEY, getSponsorApiChatUrl, getSponsorApiUrl, getQaUseRork,
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
// Interactive chat turns get a shorter Rork budget: a stalled turn should cut
// over to the Sonnet backup at 10s, not hold the thinking dots for 20. The
// one-shot form calls keep the 20s budget — Rork legitimately runs 4–16s on
// those bigger prompts, and an early abort would just re-bill them to Sonnet.
const LLM_CHAT_TIMEOUT_MS = 10000;
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

// SONNET-FIRST, RORK BACKUP (final flip 2026-08-04 evening, Neal —
// caching made Sonnet ~0.2¢/turn, so reliability wins): a year of
// ship-grade Rork quality and it's free — Rork serves every call; the
// sponsor-chat Supabase function on our own Anthropic key (Sonnet) is the
// automatic backup for Rork outages like Aug 2-3. The server holds the
// persona prompts, so the paid message is the TASK alone (≤2000 chars server
// cap); output caps at 500. The Dev Console "Use Rork" QA toggle disables
// the paid backup so pure-Rork behavior can be A/B'd.
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function callPaidSponsor(
  sponsorId: SponsorType,
  message: string,
  conversation: { role: 'user' | 'assistant'; content: string }[],
  // Default engine is Anthropic Sonnet (holds the personas). The GPT-5.4
  // backup (2026-08-04, Neal) passes {provider:'openai', model:'gpt-5.4'} —
  // same fn, same server personas, different provider outage domain.
  engine?: { provider: 'anthropic' | 'openai'; model: string },
): Promise<string> {
  const started = Date.now();
  const sponsor = getSponsorById(sponsorId);
  const apiSponsorId = sponsor?.apiSponsorId ?? sponsorId;
  const url = getSponsorApiChatUrl(await getSponsorApiUrl());
  const anonymousId = await getAnonymousId().catch(() => null);
  const body = JSON.stringify({
    sponsorId: apiSponsorId,
    message: trim(message, 2000),
    conversation,
    // Anthropic's max (Neal, 2026-08-03): spot-check turns run hot for
    // persona color. Stated as the real value — the server clamps
    // Anthropic to 1.0 anyway, so 1.1 was already landing here.
    temperature: 1.0,
    maxOutputTokens: 500,
    provider: engine?.provider ?? 'anthropic',
    // Sonnet, not the Haiku default: Haiku is politeness-tuned and played
    // Sam neutered (Neal, on device, 2026-08-04). Allowlisted server-side.
    model: engine?.model ?? 'claude-sonnet-4-6',
    anonymous_id: anonymousId,
  });
  const postOnce = () =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body,
      signal: timeoutSignal(LLM_TIMEOUT_MS),
    });
  let response = await postOnce();
  if (response.status >= 500) {
    // Supabase's edge gateway serves brief bursts of instant 502s (diagnosed
    // 2026-08-04) — they fail in ~0.1s, so one quick retry rides out a blip.
    await new Promise((resolve) => setTimeout(resolve, 400));
    response = await postOnce();
  }
  const data = await response.json();
  if (!response.ok || !data?.outputText) {
    console.warn(`[spotCheckLLM] paid path failed after ${Date.now() - started}ms:`, data?.error ?? response.status);
    throw new Error(data?.error || `Sponsor API request failed: ${response.status}`);
  }
  console.log(`[spotCheckLLM] paid ok in ${Date.now() - started}ms (${data.model ?? 'anthropic'})`);
  return String(data.outputText);
}

// Paid chain (2026-08-04, Neal): Sonnet first; if it fails, GPT-5.4 through
// the same fn — a reliable backup instead of Rork ("it doesn't make sense to
// have a low-reliability LLM back up a reliability problem"). Rork remains
// only as the last-ditch lifeboat in each caller, since it rides different
// infrastructure than the Supabase fn both paid providers share.
async function callPaidChain(
  sponsorId: SponsorType,
  message: string,
  conversation: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  try {
    return await callPaidSponsor(sponsorId, message, conversation);
  } catch (sonnetError) {
    console.warn('[spotCheckLLM] Sonnet failed; trying GPT-5.4 backup:', (sonnetError as Error).message);
    return await callPaidSponsor(sponsorId, message, conversation, { provider: 'openai', model: 'gpt-5.4' });
  }
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

// Client copy of the server's 'reflection' prompt — used only on the free
// Rork fallback. The SERVER copy is canonical (deploy-only tuning lever);
// keep byte-synced with supabase/functions/sponsor-chat SPONSORS.reflection.
const REFLECTION_PROMPT = `You are the quiet in-app reflection voice of Sober Dailies, an AA recovery app. Plain, warm, adult language — no persona, no greeting, no pep talk, no therapy-speak. AA-informed without jargon or preaching. Never diagnose, never give medical advice.

The user gives you the feelings they tapped and what's going on, from a 10th-step spot check. Reply in 3–5 SHORT sentences (70 words max), plain and conversational.

Beat 1: reflect back what they told you — a simple, accurate summary of how they feel and what's going on, so they feel understood. No analysis, no advice, no digging at what's underneath.

Beat 2: point them toward the program's answer for what they named, following this playbook — one main direction only, expressed naturally in one or two short sentences, never a recitation:
- Afraid / Anxious / Overwhelmed → they're usually future-tripping. Point back to staying in today and an honest look at the actual facts — and call out FAITH by name; this is what Step 2 is about. Faith means it will either turn out the way they want, or their Higher Power will see them through if it doesn't. Relying on their Higher Power instead of white-knuckling it alone is another right answer here. Say the word "faith" plainly.
- Discontent / Irritable / Restless → gratitude, and getting out of self by focusing on others.
- Angry / Resentful (someone harmed them) → practicing forgiveness — and often what's really needed is acceptance.
- Ashamed → self-forgiveness.
- Anything else → the single best-fit asset from: Faith, Forgiveness, Honesty, Humility, Self-forgiveness, Self-control, Integrity, Modesty, Self-esteem, Patience, Love, Trust, Generosity, Activity, Promptness, Straightforwardness, Positive thinking, Look for the good.
If the feelings span clusters, follow the one the situation is actually about. This is a spiritual program — do NOT soften or secularize the spiritual angle; faith and Higher Power are said plainly, not translated into self-help language.

Beat 3: close with a short invitation to take it further with their AI sponsor, worded to fit THIS situation — e.g. "It might be helpful to dig deeper with your AI sponsor", or "…to look at what's underneath this with your AI sponsor", or "…to sort out your part in it with your AI sponsor". Vary the wording; pick the angle that fits; always say "your AI sponsor".

FORMAT: beats 1 and 2 flow together as ONE paragraph — no line breaks between sentences. Then a blank line, then the AI-sponsor sentence alone. Nothing else — no greeting, no question, no list, no markdown.`;

// Form reflection (2026-08-04): understanding-first summary → the
// program's answer per Neal's feeling-cluster playbook (fear→today/faith,
// discontent→gratitude/others, resentment→forgiveness/acceptance,
// shame→self-forgiveness; otherwise the best-fit Daily Moral Inventory
// asset) → a tailored AI-sponsor invite. Neutral app voice. Fired on the
// form's Enter key; throws on total failure so the form shows nothing.

// Canonical card shape (Neal, 2026-08-04): one flowing paragraph, blank
// line, then the AI-sponsor closer on its own line. The prompt asks for
// this, but models drift — normalize whatever comes back: collapse all
// internal breaks into one paragraph, then re-split before the final
// sentence that names the AI sponsor.
function normalizeReflection(text: string): string {
  const collapsed = text.replace(/\s*\n+\s*/g, ' ').trim();
  const m = collapsed.match(/([^.!?]*your AI sponsor[^.!?]*[.!?]+)\s*$/i);
  if (!m || !m.index) return collapsed;
  const body = collapsed.slice(0, m.index).trim();
  const invite = m[1].trim();
  return body ? `${body}\n\n${invite}` : collapsed;
}

export async function askFormReflection(feelings: string[], whatsGoingOn: string): Promise<string> {
  // The contract + Neal's per-cluster playbook live in the SERVER persona
  // (deploy-only tuning; also keeps this message under the fn's 2000-char
  // cap) — the task here is just the data.
  const task = [
    `Feelings they tapped: ${feelings.join(', ')}`,
    `What’s going on (their words): ${trim(whatsGoingOn, 1200)}`,
  ].join('\n');
  if (!(await getQaUseRork())) {
    try {
      // Sonnet primary uses the SERVER 'reflection' persona (message = data
      // only); the client REFLECTION_PROMPT rides only the Rork fallback.
      return normalizeReflection(await callPaidChain('reflection' as SponsorType, task, []));
    } catch { /* fall through to Rork */ }
  }
  return normalizeReflection(await fetchCompletion(`${REFLECTION_PROMPT}\n\n${task}`));
}

// Call 1 — the step-3 question, generated from steps 1–2.
export async function askCausesQuestion(
  sponsorId: SponsorType,
  feelings: string[],
  whatsGoingOn: string,
): Promise<string> {
  const task = [
    // "My part" framing (Neal, 2026-08-04): the question's job is the program's
    // turn inward, not a follow-up on the situation — the form already captured
    // the situation.
    'TASK: You are conducting a 10th-step spot check. The user has described the situation below. Your job is the program’s turn inward: ask ONE short question (2–3 sentences max, in your voice) that challenges them to find THEIR part in it. Aim it at what they named. Resentment, anger, irritation, jealousy, hurt → where were they selfish, dishonest, self-seeking, or afraid — what’s their side of the street? Fear, anxiety, overwhelm → what are they afraid of losing or not getting? Are they future-tripping over something that hasn’t happened? Is self-reliance running the show where trust in a Higher Power belongs? Shame, guilt, self-pity, loneliness → what’s theirs to own, and what’s theirs to make right? EXCEPTION: if their description is extremely vague or just a few words, don’t guess — point out the vagueness itself (you can’t take honest inventory of what you won’t name) and ask them to get specific; the dodge is their part. Otherwise don’t ask for a retelling of events — the situation is already on the table. Challenge them honestly — no blame, no lecture, no consoling deflection. Do not give advice yet. Reply with the question only — no preamble, no markdown.',
    '',
    `Feelings they tapped: ${feelings.join(', ')}`,
    `What’s going on (their words): ${trim(whatsGoingOn, 1200)}`,
  ].join('\n');
  if (!(await getQaUseRork())) {
    try {
      return (await callPaidChain(sponsorId, task, [])).trim();
    } catch { /* fall through to Rork */ }
  }
  return (await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`)).trim();
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
  if (!(await getQaUseRork())) {
    try {
      completion = await callPaidChain(sponsorId, task, []);
    } catch {
      completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
    }
  } else {
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
  // Sonnet primary needs a trailing user turn to serve as the message (the
  // server adds the persona; everything before it rides as conversation).
  const last = transcript[transcript.length - 1];
  const qaRork = await getQaUseRork();
  if (last?.role === 'user' && !qaRork) {
    try {
      return (await callPaidChain(sponsorId, last.content, [
        { role: 'user', content: context },
        ...transcript.slice(0, -1),
      ])).trim();
    } catch { /* fall through to Rork */ }
  }
  {
    const messages = [
      { role: 'user', content: `${systemPromptFor(sponsorId)}\n\nUser: ${context}` },
      ...transcript,
    ];
    const response = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      // QA-toggle mode: Rork is the only engine — give its 4-16s healthy
      // tail room. Backup mode keeps the fast cutoff.
      signal: timeoutSignal(qaRork ? 25000 : LLM_CHAT_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Spot check chat request failed: ${response.status}`);
    const data = JSON.parse(await response.text());
    if (!data.completion || typeof data.completion !== 'string') {
      throw new Error('Spot check chat response missing completion');
    }
    return data.completion.trim();
  }
}

// Call 3 — the "Keep talking" chat opener. In persona: says they've read the
// inventory, proves it with one specific detail, and asks where the user wants
// to take the conversation. Sonnet-first with the Rork backup like the rest;
// throws on total failure and use-chat-store applies a feelings-based line.
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
  let completion: string;
  if (!(await getQaUseRork())) {
    try {
      completion = await callPaidChain(sponsorId, task, []);
    } catch {
      completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
    }
  } else {
    completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
  }
  const opener = completion.trim();
  // The prompt demands a closing question, but the model occasionally ends on
  // a statement anyway — the chat then opens with nothing for the user to
  // respond to. Append a generic invitation rather than shipping a dead end.
  if (!opener.endsWith('?')) {
    return `${opener} Where do you want to start?`;
  }
  return opener;
}
