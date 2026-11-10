// Reach Out — OS contact picker handoff. presentContactPickerAsync opens the
// native picker and returns the chosen contact's name + first phone number,
// or null if the user cancels / the picker is unavailable.
// SDK 58: the root 'expo-contacts' export of this method now THROWS on purpose
// (class-based API replaced it), so the button silently did nothing. The
// legacy subpath keeps the same native picker.
// Android: after the pick, expo-contacts re-reads the contact through the
// contacts provider, which needs READ_CONTACTS — without it the result handler
// throws natively (verified on an API-36 emulator). iOS's picker needs no
// permission, so only Android asks.
import { Alert, Linking, Platform } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';

export type PickedContact = { name: string; phone: string };

async function ensureAndroidContactsAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const { granted, canAskAgain } = await Contacts.requestPermissionsAsync();
  if (granted) return true;
  Alert.alert(
    'Contacts access needed',
    'To choose someone from your contacts, allow Sober Dailies to access them. You can also enter a contact manually.',
    canAskAgain
      ? [{ text: 'OK' }]
      : [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
  );
  return false;
}

export async function pickContact(): Promise<PickedContact | null> {
  try {
    if (!(await ensureAndroidContactsAccess())) return null;
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
