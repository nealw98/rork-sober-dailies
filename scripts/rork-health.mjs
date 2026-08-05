// Rork toolkit health check: N sequential real-sized calls, latency
// distribution + stall rate. Re-run any time to see if Rork is healing.
import { readFileSync } from 'fs';
const prompt = readFileSync('constants/salty-sam.ts', 'utf8').match(/SALTY_SAM_SYSTEM_PROMPT = `(.*?)`;/s)[1];
const N = 15;
const CAP = 25000;

const results = [];
for (let i = 0; i < N; i++) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), CAP);
  const t0 = Date.now();
  let ok = false;
  try {
    const r = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: `${prompt}\n\nUser: Test ${i}: I skipped my meeting again, work is crazy.` }] }),
      signal: c.signal,
    });
    ok = r.status === 200 && !!(await r.json()).completion;
  } catch { /* timeout or network */ }
  clearTimeout(t);
  results.push({ ms: Date.now() - t0, ok });
  process.stdout.write((ok ? '.' : 'X'));
}
console.log('');
const oks = results.filter(r => r.ok).map(r => r.ms).sort((a, b) => a - b);
const stalls = results.filter(r => !r.ok).length;
const pct = (p) => oks[Math.min(oks.length - 1, Math.floor(oks.length * p))];
console.log(`ok: ${oks.length}/${N} · stalls(>${CAP / 1000}s or error): ${stalls}`);
if (oks.length) console.log(`latency ok-calls: min ${oks[0]}ms · median ${pct(0.5)}ms · p90 ${pct(0.9)}ms · max ${oks[oks.length - 1]}ms`);
