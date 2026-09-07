import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

const PENDING_KEY = 'pass_offer_pending_v1';
const HANDLED_KEY = 'pass_offer_handled_v1';

async function installReferrer(): Promise<string> {
  return Promise.race([
    Application.getInstallReferrerAsync().catch(() => ''),
    new Promise<string>((resolve) => setTimeout(() => resolve(''), 1500)),
  ]);
}

function validToken(value: string | null | undefined): string | null {
  const token = (value || '').trim();
  return /^[A-Za-z0-9_-]{10,200}$/.test(token) ? token : null;
}

export function extractPassToken(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    // Covers myapp://pass?g=…, https://soberdailies.com/get?g=…, and a full
    // URL delivered through Play's install-referrer field.
    const match = value.match(/[?&]g=([^&#]+)/i);
    if (match) return validToken(decodeURIComponent(match[1].replace(/\+/g, ' ')));
    // Play commonly returns just "g=<token>" rather than a complete URL.
    const bare = value.match(/(?:^|&)g=([^&]+)/i);
    if (bare) return validToken(decodeURIComponent(bare[1].replace(/\+/g, ' ')));
  } catch {}
  return null;
}

export function usePendingAndroidPass() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Platform.OS === 'android');

  const rememberExplicit = useCallback(async (url: string | null | undefined) => {
    if (Platform.OS !== 'android') return;
    const found = extractPassToken(url);
    if (!found) return;
    await AsyncStorage.setItem(PENDING_KEY, found).catch(() => {});
    setToken(found);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [stored, handled, initialUrl, referrer] = await Promise.all([
          AsyncStorage.getItem(PENDING_KEY),
          AsyncStorage.getItem(HANDLED_KEY),
          Linking.getInitialURL(),
          installReferrer(),
        ]);
        // An explicit link always wins, including when the person intentionally
        // reopens a pass they dismissed earlier. Install referrer is persistent,
        // so ignore it after that token has been handled once.
        const explicit = extractPassToken(initialUrl);
        const deferred = extractPassToken(referrer);
        const next = explicit ?? validToken(stored) ?? (deferred !== handled ? deferred : null);
        if (next) await AsyncStorage.setItem(PENDING_KEY, next).catch(() => {});
        if (!cancelled) setToken(next);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    const listener = Linking.addEventListener('url', ({ url }) => { rememberExplicit(url); });
    return () => {
      cancelled = true;
      listener.remove();
    };
  }, [rememberExplicit]);

  const clear = useCallback(async () => {
    const current = token;
    setToken(null);
    const writes: Promise<unknown>[] = [AsyncStorage.removeItem(PENDING_KEY)];
    if (current) writes.push(AsyncStorage.setItem(HANDLED_KEY, current));
    await Promise.all(writes).catch(() => {});
  }, [token]);

  return { token, isLoading, clear };
}
