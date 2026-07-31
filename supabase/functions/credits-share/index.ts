// Gift credits — mint a share token, and mark one as delivered.
//
// POST { anonymous_id, rc_app_user_id }
//  → { success, token, link, balance }        (balance is UNCHANGED — see below)
//  → { success: false, reason: 'no_credits' } (nothing minted)
//
// POST { anonymous_id, action: 'confirm_sent', token }
//  → { success, balance }                     (balance = after spending it)
//
// The token is the gift artifact: the app texts soberdailies.com/get?g=<token>
// and the recipient's plan choice on /get later binds an Apple offer code to
// it (get-dispense). No code leaves inventory at share time.
//
// Minting is FREE (Neal, 2026-07-27). A pass is spent when the text is
// delivered and the client calls confirm_sent, because a link nobody received
// costs nothing. Minting still requires a positive balance, so a member can't
// stockpile links; the client holds at most one unsent token at a time.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient, fetchRcSubscriber } from '../_shared/gifts.ts';
import {
  computeEarnedGrants, ensureGrants, getCreditState, foundingEligible, generateShareToken,
} from '../_shared/credits.ts';
import { verifyDevice } from '../_shared/deviceAuth.ts';

const GET_URL = 'https://soberdailies.com/get';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, rc_app_user_id, device_secret, action, token: sentToken } = await req.json();
    if (!anonymous_id || typeof anonymous_id !== 'string') {
      return json({ success: false, message: 'Missing anonymous_id' }, 400);
    }

    const supabase = serviceClient();

    // Both paths below move a pass, so the caller has to prove it owns this id.
    // Strict: an unclaimed id with no secret is refused rather than allowed
    // through, because every client that can reach this code sends one.
    if ((await verifyDevice(supabase, anonymous_id, device_secret, { requireSecret: true })) !== 'ok') {
      return json({ success: false, reason: 'device_unverified' }, 403);
    }

    // The text went out — this is the moment the pass is actually spent.
    // Idempotent (the sent_at guard) so a retried confirm can't double-stamp,
    // and scoped to the sender so a leaked token can't be used to drain
    // someone else's balance. No grant healing needed to stamp.
    if (action === 'confirm_sent') {
      if (!sentToken || typeof sentToken !== 'string') {
        return json({ success: false, message: 'Missing token' }, 400);
      }
      const { error: stampErr } = await supabase
        .from('gift_shares')
        .update({ sent_at: new Date().toISOString() })
        .eq('token', sentToken)
        .eq('sender_anonymous_id', anonymous_id)
        .is('sent_at', null);
      if (stampErr) throw stampErr;
      const state = await getCreditState(supabase, anonymous_id);
      return json({ success: true, balance: state.balance });
    }

    // Heal grants first so a just-earned credit is spendable immediately.
    // (Named for the RC key — unrelated to the device secret above.)
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

    // The old check-then-insert compensation lived here. It is gone because
    // the insert no longer moves the balance — an unsent row doesn't count —
    // so the mint race it guarded can't overspend. The equivalent race now
    // sits at confirm_sent, where it is unfixable by design: the text is
    // already delivered, so the only possible outcome is one extra pass given.
    // A pass is a ~$0 acquisition asset (docs/invite-rewards-design.md §0), so
    // over-giving is the cheap direction to be wrong in.
    const after = await getCreditState(supabase, anonymous_id);
    return json({ success: true, token, link: `${GET_URL}?g=${token}`, balance: after.balance });
  } catch (e) {
    console.error('[credits-share] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
