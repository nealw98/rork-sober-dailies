// Drives iCloud sync at the app level: on launch AND on return-to-foreground,
// pull from iCloud and restore + reload if the cloud copy is newer (this is
// restore-on-reinstall / new-device, and live refresh when another device
// pushed); when the app goes to the background, push this device's state up.
// Backup + restore (whole-snapshot last-write-wins), not field-level merge.
// Mount <ICloudSyncGate/> once at the app root.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { pullFromICloud, pushToICloud } from '@/lib/icloudSync';

export function useICloudSync() {
  const started = useRef(false);
  const prevState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Pull, and if the cloud copy was genuinely newer, reload so the stores
    // (which read AsyncStorage on mount) pick up the restored data. The newer-
    // than-local check lives in pullFromICloud, so this is safe to call often.
    const pullAndReload = async () => {
      const restored = await pullFromICloud();
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
        pushToICloud();
      } else if (state === 'active' && (prev === 'background' || prev === 'inactive')) {
        // Returning to the foreground: refresh if another device pushed a newer
        // snapshot while we were away. No-ops when nothing changed.
        pullAndReload();
      }
    });
    return () => sub.remove();
  }, []);
}

export function ICloudSyncGate() {
  useICloudSync();
  return null;
}
