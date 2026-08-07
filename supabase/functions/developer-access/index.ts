// Fail-closed authorization for the hidden Developer Console.
// A visible Support ID is not proof: the caller must also possess the private
// device secret, and the verified id must have an enabled server-side record.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json, serviceClient } from '../_shared/gifts.ts';
import { sha256Hex, verifyDevice } from '../_shared/deviceAuth.ts';

const PIN_WINDOW_MS = 15 * 60 * 1000;
const PIN_MAX_ATTEMPTS = 5;

function secureEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return mismatch === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ authorized: false }, 405);

  try {
    const { anonymous_id, device_secret, pin } = await req.json();
    if (typeof anonymous_id !== 'string' || anonymous_id.trim().length < 8) {
      return json({ authorized: false }, 403);
    }

    const supabase = serviceClient();
    const anonymousId = anonymous_id.trim();

    const { data, error } = await supabase
      .from('authorized_devices')
      .select('role, capabilities, expires_at')
      .eq('anonymous_id', anonymousId)
      .eq('enabled', true)
      .maybeSingle();
    if (error) throw error;

    const active = !!data && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
    if (!active) return json({ authorized: false }, 403);

    let deviceVerified = (await verifyDevice(supabase, anonymousId, device_secret, { requireSecret: true })) === 'ok';
    if (!deviceVerified) {
      if (typeof pin !== 'string' || pin.length === 0) {
        return json({ authorized: false, pin_required: true }, 403);
      }

      const now = Date.now();
      const { data: attemptRow, error: attemptReadError } = await supabase
        .from('developer_pin_attempts')
        .select('attempts, window_started_at')
        .eq('anonymous_id', anonymousId)
        .maybeSingle();
      if (attemptReadError) throw attemptReadError;
      const windowStart = attemptRow ? new Date(attemptRow.window_started_at).getTime() : now;
      const inWindow = now - windowStart < PIN_WINDOW_MS;
      const attempts = inWindow ? attemptRow?.attempts ?? 0 : 0;
      if (attempts >= PIN_MAX_ATTEMPTS) {
        return json({ authorized: false, pin_required: true, locked: true }, 429);
      }

      const configuredPin = Deno.env.get('DEVELOPER_ACCESS_PIN') ?? '';
      if (!configuredPin || !secureEqual(pin, configuredPin)) {
        const { error: attemptWriteError } = await supabase
          .from('developer_pin_attempts')
          .upsert({
            anonymous_id: anonymousId,
            attempts: attempts + 1,
            window_started_at: inWindow ? new Date(windowStart).toISOString() : new Date(now).toISOString(),
            updated_at: new Date(now).toISOString(),
          });
        if (attemptWriteError) throw attemptWriteError;
        return json({ authorized: false, pin_required: true }, 403);
      }

      if (typeof device_secret !== 'string' || device_secret.length < 32) {
        return json({ authorized: false, pin_required: true }, 403);
      }
      const { error: enrollError } = await supabase.from('device_claims').upsert({
        anonymous_id: anonymousId,
        secret_hash: await sha256Hex(device_secret),
      });
      if (enrollError) throw enrollError;
      await supabase.from('developer_pin_attempts').delete().eq('anonymous_id', anonymousId);
      deviceVerified = true;
    }

    if (!deviceVerified) return json({ authorized: false }, 403);

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
