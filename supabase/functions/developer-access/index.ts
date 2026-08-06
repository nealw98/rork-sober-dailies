// Fail-closed authorization for the hidden Developer Console.
// A visible Support ID is not proof: the caller must also possess the private
// device secret, and the verified id must have an enabled server-side record.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';
import { verifyDevice } from '../_shared/deviceAuth.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ authorized: false }, 405);

  try {
    const { anonymous_id, device_secret } = await req.json();
    if (typeof anonymous_id !== 'string' || anonymous_id.trim().length < 8) {
      return json({ authorized: false }, 403);
    }

    const supabase = serviceClient();
    if ((await verifyDevice(supabase, anonymous_id.trim(), device_secret, { requireSecret: true })) !== 'ok') {
      return json({ authorized: false }, 403);
    }

    const { data, error } = await supabase
      .from('authorized_devices')
      .select('role, capabilities, expires_at')
      .eq('anonymous_id', anonymous_id.trim())
      .eq('enabled', true)
      .maybeSingle();
    if (error) throw error;

    const active = !!data && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
    if (!active) return json({ authorized: false }, 403);

    return json({
      authorized: true,
      role: data.role,
      capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
    });
  } catch (error) {
    console.error('[developer-access] authorization failed:', error);
    return json({ authorized: false }, 503);
  }
});
