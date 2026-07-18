import { Platform } from 'react-native';

// Canonical store-listing links — kept in one place so the App Store ID and
// Play package name don't drift across Share flows. Sharing a bare store URL is
// what makes Messages/WhatsApp render the rich app-preview card; the surrounding
// message text shows with it.
export const APP_STORE_URL = 'https://apps.apple.com/app/sober-dailies/id6749869819';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nealwagner.soberdailies';

// The listing for the CURRENT device's platform. Best single link when the
// recipient's platform is unknown (most shares stay within one ecosystem, and
// one URL keeps the preview card clean).
export function storeUrl(): string {
  return Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
}

// The soberdailies.com/get landing page — the recipient-facing target for both
// share flows. Unlike a bare store link it detects the RECIPIENT's platform (not
// the sender's) and, when a gift code rides along, shows the code + how to redeem.
export const GET_URL = 'https://soberdailies.com/get';

// Landing link for a share. Pass a gift code to produce the gift variant
// (…/get?code=SD-XXXX-XXXX); omit it for the plain "share the app" link.
export function getUrl(code?: string): string {
  return code ? `${GET_URL}?code=${encodeURIComponent(code)}` : GET_URL;
}
