// Invite Friends — unique-send counting client (funnel telemetry for the
// acquisition program; docs/invite-rewards-design.md §4b/§4c).
//
// Privacy contract: recipient phone numbers NEVER leave the device. Each
// number is normalized and hashed here (SHA-256, salted with the sender's own
// anonymous_id so the same friend hashes differently for different senders),
// and only the hash goes to the invites-report edge function. Reporting is
// best-effort — a network failure loses a tally, never blocks an invite.
import * as Crypto from 'expo-crypto';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';

export interface InviteSendTotals {
  uniqueSends: number;
  totalSends: number;
}

// Collapse formatting variants of the same number ("(555) 123-4567" vs
// "+15551234567") to one key: digits only, minus the US country code. Foreign
// numbers just stay digits — consistent within a sender, which is all
// uniqueness needs.
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits;
}

async function hashRecipient(anonymousId: string, phone: string): Promise<string | null> {
  const digits = normalizePhone(phone);
  if (digits.length < 7) return null; // not a real number; don't count it
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${anonymousId}:${digits}`);
}

async function callReport(recipientHashes: string[]): Promise<InviteSendTotals | null> {
  const anonymous_id = await getAnonymousId();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/invites-report`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ anonymous_id, recipient_hashes: recipientHashes }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) return null;
  return { uniqueSends: data.unique_sends ?? 0, totalSends: data.total_sends ?? 0 };
}

// Report a batch of sent invites. Returns the sender's updated totals, or
// null on failure (callers treat this as "totals unknown", never an error).
export async function reportInviteSends(phones: string[]): Promise<InviteSendTotals | null> {
  try {
    const anonymousId = await getAnonymousId();
    const hashes = (await Promise.all(phones.map((p) => hashRecipient(anonymousId, p))))
      .filter((h): h is string => h !== null)
      .map((h) => h.toLowerCase());
    if (hashes.length === 0) return null;
    return await callReport(hashes);
  } catch (e) {
    console.warn('[inviteService] report failed', e);
    return null;
  }
}

// Current totals without reporting anything (progress display).
export async function getInviteSendTotals(): Promise<InviteSendTotals | null> {
  try {
    return await callReport([]);
  } catch (e) {
    console.warn('[inviteService] status failed', e);
    return null;
  }
}
