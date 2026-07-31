// Proof that the caller owns the anonymous_id it is spending passes under.
// See supabase/migrations/20260730_device_claims.sql for the why.
//
// Trust-on-first-use. Three outcomes:
//   unclaimed + secret   → claim it, allow
//   unclaimed + no secret→ allow only when the caller opted out of the
//                          requirement (read-only paths); never squats a claim
//   claimed              → allow only on an exact secret match
//
// deno-lint-ignore-file no-explicit-any

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type DeviceAuthResult = 'ok' | 'denied';

export async function verifyDevice(
  supabase: any,
  anonymousId: string,
  deviceSecret: unknown,
  opts: { requireSecret: boolean },
): Promise<DeviceAuthResult> {
  // Anything shorter than this isn't one of ours (the client mints 32 bytes).
  const secret = typeof deviceSecret === 'string' && deviceSecret.length >= 32 ? deviceSecret : null;

  const { data, error } = await supabase
    .from('device_claims')
    .select('secret_hash')
    .eq('anonymous_id', anonymousId)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    if (!secret) return opts.requireSecret ? 'denied' : 'ok';
    // Race: two first-calls at once. The PK makes the loser's insert fail, so
    // re-verify instead of trusting our own write.
    const { error: insErr } = await supabase
      .from('device_claims')
      .insert({ anonymous_id: anonymousId, secret_hash: await sha256Hex(secret) });
    if (!insErr) return 'ok';
    const { data: again } = await supabase
      .from('device_claims')
      .select('secret_hash')
      .eq('anonymous_id', anonymousId)
      .maybeSingle();
    return again && again.secret_hash === (await sha256Hex(secret)) ? 'ok' : 'denied';
  }

  if (!secret) return 'denied';
  return (await sha256Hex(secret)) === data.secret_hash ? 'ok' : 'denied';
}
