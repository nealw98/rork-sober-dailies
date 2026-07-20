// Gift-credit balance for UI — cached-first so the tab-header badge renders
// instantly, refreshed from the server at most once per TTL (creditsService
// throttles via the cache timestamp) or on demand after a share.
import { useCallback, useEffect, useState } from 'react';
import { getCachedCreditStatus, fetchCreditStatus, type CreditStatus } from '@/lib/creditsService';

export function useGiftCredits(opts: { alwaysFresh?: boolean } = {}) {
  const [status, setStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await fetchCreditStatus();
    if (fresh) setStatus(fresh);
    setLoading(false);
    return fresh;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedCreditStatus();
      if (cancelled) return;
      if (cached) {
        setStatus(cached);
        setLoading(false);
        if (!cached.stale && !opts.alwaysFresh) return;
      }
      await refresh();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { balance: status?.balance ?? 0, status, loading, refresh };
}
