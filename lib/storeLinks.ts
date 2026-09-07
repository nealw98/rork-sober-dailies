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

// The soberdailies.com/get landing page — the recipient-facing target for app
// shares. Private Pass It On links add their server-minted `g` token elsewhere.
export const GET_URL = 'https://soberdailies.com/get';

export function getUrl(): string {
  return GET_URL;
}
