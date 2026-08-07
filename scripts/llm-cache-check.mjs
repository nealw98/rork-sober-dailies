// LLM cache + cost check. Sends two IDENTICAL calls per provider through the
// sponsor-chat fn and prints the usage breakdown, so you can see how much of
// the persona prompt was served from cache on the repeat.
//
//   node scripts/llm-cache-check.mjs
//
// Reads the endpoint + anon key straight out of lib/sponsorApiSettings.ts so
// it can't drift from the app. Salty Sam on purpose — the biggest persona
// prompt, so the cacheable prefix is as large as it gets in this app.
//
// What "healthy" looks like:
//   Anthropic — call 1 writes N cache_creation tokens, call 2 reads N back.
//   OpenAI    — call 2 shows input_tokens_details.cached_tokens > 0.
// See docs/llm-cost-and-caching.md for what the numbers mean and why OpenAI
// currently reports zero.
import { readFileSync } from 'fs';

const settings = readFileSync('lib/sponsorApiSettings.ts', 'utf8');
const ENDPOINT = settings.match(/SPONSOR_API_URL\s*=[\s\S]*?'(https:\/\/[^']+)'/)[1];
const KEY = settings.match(/SUPABASE_ANON_KEY\s*=\s*\n?\s*'([^']+)'/)[1];

const PROMPT = 'I skipped my meeting again, work is crazy.';
const ENGINES = [
  ['openai', 'gpt-5.6-luna'],
  ['openai', 'gpt-5.6-terra'],
  ['anthropic', 'claude-sonnet-4-6'],
];

// Full-price-equivalent input tokens, so the two providers are comparable.
// Both providers' cached reads are 0.1x. Anthropic and GPT-5.6 cache writes
// are 1.25x; GPT-5.4 automatic cache writes have no surcharge.
const weight = { cachedRead: 0.1, cacheWrite: 1.25 };

const call = (provider, model) =>
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      sponsorId: 'salty', message: PROMPT, conversation: [],
      temperature: 1.0, maxOutputTokens: 260, provider, model,
      anonymous_id: 'llm-cache-check',
    }),
  }).then((r) => r.json());

for (const [provider, model] of ENGINES) {
  console.log(`\n═══ ${provider} / ${model}`);
  for (let i = 1; i <= 2; i++) {
    const d = await call(provider, model);
    const u = d.usage ?? {};
    if (!d.outputText) { console.log(`  call ${i}: ERROR ${JSON.stringify(d).slice(0, 200)}`); continue; }
    const fresh = u.input_tokens ?? 0;
    const aRead = u.cache_read_input_tokens ?? 0;
    const aWrite = u.cache_creation_input_tokens ?? 0;
    const oCached = u.input_tokens_details?.cached_tokens ?? 0;
    const oWrite = u.input_tokens_details?.cache_write_tokens ?? 0;
    const equiv = provider === 'anthropic'
      ? fresh + aRead * weight.cachedRead + aWrite * weight.cacheWrite
      : (fresh - oCached - oWrite) + oCached * weight.cachedRead + oWrite * weight.cacheWrite;
    const cached = provider === 'anthropic' ? aRead : oCached;
    const written = provider === 'anthropic' ? aWrite : oWrite;
    console.log(
      `  call ${i}: in=${fresh} cached=${cached}${written ? ` write=${written}` : ''} ` +
      `out=${u.output_tokens ?? '?'} → ${Math.round(equiv)} full-price-equiv input tokens`,
    );
  }
}
console.log('\nCall 2 is the one that matters — call 1 is always a cold cache.');
