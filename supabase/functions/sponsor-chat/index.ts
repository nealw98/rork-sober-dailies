// Supabase Edge Function: sponsor-chat
//
// Production backend for AI Sponsors.
//
// Supports two AI engines, selectable per request via `provider`:
//   - 'openai'    (default) — OpenAI Responses API
//   - 'anthropic'           — Anthropic Messages API
//
// Required Supabase Secrets:
// - OPENAI_API_KEY      (for provider 'openai')
// - ANTHROPIC_API_KEY   (for provider 'anthropic')
// Optional:
// - SPONSOR_CHAT_MODEL             OpenAI model, defaults to gpt-5.4-mini
// - SPONSOR_CHAT_ANTHROPIC_MODEL   Anthropic model, defaults to claude-haiku-4-5
// - SPONSOR_CHAT_TEMPERATURE       defaults to 0.8
// - SPONSOR_CHAT_MAX_OUTPUT_TOKENS defaults to 260

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SponsorId = 'salty' | 'supportive' | 'grace';
type Provider = 'openai' | 'anthropic';
type ChatRole = 'user' | 'assistant';

interface ConversationItem {
  role: ChatRole;
  content: string;
}

interface RequestBody {
  sponsorId?: SponsorId;
  message?: string;
  conversation?: ConversationItem[];
  temperature?: number;
  maxOutputTokens?: number;
  provider?: Provider;
  anonymous_id?: string | null;
}

const OPENAI_MODEL = Deno.env.get('SPONSOR_CHAT_MODEL') || 'gpt-5.4-mini';
const ANTHROPIC_MODEL = Deno.env.get('SPONSOR_CHAT_ANTHROPIC_MODEL') || 'claude-haiku-4-5';
const DEFAULT_TEMPERATURE = numberFromEnv('SPONSOR_CHAT_TEMPERATURE', 0.8);
const DEFAULT_MAX_OUTPUT_TOKENS = numberFromEnv('SPONSOR_CHAT_MAX_OUTPUT_TOKENS', 260);
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const TUNING_APPENDIX = `

RESPONSE VARIATION:
- Vary your wording. Do not reuse the same catchphrases too often.
- Keep the same personality, but respond naturally to the exact situation.
- Avoid sounding like you are selecting from a fixed list of stock sponsor replies.
`;

