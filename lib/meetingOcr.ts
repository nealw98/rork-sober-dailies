// Scan an image → a saved-meeting draft. Picks a screenshot from the photo
// library or takes a photo (expo-image-picker), runs on-device OCR (ML Kit), and
// parses it. Two paths: if the image is a Meeting Guide meeting screen (the
// "Weekday at time" signature), parse it precisely (mode 'exact'); otherwise fall
// back to a looser best-effort parse for flyers/photos (mode 'guess'). Fully
// offline. The ML Kit native module is required lazily so the app keeps working
// in a dev client that hasn't been rebuilt with it yet (reports 'no-engine').
import * as ImagePicker from 'expo-image-picker';
import { parseMeetingGuide, parseBestEffort, type MeetingDraft } from '@/lib/parseMeetingGuide';

export type ScanSource = 'library' | 'camera';

export type ScanResult =
  | { status: 'ok'; draft: MeetingDraft; mode: 'exact' | 'guess' }
  | { status: 'canceled' }
  | { status: 'no-permission' }
  | { status: 'no-engine' }
  | { status: 'no-match' }
  | { status: 'error' };

function getRecognizer(): { recognize: (uri: string) => Promise<any> } | null {
  try {
    // Lazy require — a static import would crash before a rebuild adds the native module.
    const mod = require('@react-native-ml-kit/text-recognition');
    const rec = mod?.default ?? mod;
    return rec && typeof rec.recognize === 'function' ? rec : null;
  } catch {
    return null;
  }
}

export async function scanMeetingScreenshot(source: ScanSource = 'library'): Promise<ScanResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { status: 'no-permission' };
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return { status: 'no-permission' };
    }

    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets?.length) return { status: 'canceled' };
    const uri = picked.assets[0].uri;

    const recognizer = getRecognizer();
    if (!recognizer) return { status: 'no-engine' };

    let lines: string[] = [];
    try {
      const result = await recognizer.recognize(uri);
      const blocks = result?.blocks ?? [];
      lines = blocks
        .flatMap((b: any) => (b?.lines ?? []).map((l: any) => String(l?.text ?? '')))
        .filter(Boolean);
      if (lines.length === 0 && result?.text) lines = String(result.text).split('\n');
    } catch {
      return { status: 'no-engine' };
    }

    // Exact path — a Meeting Guide meeting screen has the "Weekday at time" line.
    const exact = parseMeetingGuide(lines);
    if (exact.day != null && exact.time != null) return { status: 'ok', draft: exact, mode: 'exact' };

    // Best-effort path — flyer / camera photo / other screenshot.
    const guess = parseBestEffort(lines);
    if (guess.name || guess.day != null || guess.time != null) return { status: 'ok', draft: guess, mode: 'guess' };

    return { status: 'no-match' };
  } catch {
    return { status: 'error' };
  }
}
