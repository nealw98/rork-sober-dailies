// Immersive flag — set while a full-screen overlay (e.g. a Journey entry sheet)
// is open, so the floating tab bar + Sponsor FAB hide and the sheet can extend
// to the bottom of the screen. Restores when cleared.
import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export const [ImmersiveProvider, useImmersive] = createContextHook(() => {
  const [immersive, setImmersiveState] = useState(false);
  const setImmersive = useCallback((v: boolean) => setImmersiveState(v), []);
  return useMemo(() => ({ immersive, setImmersive }), [immersive, setImmersive]);
});
