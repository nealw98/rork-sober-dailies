// Store-review unlock: lets an app reviewer past the paywall without billing.
//
// Google Play rejected 3.5 (build 141) because its reviewer could not reach the
// app behind the subscription paywall, and a free trial still asks for a
// payment method. Play asks for "a way to bypass all payment gates", so the
// Android paywall has a "Have a code?" link that posts here.
//
// The code lives only in the REVIEW_UNLOCK_CODE secret. Unset it (or change
// it) and every request fails — that is the off switch, no app update needed:
//   supabase secrets set REVIEW_UNLOCK_CODE=...      (on: before submitting)
//   supabase secrets unset REVIEW_UNLOCK_CODE        (off: after approval)
//
// A valid code grants the `premium` entitlement as a RevenueCat promotional
// grant to the caller's RC app user, for one month. The client then re-reads
// CustomerInfo and the normal entitlement check unlocks the app — nothing on
// the client decides access by itself.
//
// Android only: on iOS, unlocking paid content with a code outside in-app
// purchase breaks App Store guideline 3.1.1, and Apple's reviewer uses sandbox
// purchases anyway.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, fetchRcSubscriber, json } from '../_shared/gifts.ts';

const ENTITLEMENT_ID = 'premium';
const GRANT_DURATION = 'monthly';
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

function normalize(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

// Constant-time compare so response timing says nothing about the code.
function sameCode(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, reason: 'invalid' }, 405);

  try {
    const { code, rc_app_user_id, platform } = await req.json();

    const expected = Deno.env.get('REVIEW_UNLOCK_CODE');
    if (!expected) return json({ success: false, reason: 'invalid' }, 403);

    if (
      platform !== 'android' ||
      typeof code !== 'string' ||
      typeof rc_app_user_id !== 'string' ||
      rc_app_user_id.trim().length < 8 ||
      !sameCode(normalize(code), normalize(expected))
    ) {
      console.log('[review-unlock] rejected attempt');
      return json({ success: false, reason: 'invalid' }, 403);
    }

    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!secretKey) {
      console.error('[review-unlock] REVENUECAT_SECRET_API_KEY not set');
      return json({ success: false, reason: 'server' }, 500);
    }

    // RevenueCat's v1 GET creates the subscriber if it doesn't exist yet, so
    // the promotional grant below always has someone to attach to.
    await fetchRcSubscriber(rc_app_user_id.trim(), secretKey);

    const res = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(rc_app_user_id.trim())}/entitlements/${ENTITLEMENT_ID}/promotional`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: GRANT_DURATION }),
      },
    );
    if (!res.ok) {
      console.error('[review-unlock] RevenueCat grant failed:', res.status, await res.text());
      return json({ success: false, reason: 'server', rc_status: res.status }, 502);
    }

    console.log(`[review-unlock] granted ${GRANT_DURATION} premium to ${rc_app_user_id}`);
    return json({ success: true });
  } catch (error) {
    console.error('[review-unlock] failed:', error);
    return json({ success: false, reason: 'server' }, 500);
  }
});
