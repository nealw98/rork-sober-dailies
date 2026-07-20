// Gift credits — consume one credit, mint a share token.
//
// POST { anonymous_id, rc_app_user_id }
//  → { success, token, link, balance }        (balance = after this share)
//  → { success: false, reason: 'no_credits' } (nothing consumed)
//
// The token is the gift artifact: the app texts soberdailies.com/get?g=<token>
// and the recipient's plan choice on /get later binds an Apple offer code to
// it (get-dispense). No code leaves inventory at share time.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient, fetchRcSubscriber } from '../_shared/gifts.ts';
import {
  computeEarnedGrants, ensureGrants, getCreditState, foundingEligible, generateShareToken,
} from '../_shared/credits.ts';

const GET_URL = 'https://soberdailies.com/get';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, rc_app_user_id } = await req.json();
    if (!anonymous_id || typeof anonymous_id !== 'string') {
      return json({ success: false, message: 'Missing anonymous_id' }, 400);
    }

    const supabase = serviceClient();

    // Heal grants first so a just-earned credit is spendable immediately.
    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (secretKey && typeof rc_app_user_id === 'string' && rc_app_user_id.length > 0) {
      const subscriber = await fetchRcSubscriber(rc_app_user_id, secretKey);
      const founding = await foundingEligible(supabase, anonymous_id);
      await ensureGrants(supabase, anonymous_id, computeEarnedGrants(subscriber, { founding }));
    }

    const before = await getCreditState(supabase, anonymous_id);
    if (before.balance <= 0) {
      return json({ success: false, reason: 'no_credits', balance: before.balance }, 403);
    }

    const token = generateShareToken();
    const { error: insertErr } = await supabase
      .from('gift_shares')
      .insert({ token, sender_anonymous_id: anonymous_id });
    if (insertErr) throw insertErr;

    // Compensate the check-then-insert race: if concurrent shares drove the
    // balance negative, the latest one backs out.
    const after = await getCreditState(supabase, anonymous_id);
    if (after.balance < 0) {
      await supabase.from('gift_shares').delete().eq('token', token);
      return json({ success: false, reason: 'no_credits', balance: after.balance + 1 }, 403);
    }

    return json({ success: true, token, link: `${GET_URL}?g=${token}`, balance: after.balance });
  } catch (e) {
    console.error('[credits-share] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
