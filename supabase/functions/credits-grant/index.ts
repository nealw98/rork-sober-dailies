// Gift credits — MANUAL grant (Developer Console only).
//
// POST { anonymous_id, credits }
//  → { success, balance, total_granted, shares_used, grant_key }
//
// The automatic path (credits-status → computeEarnedGrants) derives grants from
// RevenueCat subscription state: 5 for an annual year, 1 at monthly signup, 1
// per 3 paid months. This function writes the SAME kind of row into the SAME
// ledger — it just skips the derivation, so passes can be handed out for
// promotion without a subscription event to hang them on.
//
// Grant keys are `manual_<iso>`, which no computed key can ever collide with,
// so grant-on-read (upsert … ignoreDuplicates) leaves these rows alone forever.
// Balance stays sum(grants) − count(shares); nothing else in the pipeline has
// to know these are hand-made.
//
// GUARD: this endpoint is reachable by anyone holding the anon key (it ships in
// the client bundle), so it fails closed against an allowlist —
// DEV_GRANT_ANONYMOUS_IDS, a comma-separated list of device anonymous_ids.
// Unset means nobody can grant, which is the correct production posture.
//
// Required Supabase secrets: DEV_GRANT_ANONYMOUS_IDS, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (last two auto-provided).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';
import { getCreditState } from '../_shared/credits.ts';

// A hand grant is a QA/promo action, not a bulk loader — cap it so a fat finger
// (or a leaked allowlisted id) can't mint a thousand passes in one call.
const MAX_CREDITS_PER_CALL = 25;

function allowlisted(anonymousId: string): boolean {
  const raw = Deno.env.get('DEV_GRANT_ANONYMOUS_IDS') ?? '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(anonymousId);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, credits } = await req.json();

    if (!anonymous_id || typeof anonymous_id !== 'string') {
      return json({ success: false, reason: 'bad_request', message: 'Missing anonymous_id' }, 400);
    }

    const n = Number(credits);
    if (!Number.isInteger(n) || n < 1 || n > MAX_CREDITS_PER_CALL) {
      return json({
        success: false,
        reason: 'bad_request',
        message: `credits must be a whole number from 1 to ${MAX_CREDITS_PER_CALL}`,
      }, 400);
    }

    if (!allowlisted(anonymous_id)) {
      // Deliberately vague to the caller, loud in the logs.
      console.warn('[credits-grant] denied, not allowlisted:', anonymous_id);
      return json({ success: false, reason: 'forbidden', message: 'Not permitted on this device.' }, 403);
    }

    const supabase = serviceClient();
    const grant_key = `manual_${new Date().toISOString()}`;

    const { error } = await supabase
      .from('gift_credit_grants')
      .insert({ anonymous_id, grant_key, credits: n });
    if (error) throw error;

    const state = await getCreditState(supabase, anonymous_id);
    console.log(`[credits-grant] +${n} to ${anonymous_id} (${grant_key}) → balance ${state.balance}`);
    return json({ success: true, grant_key, ...state });
  } catch (e) {
    console.error('[credits-grant] error:', e);
    return json({ success: false, reason: 'server_error', message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
