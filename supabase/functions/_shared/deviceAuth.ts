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

export async function sha256Hex(input: string): Promise<string> {
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

  if (!secret) {
    const { count, error } = await supabase
      .from('device_claims')
      .select('secret_hash', { count: 'exact', head: true })
      .eq('anonymous_id', anonymousId);
    if (error) throw error;
    return !opts.requireSecret && (count ?? 0) === 0 ? 'ok' : 'denied';
  }
  const secretHash = await sha256Hex(secret);

  const { data: exact, error } = await supabase
    .from('device_claims')
    .select('secret_hash')
    .eq('anonymous_id', anonymousId)
    .eq('secret_hash', secretHash)
    .maybeSingle();
  if (error) throw error;
  if (exact) return 'ok';

  const { count, error: countError } = await supabase
    .from('device_claims')
    .select('secret_hash', { count: 'exact', head: true })
    .eq('anonymous_id', anonymousId);
  if (countError) throw countError;

  if ((count ?? 0) === 0) {
    // Race: two first-calls using the same installation secret can collide on
    // the composite key. Re-verify instead of trusting our own write.
    const { error: insErr } = await supabase
      .from('device_claims')
      .insert({ anonymous_id: anonymousId, secret_hash: secretHash });
    if (!insErr) return 'ok';
    const { data: again } = await supabase
      .from('device_claims')
      .select('secret_hash')
      .eq('anonymous_id', anonymousId)
      .eq('secret_hash', secretHash)
      .maybeSingle();
    return again ? 'ok' : 'denied';
  }

  return 'denied';
}
