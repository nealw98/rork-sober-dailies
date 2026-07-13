// Pass It On — the giver's gift-code wallet (Pass It On Handoff 2).
//
// SERVER-AUTHORITATIVE. Codes are minted server-side after a verified purchase
// (lib/giftService → gifts-purchase) and their redeemed state flips on the
// RECIPIENT's device, so this device can only ever mirror what the backend
// reports. We keep a local cache of the last-known wallet (AsyncStorage) purely
// for instant/offline first paint; `syncWallet()` refreshes it from the server
// and only overwrites when the server actually answers (a network error leaves
// the cache intact rather than blanking the wallet).
//
// Notes are the one local-only, never-synced field (spec §6.2 reversed by Neal —
// a private "who's this for" reminder). They live in a separate AsyncStorage map
// keyed by code and are merged onto the server rows for display.
//
// Two code states only (spec §6.2/§9): available | redeemed. No "sent/given",
// no share tracking. The counter is cumulative: available-of-all-ever-purchased.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { fetchGiftWallet, purchaseGiftCodes, type WalletCode } from '@/lib/giftService';

export type GiftCodeStatus = 'available' | 'redeemed';

export interface GiftCode {
  code: string;                 // SD-XXXX-XXXX
  status: GiftCodeStatus;
  purchasedAt: string;          // ISO — when the code was minted
  redeemedAt?: string;          // ISO — set exactly once, server-side
  note?: string;                // private, local-only — who the giver gave it to
}

const WALLET_CACHE_KEY = 'gift_wallet_v1'; // mirror of the server wallet
const NOTES_KEY = 'gift_notes_v1';         // local-only { [code]: note }

// No 0/O/1/I/L — dev-only local codes read like the real ones for UI testing.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const randomBlock = (): string =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const devCode = (): string => `SD-${randomBlock()}-${randomBlock()}`;

export const [GiftWalletProvider, useGiftWallet] = createContextHook(() => {
  const [serverCodes, setServerCodes] = useState<WalletCode[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const cacheWallet = useCallback(async (wallet: WalletCode[]) => {
    setServerCodes(wallet);
    try {
      await AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(wallet));
    } catch (e) {
      console.error('[GiftWallet] Failed to cache wallet:', e);
    }
  }, []);

  // Pull the authoritative wallet. Returns silently on failure so a blip never
  // blanks the cached wallet (fetchGiftWallet returns null when the server
  // didn't answer with a wallet).
  const syncWallet = useCallback(async () => {
    const wallet = await fetchGiftWallet();
    if (wallet) await cacheWallet(wallet);
  }, [cacheWallet]);

  useEffect(() => {
    (async () => {
      try {
        const [cached, storedNotes] = await Promise.all([
          AsyncStorage.getItem(WALLET_CACHE_KEY),
          AsyncStorage.getItem(NOTES_KEY),
        ]);
        if (cached) setServerCodes(JSON.parse(cached));
        if (storedNotes) setNotes(JSON.parse(storedNotes));
      } catch (e) {
        console.error('[GiftWallet] Failed to load wallet cache:', e);
      } finally {
        setIsLoading(false);
      }
      syncWallet(); // fire-and-forget server refresh
    })();
  }, [syncWallet]);

  // Called by the purchase screen after a real store purchase completes. Hits
  // gifts-purchase (verifies the receipt with RC, mints server-side) and adopts
  // the returned wallet. Throws on failure so the caller can show an error.
  const applyPurchase = useCallback(async (productId: string): Promise<WalletCode[]> => {
    const wallet = await purchaseGiftCodes(productId);
    await cacheWallet(wallet);
    return wallet;
  }, [cacheWallet]);

  // __DEV__ only: seed local codes so the wallet UI is testable before the
  // backend is reachable / without a sandbox purchase. Never hits the server;
  // a successful syncWallet() will replace these with the real wallet.
  const mintLocalDev = useCallback(async (n: number): Promise<void> => {
    const existing = new Set(serverCodes.map((c) => c.code));
    const fresh: WalletCode[] = [];
    while (fresh.length < n) {
      const code = devCode();
      if (!existing.has(code)) {
        existing.add(code);
        fresh.push({ code, status: 'available', purchasedAt: new Date().toISOString() });
      }
    }
    await cacheWallet([...fresh, ...serverCodes]);
  }, [serverCodes, cacheWallet]);

  // Private, local-only reminder of who a code went to. Empty string clears it.
  const setNote = useCallback(async (code: string, note: string) => {
    const trimmed = note.trim();
    setNotes((prev) => {
      const next = { ...prev };
      if (trimmed.length) next[code] = trimmed;
      else delete next[code];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch((e) =>
        console.error('[GiftWallet] Failed to persist notes:', e),
      );
      return next;
    });
  }, []);

  const codes = useMemo<GiftCode[]>(
    () => serverCodes.map((c) => ({ ...c, note: notes[c.code] })),
    [serverCodes, notes],
  );
  const available = useMemo(() => codes.filter((c) => c.status === 'available'), [codes]);
  const redeemed = useMemo(() => codes.filter((c) => c.status === 'redeemed'), [codes]);

  return useMemo(() => ({
    isLoading,
    codes,
    available,
    redeemed,
    availableCount: available.length,
    totalCount: codes.length,
    hasEverBought: codes.length > 0,
    syncWallet,
    applyPurchase,
    mintLocalDev,
    setNote,
  }), [isLoading, codes, available, redeemed, syncWallet, applyPurchase, mintLocalDev, setNote]);
});
