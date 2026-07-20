// Share the app — the plain native share sheet (decided 2026-07-20: the
// multi-select invite screen is retired; simpler wins). The pass flow on
// Pass It On remains the personal, individually-addressed path — this is
// just "let friends know the app exists".
import { Share } from 'react-native';
import { getUrl } from '@/lib/storeLinks';
import { logEvent } from '@/lib/analytics';

const SHARE_MESSAGE = "I've been using Sober Dailies. Give it a try:\n\n" + getUrl();

export async function shareApp(): Promise<void> {
  logEvent('share_app', { action: 'sheet_opened' });
  try {
    const res = await Share.share({ message: SHARE_MESSAGE });
    if (res.action === Share.sharedAction) logEvent('share_app', { action: 'shared' });
  } catch {}
}
