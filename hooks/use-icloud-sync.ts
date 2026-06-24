// Drives iCloud sync at the app level: on launch, pull from iCloud and restore +
// reload if the cloud copy is newer (this is restore-on-reinstall / new-device);
// when the app goes to the background, push this device's state up. Backup +
// restore model (not real-time). Mount <ICloudSyncGate/> once at the app root.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { pullFromICloud, pushToICloud } from '@/lib/icloudSync';

export function useICloudSync() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const restored = await pullFromICloud();
      if (restored) {
        // Stores already read AsyncStorage on mount — reload so they pick up the
        // restored data. Only happens when the cloud copy was genuinely newer.
        try {
          const Updates = await import('expo-updates');
          await Updates.reloadAsync();
        } catch {
          /* dev / no updates module — the next cold start will reflect it */
        }
      }
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') pushToICloud();
    });
    return () => sub.remove();
  }, []);
}

export function ICloudSyncGate() {
  useICloudSync();
  return null;
}
