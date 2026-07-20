// Invite Friends — record unique sends and return the sender's totals.
//
// POST { anonymous_id, recipient_hashes?: string[] }
//  → { success, unique_sends, total_sends }
//
// recipient_hashes are SHA-256 hex digests computed on the device (salted with
// the sender's own anonymous_id; the server never
// sees a phone number. The invite_sends_report SQL function upserts on the
// (sender, hash) PK, so re-sends to the same friend count once. An
// empty/absent array turns the call into a pure status read.
//
// Counting only: sends are funnel telemetry for the acquisition program
// (docs/invite-rewards-design.md §4c). The sends-based reward that briefly
// lived here was retired before deploy — giver rewards are gift credits now.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';

// A composer batch is at most the friends someone picked in one sitting; 50 is
// far above any real batch and keeps a hostile client from bulk-inserting.
const MAX_HASHES_PER_CALL = 50;
const HASH_RE = /^[0-9a-f]{64}$/;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id, recipient_hashes } = await req.json();
    if (!anonymous_id || typeof anonymous_id !== 'string') {
      return json({ success: false, message: 'Missing anonymous_id' }, 400);
    }

    // Dedupe is load-bearing: a hash repeated inside one INSERT..ON CONFLICT
    // statement is a Postgres error, not an upsert.
    const hashes: string[] = Array.isArray(recipient_hashes)
      ? [...new Set(recipient_hashes)]
          .filter((h) => typeof h === 'string' && HASH_RE.test(h))
          .slice(0, MAX_HASHES_PER_CALL)
      : [];

    const { data, error } = await serviceClient().rpc('invite_sends_report', {
      p_sender: anonymous_id,
      p_hashes: hashes,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return json({
      success: true,
      unique_sends: row?.unique_sends ?? 0,
      total_sends: row?.total_sends ?? 0,
    });
  } catch (e) {
    console.error('[invites-report] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
