// Pass It On — return a giver's wallet (codes + states).
//
// Read-only. The client calls this on wallet open to sync redeemed states that
// happened on other people's devices. Access is service-role only (RLS blocks
// the anon key), and a caller only ever gets codes filed under the anonymous_id
// they pass — which is their own device identity.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient, fetchWallet } from '../_shared/gifts.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { anonymous_id } = await req.json();
    if (!anonymous_id) return json({ success: false, message: 'Missing anonymous_id' }, 400);

    const wallet = await fetchWallet(serviceClient(), anonymous_id);
    return json({ success: true, wallet });
  } catch (e) {
    console.error('[gifts-wallet] error:', e);
    return json({ success: false, message: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
