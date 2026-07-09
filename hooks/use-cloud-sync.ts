// Drives cloud sync at the app level: on launch AND on return-to-foreground,
// pull from the cloud (iCloud on iOS, Google Drive on Android) and restore +
// reload if the cloud copy is newer (this is restore-on-reinstall / new-device,
// and live refresh when another device pushed); when the app goes to the
// background, push this device's state up. Backup + restore (whole-snapshot
// last-write-wins), not field-level merge. On Android everything silently
// no-ops until the user connects a Google account from the Backup screen.
// Mount <CloudSyncGate/> once at the app root.
// (Formerly use-icloud-sync.ts.)
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { pullFromCloud, pushToCloud } from '@/lib/cloudSync';

export function useCloudSync() {
  const started = useRef(false);
  const prevState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Pull, and if the cloud copy was genuinely newer, reload so the stores
    // (which read AsyncStorage on mount) pick up the restored data. The newer-
    // than-local check lives in pullFromCloud, so this is safe to call often.
    const pullAndReload = async () => {
      const restored = await pullFromCloud();
      if (restored) {
        try {
          const Updates = await import('expo-updates');
          await Updates.reloadAsync();
        } catch {
          /* dev / no updates module — the next cold start will reflect it */
        }
      }
    };

    // Cold-start pull (restore-on-reinstall / new device).
    pullAndReload();

    const sub = AppState.addEventListener('change', (state) => {
      const prev = prevState.current;
      prevState.current = state;
      if (state === 'background' || state === 'inactive') {
        pushToCloud();
      } else if (state === 'active' && (prev === 'background' || prev === 'inactive')) {
        // Returning to the foreground: refresh if another device pushed a newer
        // snapshot while we were away. No-ops when nothing changed.
        pullAndReload();
      }
    });
    return () => sub.remove();
  }, []);
}

export function CloudSyncGate() {
  useCloudSync();
  return null;
}
