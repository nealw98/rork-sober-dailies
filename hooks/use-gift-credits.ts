// Gift-credit balance for UI — cached-first so the tab-header badge renders
// instantly, refreshed from the server at most once per TTL (creditsService
// throttles via the cache timestamp) or on demand after a share.
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getCachedCreditStatus, fetchCreditStatus, type CreditStatus } from '@/lib/creditsService';

export function useGiftCredits(opts: { alwaysFresh?: boolean } = {}) {
  const [status, setStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const alwaysFresh = !!opts.alwaysFresh;

  const refresh = useCallback(async () => {
    const fresh = await fetchCreditStatus();
    if (fresh) setStatus(fresh);
    setLoading(false);
    return fresh;
  }, []);

  // Read on every focus, not just on mount. PassItOnGift renders in the header
  // of all four tab screens, and those screens stay mounted for the whole
  // session — so a mount-only effect pinned the badge to whatever the balance
  // was at app launch. Passes granted or earned mid-session never showed up
  // until a relaunch, which breaks the one rule this surface has: the icon
  // appearing IS the notification (decided 2026-07-20).
  //
  // Cheap by design — this is an AsyncStorage read unless the cache is absent
  // or the TTL has lapsed, so switching tabs does not hammer the server.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cached = await getCachedCreditStatus();
        if (cancelled) return;
        if (cached) {
          setStatus(cached);
          setLoading(false);
          if (!cached.stale && !alwaysFresh) return;
        }
        if (!cancelled) await refresh();
      })();
      return () => { cancelled = true; };
    }, [refresh, alwaysFresh]),
  );

  return { balance: status?.balance ?? 0, status, loading, refresh };
}
