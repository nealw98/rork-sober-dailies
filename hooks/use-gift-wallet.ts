// Pass It On — the giver's gift-code wallet (Pass It On Handoff 2).
//
// Local-first for this sprint: codes live in AsyncStorage on this device,
// anchored conceptually to the same anonymous identity as everything else.
// When the backend gift service exists (gift_codes table + mint/wallet/redeem
// endpoints), `mintCodes` becomes "POST /gifts/purchase with the receipt" and
// `reload` becomes "GET /gifts/wallet" — the shape below is the wire shape.
//
// Deliberate product constraints (spec §6.2/§9): exactly TWO states —
// available | redeemed. No "sent/given" state, no notes, no share tracking.
// The counter is cumulative: available-of-all-ever-purchased, never batches.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type GiftCodeStatus = 'available' | 'redeemed';

export interface GiftCode {
  code: string;                 // SD-XXXX-XXXX
  status: GiftCodeStatus;
  purchasedAt: string;          // ISO — when the code was minted
  redeemedAt?: string;          // ISO — set exactly once, server-side later
  note?: string;                // private, local-only — who the giver gave it to
}

const STORAGE_KEY = 'gift_wallet_v1';

// No 0/O/1/I/L — codes get read aloud at meetings (spec / handoff Phase 3).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

const randomBlock = (): string =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const generateCode = (): string => `SD-${randomBlock()}-${randomBlock()}`;

export const [GiftWalletProvider, useGiftWallet] = createContextHook(() => {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setCodes(JSON.parse(stored));
      } catch (e) {
        console.error('[GiftWallet] Failed to load wallet:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: GiftCode[]) => {
    setCodes(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('[GiftWallet] Failed to persist wallet:', e);
    }
  }, []);

  // Mint n fresh codes into the wallet (newest first, matching the design's
  // ledger order). Locally generated until the backend mints from the receipt.
  const mintCodes = useCallback(async (n: number): Promise<GiftCode[]> => {
    const existing = new Set(codes.map((c) => c.code));
    const fresh: GiftCode[] = [];
    while (fresh.length < n) {
      const code = generateCode();
      if (!existing.has(code)) {
        existing.add(code);
        fresh.push({ code, status: 'available', purchasedAt: new Date().toISOString() });
      }
    }
    await persist([...fresh, ...codes]);
    return fresh;
  }, [codes, persist]);

  // Dev/QA helper — redemption is server-side in real life; this lets the
  // wallet's Received group be exercised before the backend exists.
  const markRedeemed = useCallback(async (code: string) => {
    await persist(codes.map((c) =>
      c.code === code && c.status === 'available'
        ? { ...c, status: 'redeemed' as const, redeemedAt: new Date().toISOString() }
        : c
    ));
  }, [codes, persist]);

  // A private, local-only reminder of who a code went to (spec §6.2 originally
  // said "no notes"; Neal reversed that — it's a personal memory aid, never
  // synced or shared). Empty string clears it.
  const setNote = useCallback(async (code: string, note: string) => {
    const trimmed = note.trim();
    await persist(codes.map((c) =>
      c.code === code ? { ...c, note: trimmed.length ? trimmed : undefined } : c
    ));
  }, [codes, persist]);

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
    mintCodes,
    markRedeemed,
    setNote,
  }), [isLoading, codes, available, redeemed, mintCodes, markRedeemed, setNote]);
});
