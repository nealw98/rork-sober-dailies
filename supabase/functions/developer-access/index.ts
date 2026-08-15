// Authorization for the hidden Developer Console.
//
// The Support ID *is* the credential: a tester sends theirs, it goes in
// authorized_devices, and that device is in. Nothing else to hold or transfer.
//
// There used to be a device-secret challenge here with a PIN fallback, a
// rate-limited attempts table and a shared env secret. It was removed: it
// guarded the log viewer while dev_grant_passes — the capability that actually
// mints paid subscriptions — was reachable by anonymous_id alone, so the
// challenge protected the cheap thing and not the expensive one. Worse, the
// secret is device-local and any reinstall wipes it, so the routine event
// (a rebuilt test device) looked identical to an attack and locked the owner
// out of their own console. If proof-of-possession comes back, it belongs on
// dev_grant_passes, not here.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ authorized: false }, 405);

  try {
    const { anonymous_id } = await req.json();
    if (typeof anonymous_id !== 'string' || anonymous_id.trim().length < 8) {
      return json({ authorized: false }, 403);
    }

    const supabase = serviceClient();

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
