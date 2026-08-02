// Server-side Mixpanel events for the pass funnel (granted → sent →
// dispensed → redeemed). The client half of the funnel is lib/analytics.ts
// (gift_shared); the RC→Mixpanel integration covers iOS redemptions and
// cliff conversions. This covers the stages only our servers see.
//
// Fire-and-forget by contract: analytics must NEVER fail or slow the
// business call.
//
// $insert_id gives every event a natural idempotency key (grant key, share
// token, gift code), so a retried edge-function call can't double-count.

const MIXPANEL_TRACK_URL = 'https://api.mixpanel.com/track?verbose=1';

// The project token is baked in because Neal's CLI token can't reach the
// secrets endpoint (same limitation recorded on FOUNDING_CREDITS_ENABLED in
// credits.ts). Safe: this is the CLIENT project token — it already ships in
// every app bundle — not a secret. A MIXPANEL_TOKEN secret, if ever set via
// the dashboard, overrides it (rotation path).
const DEFAULT_MIXPANEL_TOKEN = 'cfad09b0133277969b37136d88172419';

export async function trackServerEvent(
  event: string,
  distinctId: string,
  insertId: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  const token = Deno.env.get('MIXPANEL_TOKEN') ?? DEFAULT_MIXPANEL_TOKEN;
  if (!token) return;
  try {
    const payload = [{
      event,
      properties: {
        token,
        distinct_id: distinctId,
        $insert_id: insertId.slice(0, 36),
        time: Math.floor(Date.now() / 1000),
        mp_lib: 'server',
        source: 'edge_function',
        environment: Deno.env.get('ANALYTICS_ENV') ?? 'production',
        ...props,
      },
    }];
    const res = await fetch(MIXPANEL_TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.warn('[mixpanel]', event, 'HTTP', res.status);
  } catch (e) {
    console.warn('[mixpanel]', event, 'failed:', (e as Error).message);
  }
}

// Funnel stage 1, shared by credits-status and credits-share (both heal
// grants). `fresh` is ensureGrants' newly-inserted-only return.
export async function trackPassGranted(
  anonymousId: string,
  fresh: Array<{ grant_key: string; credits: number }>,
): Promise<void> {
  for (const g of fresh) {
    await trackServerEvent('pass_granted', anonymousId, `${anonymousId}:${g.grant_key}`, {
      grant_key: g.grant_key,
      credits: g.credits,
      tier: g.grant_key.startsWith('annual') ? 'annual'
        : g.grant_key.startsWith('founding') ? 'founding' : 'monthly',
    });
  }
}
