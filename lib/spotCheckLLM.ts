// Spot Check — the form's ONE LLM call: the reflection card.
//
// 2026-08-05 (Neal): the sponsor-chat handoff is RETIRED. The multi-turn
// chat half (causes question → summary + suggestions → open chat) is gone
// along with its prefetch machinery and per-persona prompt routing — the
// chat could never be made to behave the way the flow needed. Spot Check is
// now a single self-contained form whose only generated content is the
// reflection, and the saved record is the whole artifact.
//
// Selected paid engine → cross-provider backup through the same Supabase fn.
// Throws on total failure so the form simply shows no card.
import type { SponsorType } from '@/types';
import { getSponsorById } from '@/constants/sponsors';
import { getAnonymousId } from '@/lib/anonymousId';
import {
  SUPABASE_ANON_KEY, getSponsorApiChatUrl, getSponsorApiUrl, getQaEngine, QA_ENGINE_SPEC,
} from '@/lib/sponsorApiSettings';

const LLM_TIMEOUT_MS = 20000;
// AbortSignal.timeout() isn't reliably present in Hermes — build it by hand.
function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// The server holds the persona
// prompts, so the paid message is the TASK alone (≤2000 chars server cap);
// output caps at 500. The Dev Console picks which paid model leads.
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

// The Dev Console selects GPT-5.4, Terra, or Sonnet as primary. OpenAI
// primaries fall back to Sonnet; Sonnet falls back to GPT-5.4, so a QA
// session can't dead-end on one provider's outage.
async function callPaidChain(
  sponsorId: SponsorType,
  message: string,
  conversation: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const primary = QA_ENGINE_SPEC[await getQaEngine()];
  const backup = primary.provider === 'anthropic' ? QA_ENGINE_SPEC.gpt : QA_ENGINE_SPEC.sonnet;
  try {
    return await callPaidSponsor(sponsorId, message, conversation, primary);
  } catch (primaryError) {
    console.warn(`[spotCheckLLM] ${primary.label} failed; trying ${backup.label}:`, (primaryError as Error).message);
    return await callPaidSponsor(sponsorId, message, conversation, backup);
  }
}

// Form reflection (2026-08-04): understanding-first summary → the program's
// answer per Neal's feeling-cluster playbook (fear→today/faith,
// discontent→gratitude/others, resentment→forgiveness/acceptance,
// shame→self-forgiveness; otherwise the best-fit Daily Moral Inventory
// asset). Neutral app voice. Fired on the form's Enter key; throws on total
// failure so the form shows nothing.
//
// The closing "talk it over with your AI sponsor" beat was REMOVED
// 2026-08-05 with the sponsor handoff — the card is now the last word.

// Canonical card shape (Neal, 2026-08-05): ONE flowing paragraph. The prompt
// asks for it, but models drift — collapse whatever comes back.
//
// Also strips asterisk emphasis: the prompt forbids markdown, but Sonnet
// still emits the occasional *word* (seen live 2026-08-05 — "you *are* the
// worst moment"), and RN's <Text> renders those asterisks literally. Only
// unwraps markers that hug a word, so a lone asterisk in the user's own
// situation text survives. Underscores are deliberately left alone — never
// observed as emphasis here, and the rule would eat snake_case.
function normalizeReflection(text: string): string {
  return text
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '$1')
    .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
    .trim();
}

export async function askFormReflection(feelings: string[], whatsGoingOn: string): Promise<string> {
  // The contract + Neal's per-cluster playbook live in the SERVER persona
  // (deploy-only tuning; also keeps this message under the fn's 2000-char
  // cap) — the task here is just the data.
  const task = [
    `Feelings they tapped: ${feelings.join(', ')}`,
    `What’s going on (their words): ${trim(whatsGoingOn, 1200)}`,
  ].join('\n');
  return normalizeReflection(await callPaidChain('reflection' as SponsorType, task, []));
}
