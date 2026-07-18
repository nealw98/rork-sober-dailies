// JS entry for the local ContactMultiPicker module (iOS only).
//
// presentContactMultiPickerAsync() presents the SYSTEM multi-select contact
// picker — no contacts permission involved; the app receives only what the
// user checks off. Return contract:
//   - array of picked contacts (empty array = user cancelled)
//   - null = picker unavailable (Android, or an installed binary that predates
//     this module) — callers should fall back to the single-contact picker.
import { Platform } from 'react-native';

export type PickedPhone = { number: string; label: string };
export type MultiPickedContact = { name: string; phoneNumbers: PickedPhone[] };

export async function presentContactMultiPickerAsync(): Promise<MultiPickedContact[] | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    // Lazy so an OTA of this JS to a binary without the module degrades to the
    // fallback instead of crashing at import time.
    const { requireNativeModule } = require('expo-modules-core');
    const native = requireNativeModule('ContactMultiPicker');
    const picked: MultiPickedContact[] = await native.presentMultiPickerAsync();
    return picked ?? [];
  } catch {
    return null;
  }
}
