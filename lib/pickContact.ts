// Reach Out — OS contact picker handoff. presentContactPickerAsync opens the
// native picker and returns ONLY the chosen contact, so no full read-contacts
// permission is needed. Returns the name + first phone number, or null if the
// user cancels / the picker is unavailable.
import * as Contacts from 'expo-contacts';

export type PickedContact = { name: string; phone: string };

export async function pickContact(): Promise<PickedContact | null> {
  try {
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;
    const name = (
      contact.name ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      'Contact'
    ).trim();
    const phone =
      contact.phoneNumbers && contact.phoneNumbers[0] ? contact.phoneNumbers[0].number ?? '' : '';
    return { name, phone };
  } catch (e) {
    console.warn('[reach-out] contact pick failed', e);
    return null;
  }
}
