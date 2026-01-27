import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  Offerings,
  Package,
} from 'react-native-purchases';
 
const ENTITLEMENT_ID = 'premium';
 
// Stored in SecureStore so iOS can survive reinstalls.
const GRANDFATHERED_KEY = 'sober_dailies_grandfathered_premium';
const GRANDFATHER_CHECKED_KEY = 'sober_dailies_grandfather_checked';
 
// This key already exists in the app (see `hooks/useOnboardingStore.ts`).
const ONBOARDING_KEY = 'sober_dailies_onboarding_complete';
 
function getRevenueCatApiKey(): string | null {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : null;
 
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}
 
let purchasesConfigured = false;
 
async function ensurePurchasesConfigured(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (Platform.OS === 'web') return { ok: true };
  if (purchasesConfigured) return { ok: true };
 
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    if (__DEV__) {
      // Don’t block development if env vars aren’t set yet.
      purchasesConfigured = true;
      return { ok: true };
    }
    return { ok: false, error: 'Missing RevenueCat API key env var.' };
  }
 
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    purchasesConfigured = true;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to configure RevenueCat.' };
  }
}
 
async function checkAndPersistGrandfathering(): Promise<boolean> {
  try {
    const alreadyChecked = await SecureStore.getItemAsync(GRANDFATHER_CHECKED_KEY);
    if (alreadyChecked === 'true') {
      return (await SecureStore.getItemAsync(GRANDFATHERED_KEY)) === 'true';
    }
 
    // “Any install before the release with the subscription option.”
    // Practical implementation: if onboarding was already completed before this build ran,
    // this is an existing install upgrading into subscriptions → lifetime premium.
    const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY);
    const isExistingInstall = onboardingStatus === 'true';
 
    if (isExistingInstall) {
      await SecureStore.setItemAsync(GRANDFATHERED_KEY, 'true');
      await SecureStore.setItemAsync(GRANDFATHER_CHECKED_KEY, 'true');
      return true;
    }
 
    await SecureStore.setItemAsync(GRANDFATHER_CHECKED_KEY, 'true');
    return false;
  } catch {
    // If storage fails, be conservative and don’t grant premium.
    return false;
  }
}
 
export type SubscriptionState = {
  isLoading: boolean;
  error: string | null;
 
  isGrandfathered: boolean;
  isEntitled: boolean;
  isPremium: boolean;
 
  offerings: Offerings | null;
  customerInfo: CustomerInfo | null;
 
  refresh: () => Promise<void>;
  purchasePackage: (pkg: Package) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
};
 
export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const [isGrandfathered, setIsGrandfathered] = useState(false);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
 
  const isEntitled = useMemo(() => {
    if (!customerInfo) return false;
    return !!customerInfo.entitlements.active?.[ENTITLEMENT_ID];
  }, [customerInfo]);
 
  const isPremium = isGrandfathered || isEntitled || Platform.OS === 'web' || (__DEV__ && !getRevenueCatApiKey());
 
  const refresh = useCallback(async () => {
    setError(null);
 
    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return;
    }
 
    if (Platform.OS === 'web') return;
 
    try {
      const [info, offs] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(info);
      setOfferings(offs);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh subscription status.');
    }
  }, []);
 
  const purchasePackage = useCallback(async (pkg: Package) => {
    setError(null);
 
    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return null;
    }
 
    if (Platform.OS === 'web') return null;
 
    try {
      const result = await Purchases.purchasePackage(pkg);
      setCustomerInfo(result.customerInfo);
      return result.customerInfo;
    } catch (e: any) {
      // RevenueCat throws for cancellations too; don’t treat that as a fatal error.
      const msg = e?.userCancelled ? null : (e?.message || 'Purchase failed.');
      if (msg) setError(msg);
      return null;
    }
  }, []);
 
  const restorePurchases = useCallback(async () => {
    setError(null);
 
    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return null;
    }
 
    if (Platform.OS === 'web') return null;
 
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (e: any) {
      setError(e?.message || 'Restore failed.');
      return null;
    }
  }, []);
 
  useEffect(() => {
    let didCancel = false;
    let removeListener: null | (() => void) = null;
 
    (async () => {
      try {
        const grandfathered = await checkAndPersistGrandfathering();
        if (!didCancel) setIsGrandfathered(grandfathered);
 
        await refresh();
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    })();
 
    if (Platform.OS !== 'web') {
      try {
        // Keep state in sync after purchases/restore.
        removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
        });
      } catch {
        // no-op
      }
    }
 
    return () => {
      didCancel = true;
      removeListener?.();
    };
  }, [refresh]);
 
  return useMemo(
    () => ({
      isLoading,
      error,
 
      isGrandfathered,
      isEntitled,
      isPremium,
 
      offerings,
      customerInfo,
 
      refresh,
      purchasePackage,
      restorePurchases,
    }),
    [
      isLoading,
      error,
      isGrandfathered,
      isEntitled,
      isPremium,
      offerings,
      customerInfo,
      refresh,
      purchasePackage,
      restorePurchases,
    ]
  );
});

