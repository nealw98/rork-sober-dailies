// "Call my sponsor" daily — the saved sponsor contact (ONE person, separate
// from the Reach Out list). Local-only ({name, phone} in AsyncStorage); the
// key is in Backup & Restore's SYNC_KEYS so the sponsor follows a reinstall.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sponsor_contact_v1';

export type SponsorContact = { name: string; phone: string };

export async function getSponsorContact(): Promise<SponsorContact | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.name && parsed?.phone ? { name: String(parsed.name), phone: String(parsed.phone) } : null;
  } catch {
    return null;
  }
}

export async function setSponsorContact(contact: SponsorContact): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(contact));
  } catch {}
}
