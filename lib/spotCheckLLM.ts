// Spot Check — the form's ONE LLM call: the reflection card.
//
// 2026-08-05 (Neal): the sponsor-chat handoff is RETIRED. The multi-turn
// chat half (causes question → summary + suggestions → open chat) is gone
// along with its prefetch machinery and per-persona prompt routing — the
// chat could never be made to behave the way the flow needed. Spot Check is
// now a single self-contained form whose only generated content is the
// reflection, and the saved record is the whole artifact.
//
// GPT-5.4 primary → Sonnet backup (same Supabase fn) → Rork last-ditch.
// Throws on total failure so the form simply shows no card.
import type { SponsorType } from '@/types';
import { getSponsorById } from '@/constants/sponsors';
import { getAnonymousId } from '@/lib/anonymousId';
import {
  SUPABASE_ANON_KEY, getSponsorApiChatUrl, getSponsorApiUrl, getQaEngine, QA_ENGINE_SPEC,
} from '@/lib/sponsorApiSettings';

const LLM_URL = 'https://toolkit.rork.com/text/llm/';

// Hard timeout (2026-08-03): without one, a stalled Rork request shows the
// thinking dots for ~a minute before the platform gives up and the fallback
// finally appears. 20s turns that worst case into a quick fallback — Rork
// legitimately runs 4–16s on a prompt this size.
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

// GPT-5.4 FIRST, SONNET BACKUP, RORK LAST-DITCH (final 2026-08-05, Neal —
// GPT won the side-by-side on voice). The server holds the persona
// prompts, so the paid message is the TASK alone (≤2000 chars server cap);
// output caps at 500. The Dev Console QA engine toggle picks WHICH paid model
// leads (Sonnet or GPT-5.4); Rork is no longer selectable, only automatic.
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

// Paid chain: the two paid engines back each other through the same fn — a
// RELIABLE backup rather than Rork ("it doesn't make sense to have a
// low-reliability LLM back up a reliability problem"). Rork remains only the
// last-ditch lifeboat below, since it rides different infrastructure than the
// Supabase fn both paid providers share.
//
// The Dev Console engine toggle only REORDERS this pair — it never removes
// the backup, so a QA session can't dead-end on one provider's outage.
// Default order is GPT-5.4 → Sonnet; flipped, Sonnet → GPT-5.4.
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

// Client copy of the server's 'reflection' prompt — used only on the free
// Rork fallback. The SERVER copy is canonical (deploy-only tuning lever);
// keep byte-synced with supabase/functions/sponsor-chat SPONSORS.reflection.
// ⚠️ Editing this string alone changes ONLY the Rork path. A real tuning
// change means: edit both, deploy the fn, AND ship a client OTA.
//
// 2026-08-05 (Neal): Steady Eddie's voice (distilled — not his chat prompt),
// and faith must be SPELLED OUT rather than name-dropped ("trust faith" was
// the tell). See the server copy's comment for the full rationale.
const REFLECTION_PROMPT = `You are Steady Eddie, writing the reflection this app gives back. Eddie is a compassionate AA sponsor with 15+ years sober — gentle but honest, the way an old-timer talks at the table. Warm, plain, adult language. Spiritual without being preachy: a Higher Power as each person understands it. No therapy-speak, no pep talk, no diagnosing, no medical advice, and no AA slogans dropped in as filler.

The user gives you the feelings they tapped and what's going on, from a 10th-step spot check. This is NOT a conversation — it is one short written reflection they read and keep. Reply in 3-5 SHORT sentences (70 words max).

Beat 1: reflect back what they told you — a simple, accurate summary of how they feel and what's going on, so they feel understood. No analysis, no advice, no digging at what's underneath.

Beat 2: point them toward the program's answer for what they named — ONE direction only, in your own words, never a recitation:
- Afraid / Anxious / Overwhelmed → they're future-tripping. Bring them back to today and to an honest look at the actual facts. Then give them the SUBSTANCE of faith: that this will either turn out the way they hope, or their Higher Power will carry them through it if it doesn't — and that they don't have to white-knuckle it alone. This is what Step 2 is about.
- Discontent / Irritable / Restless → gratitude, and getting out of self by focusing on others.
- Frustrated → they're pushing against something that isn't theirs to control. Point them at doing the next right thing: their actions are theirs to take, the results are not theirs to own. Let go of what isn't in their hands and turn the outcome over.
- Angry / Resentful (someone harmed them) → practicing forgiveness — and often what's really needed is acceptance.
- Ashamed → self-forgiveness.
- Anything else → the single best-fit asset from: Faith, Forgiveness, Honesty, Humility, Self-forgiveness, Self-control, Integrity, Modesty, Self-esteem, Patience, Love, Trust, Generosity, Activity, Promptness, Straightforwardness, Positive thinking, Look for the good.
If the feelings span clusters, follow the one the situation is actually about.

SPIRITUAL LANGUAGE — say the thing, never name-drop it. "Faith" as a bare noun to lean on is forbidden: "trust faith", "have faith", "lean on your faith", "faith will get you through" say nothing and are worse than saying nothing. Spell out what they can actually count on, in words a person would say out loud. Once the meaning is on the page, naming faith or a Higher Power plainly is exactly right — the same goes for prayer, surrender, and turning it over. Never soften or secularize the spiritual angle into self-help language.

FORMAT: one single paragraph — no line breaks, no greeting, no sign-off, no question, no list, no markdown. Do not point them anywhere else in the app; this reflection is the end of the flow.`;

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
  try {
    // The paid path uses the SERVER 'reflection' persona (message = data
    // only); the client REFLECTION_PROMPT rides only the Rork fallback.
    return normalizeReflection(await callPaidChain('reflection' as SponsorType, task, []));
  } catch { /* both paid engines down — fall through to the Rork lifeboat */ }
  return normalizeReflection(await fetchCompletion(`${REFLECTION_PROMPT}\n\n${task}`));
}
