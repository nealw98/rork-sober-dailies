// Spot Check — the flow's two one-off LLM calls (deliberately its only LLM
// usage): step-3 causes-and-conditions question and step-4 summary+suggestions.
// Uses the same Rork endpoint + request shape as use-chat-store's callAI, but
// THROWS on failure instead of returning a chat-voice fallback string, so the
// screen can apply the design's offline fallbacks (fixed generic question /
// plain saved confirmation).
import type { SponsorType } from '@/types';
import { STEADY_EDDIE_SYSTEM_PROMPT } from '@/constants/steady-eddie';
import { SALTY_SAM_SYSTEM_PROMPT } from '@/constants/salty-sam';
import { GENTLE_GRACE_SYSTEM_PROMPT } from '@/constants/gentle-grace';

const LLM_URL = 'https://toolkit.rork.com/text/llm/';

function systemPromptFor(sponsorId: SponsorType): string {
  switch (sponsorId) {
    case 'salty': return SALTY_SAM_SYSTEM_PROMPT;
    case 'grace': return GENTLE_GRACE_SYSTEM_PROMPT;
    case 'supportive':
    default: return STEADY_EDDIE_SYSTEM_PROMPT;
  }
}

async function fetchCompletion(content: string): Promise<string> {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Rork's endpoint doesn't accept a 'system' role — fold the system prompt
    // into the single user message, matching use-chat-store's convention.
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  });
  if (!response.ok) {
    throw new Error(`Spot check LLM request failed: ${response.status}`);
  }
  const data = JSON.parse(await response.text());
  if (!data.completion || typeof data.completion !== 'string') {
    throw new Error('Spot check LLM response missing completion');
  }
  return data.completion;
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
    `What’s going on (their words): ${whatsGoingOn}`,
  ].join('\n');
  const completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);
  return completion.trim();
}

// Call 2 — the step-4 summary + suggestions, generated from all fields.
export async function askSummary(
  sponsorId: SponsorType,
  input: { feelings: string[]; whatsGoingOn: string; causesQuestion: string | null; causesAnswer: string | null },
): Promise<{ summary: string; suggestions: string[] }> {
  const task = [
    'TASK: You just walked the user through a 10th-step spot check. Summarize what you heard in 2–3 sentences (your voice), then give 2–3 concrete, small, doable suggestions as separate bullets — actions in the spirit of p. 84: pause/pray, tell someone, make it right, help someone else.',
    'Return ONLY valid JSON, no markdown fences, in exactly this shape: {"summary": "...", "suggestions": ["...", "..."]}',
    '',
    `Feelings they tapped: ${input.feelings.join(', ')}`,
    `What’s going on (their words): ${input.whatsGoingOn}`,
    input.causesQuestion ? `You asked: ${input.causesQuestion}` : '',
    input.causesAnswer
      ? `Their answer on causes & conditions: ${input.causesAnswer}`
      : 'They skipped the causes & conditions question.',
  ].filter(Boolean).join('\n');

  const completion = await fetchCompletion(`${systemPromptFor(sponsorId)}\n\n${task}`);

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