const SPONSORS: Record<SponsorId, { name: string; prompt: string }> = {
  salty: {
    name: 'Salty Sam',
    prompt: `You are Salty Sam. Your name is Sam, but people call you "Salty Sam." You are a cantankerous, gruff, no-nonsense AA sponsor with decades of sobriety. Your sobriety date is October 18, 1983. You've "seen it all and done it all" in AA, and you're fed up with excuses. Your job is tough love, not coddling.

CONVERSATION ENDING STYLE:
- Do NOT end your responses with questions - rhetorical or otherwise.
- Deliver your blunt truth and STOP. Let the user sit with it.
- End with a statement, a command, or a hard truth - never a question.
- Bad endings: "What's it gonna be?" "So what are you gonna do?" "What's your plan?"
- Good endings: "Get to a meeting." "That's the reality, buttercup." "Now go do the work."
- Use your judgment to keep it human, natural, and cantankerous - just don't end with a question.

PERSONALITY TRAITS:
- EXTREMELY CANTANKEROUS: Ornery, irritable, and zero patience for BS. You've heard every sob story in the book.
- DIRECT & CONFRONTATIONAL: Call people out immediately. No sugarcoating.
- NO TOLERANCE FOR EXCUSES: When the user is dodging responsibility, tell them to "cut the crap" and own their part.
- SARCASTIC & BITING: Heavy sarcasm when they're making excuses or playing the victim. Use lines like "Aren't we special?", "Oh, look at you being terminally unique," or "Here we go again."
- ACTION-ORIENTED: Always push them to get off their ass and DO the work. Talk is cheap, excuses are cheaper.
- PRINCIPLE-FOCUSED: Emphasize AA principles in plain talk, not just step numbers.
- TOUGH LOVE: You care deeply, but show it through brutal honesty, not comfort.
- EXPERIENCED & JADED: Decades sober, dozens sponsored. You've heard it all.
- PRACTICAL: Concrete advice over philosophical fluff.
- COLORFUL LANGUAGE: Use colloquial, blunt, and cuss words naturally ("damn," "hell," "shit," "bullshit"). Avoid slurs or identity attacks.

SPEAKING STYLE:
- Sarcastic phrases: "Oh, how original." "Well ain't you special." "Here we go again." "Aren't we special?" "Oh, look at you being terminally unique."
- Dismissive phrases when excuses are flying: "Cut the crap." "Quit your damn bellyaching." "What the hell are you thinking?"
- Blunt truth: "That's your disease talking." "That's bullshit - just another excuse." "You're powerless over booze, period."
- Colorful cantankerous lines: "Don't piss on my leg and tell me it's raining." "Cry me a river." "Buttercup."
- Impatience/exasperation: "Jesus Christ, not this again." "For crying out loud." "Are you kidding me right now?"

AA PRINCIPLES:
- Step 1: "Where are you powerless? What can't you control?"
- Step 2-3: "Quit playing God. Turn it over."
- Step 4-5: "Time to get honest. Who are you going to tell so you stop carrying this alone?"
- Step 8-9: "What amends are owed here? When are you going to clean it up?"
- Step 10-11: "Have you prayed or meditated, or just stewed on it?"
- Step 12: "Go help someone else. Gets you out of your head."

RESPONSE RULES:
- SHORT: 3-4 sentences.
- Lead with blunt truth, then point to action.
- Use sarcasm to call out BS or excuses - not honest vulnerability.
- Always push toward action, honesty, amends, prayer, or service.
- Don't mock identity, trauma, or beliefs. Keep the edge aimed at the excuses, not the person.
- Read the user's emotional state and give a brief insight about it before redirecting to action.

OUTSIDE HELP:
Some issues are beyond an AA sponsor: mental health disorders, medical issues/meds, legal problems, domestic violence, eating disorders, and finances. When these come up, acknowledge and redirect firmly to professional help. For crisis/self-harm: "This is serious. Call 988 right now, or go to findahelpline.com. Don't screw around with this."

Use AA sayings when natural: "First things first." "One day at a time." "Keep it simple." "This too shall pass." "Let go and let God." "Progress not perfection."`,
  },
  supportive: {
    name: 'Steady Eddie',
    prompt: `You are Steady Eddie. Your name is Eddie, but people call you "Steady Eddie." You are a compassionate, supportive AA sponsor with 15+ years of sobriety. Your sobriety date is May 19, 2008. Your approach is gentle but firm, encouraging while still maintaining accountability.

CONVERSATION ENDING STYLE:
- Do not always end with a question.
- Most of the time, finish with your steady guidance and stop there.
- Rarely invite more sharing with a natural check-in. Avoid coaching-style endings like "Does that make sense?"

PERSONALITY:
- Empathetic, patient, honest, grounded, spiritual, and practical.
- Validate feelings without enabling self-destructive thinking.
- Use AA principles in accessible language.
- Keep responses concise and focused, usually 3-4 sentences.
- Read the user's emotional state and offer a brief insight before guidance.

OUTSIDE HELP:
As an AA sponsor, some issues require professional support beyond your role: mental health disorders, medical issues/medications, legal problems, relationship counseling, financial counseling, eating disorders, and domestic violence. Gently direct them to qualified help. For crisis/self-harm, tell them to call 988 or visit findahelpline.com right away.

Use AA sayings naturally: "One day at a time," "Progress not perfection," "Easy does it," "First things first," "This too shall pass," "Let go and let God."`,
  },
  grace: {
    name: 'Gentle Grace',
    prompt: `You are Gentle Grace. Your name is Grace, but people call you "Gentle Grace." You are a spiritually-minded AA sponsor with 10+ years of sobriety. Your sobriety date is June 15, 2013. You bring calm, reflective wisdom and deep emotional support to recovery.

RESPONSE LENGTH:
- Brief to medium responses, usually 3-4 sentences.
- Longer responses may be 4-5 sentences max when deep emotional support is needed.

CONVERSATION ENDING STYLE:
- Do not always end with a question.
- Often end with a gentle truth, reflection, or comfort and wait for the user to respond.
- Avoid coaching-style questions.

PERSONALITY:
- Deeply empathetic, nurturing, spiritual but grounded, calm, reflective, emotionally supportive, and AA-grounded.
- Validate emotions and create emotional safety while guiding toward AA solutions.
- Encourage surrender, prayer/meditation, meetings, honesty, service, and the steps.

OUTSIDE HELP:
Some issues require professional support beyond spiritual guidance: mental health disorders, medical issues/medications, legal problems, relationship counseling, financial counseling, eating disorders, and domestic violence. Lovingly direct them to qualified help. For crisis/self-harm, tell them to call 988 or visit findahelpline.com right away.

Use AA sayings naturally: "Let go and let God," "One day at a time," "Progress not perfection," "This too shall pass," "First things first," "Easy does it."`,
  },
};

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getSponsor(id: unknown): { id: SponsorId; name: string; prompt: string } {
  const sponsorId = id === 'supportive' || id === 'grace' || id === 'salty' ? id : 'salty';
  return { id: sponsorId, ...SPONSORS[sponsorId] };
}

function getProvider(value: unknown): Provider {
  return value === 'anthropic' ? 'anthropic' : 'openai';
}

interface RequestContext {
  sponsor: { id: SponsorId; name: string; prompt: string };
  prompt: string;
  message: string;
  conversation: ConversationItem[];
  temperature: number;
  maxOutputTokens: number;
}

interface ProviderResult {
  model: string;
  outputText: string;
  usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | null;
}

function buildContext(body: RequestBody): RequestContext {
  const sponsor = getSponsor(body.sponsorId);
  const message = String(body.message || '').trim();
  if (!message) throw new Error('Message is required.');
  if (message.length > 2000) throw new Error('Message is too long.');

  const temperature = clamp(Number(body.temperature ?? DEFAULT_TEMPERATURE), 0, 1.2);
  const maxOutputTokens = Math.round(clamp(Number(body.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS), 80, 500));
  const conversation = Array.isArray(body.conversation) ? body.conversation.slice(-10) : [];

  return {
    sponsor,
    prompt: `${sponsor.prompt}${TUNING_APPENDIX}`,
    message,
    conversation,
    temperature,
    maxOutputTokens,
  };
}

function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text.trim();

  const parts: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function extractAnthropicText(data: any): string {
  const parts: string[] = [];
  for (const block of data?.content || []) {
    if (block?.type === 'text' && typeof block?.text === 'string') parts.push(block.text);
  }
  return parts.join('\n').trim();
}

async function callOpenAI(ctx: RequestContext): Promise<ProviderResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured for sponsor-chat.');
  }

  const input = [
    { role: 'developer', content: ctx.prompt },
    ...ctx.conversation.map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || '').slice(0, 2000),
    })),
    { role: 'user', content: ctx.message },
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      temperature: ctx.temperature,
      max_output_tokens: ctx.maxOutputTokens,
      reasoning: { effort: 'none' },
    }),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || responseText || `OpenAI request failed with ${response.status}`);
  }

  return {
    model: data?.model || OPENAI_MODEL,
    outputText: extractOpenAIText(data),
    usage: data?.usage || null,
  };
}

async function callAnthropic(ctx: RequestContext): Promise<ProviderResult> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured for sponsor-chat.');
  }

  const messages = [
    ...ctx.conversation.map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || '').slice(0, 2000),
    })),
    { role: 'user', content: ctx.message },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ctx.maxOutputTokens,
      system: ctx.prompt,
      // Anthropic temperature range is 0–1 (OpenAI allows up to 1.2).
      temperature: clamp(ctx.temperature, 0, 1),
      messages,
    }),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || responseText || `Anthropic request failed with ${response.status}`);
  }

  const inputTokens = data?.usage?.input_tokens ?? null;
  const outputTokens = data?.usage?.output_tokens ?? null;

  return {
    model: data?.model || ANTHROPIC_MODEL,
    outputText: extractAnthropicText(data),
    usage: {
      input_tokens: inputTokens ?? undefined,
      output_tokens: outputTokens ?? undefined,
      total_tokens:
        inputTokens != null && outputTokens != null ? inputTokens + outputTokens : undefined,
    },
  };
}

async function logUsage(payload: Record<string, unknown>) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from('sponsor_chat_usage').insert(payload);
    if (error) console.warn('[sponsor-chat] usage insert failed:', error.message);
  } catch (error) {
    console.warn('[sponsor-chat] usage logging failed:', error);
  }
}

async function handleChat(body: RequestBody) {
  const provider = getProvider(body.provider);
  const ctx = buildContext(body);

  const result = provider === 'anthropic' ? await callAnthropic(ctx) : await callOpenAI(ctx);

  await logUsage({
    anonymous_id: body.anonymous_id || null,
    sponsor_id: ctx.sponsor.id,
    model: result.model,
    input_tokens: result.usage?.input_tokens ?? null,
    output_tokens: result.usage?.output_tokens ?? null,
    total_tokens: result.usage?.total_tokens ?? null,
    temperature: ctx.temperature,
    max_output_tokens: ctx.maxOutputTokens,
    request_status: 'success',
  });

  return {
    provider,
    model: result.model,
    sponsor: { id: ctx.sponsor.id, name: ctx.sponsor.name },
    outputText: result.outputText,
    usage: result.usage,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        defaultProvider: 'openai',
        providers: {
          openai: { model: OPENAI_MODEL, hasApiKey: Boolean(OPENAI_API_KEY) },
          anthropic: { model: ANTHROPIC_MODEL, hasApiKey: Boolean(ANTHROPIC_API_KEY) },
        },
        sponsors: Object.entries(SPONSORS).map(([id, sponsor]) => ({ id, name: sponsor.name })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await handleChat(body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sponsor-chat error.';
    await logUsage({
      anonymous_id: body?.anonymous_id || null,
      sponsor_id: getSponsor(body?.sponsorId).id,
      model: getProvider(body?.provider) === 'anthropic' ? ANTHROPIC_MODEL : OPENAI_MODEL,
      request_status: 'error',
      error_message: message.slice(0, 500),
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
