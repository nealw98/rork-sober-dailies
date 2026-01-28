import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  Offerings,
  Package,
} from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { usageLogger } from '@/lib/usageLogger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENTITLEMENT_ID = 'premium';

// Supabase Edge Function URL for grandfather check
// This will be: https://[project-ref].supabase.co/functions/v1/check-grandfather
const GRANDFATHER_EDGE_FUNCTION = 'check-grandfather';

// SecureStore keys
const GRANDFATHER_CHECKED_KEY = 'sober_dailies_grandfather_checked';
const PREMIUM_OVERRIDE_KEY = 'sober_dailies_premium_override';

// ============================================================================
// REVENUECAT CONFIGURATION
// ============================================================================

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
      // Don't block development if env vars aren't set yet.
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

// ============================================================================
// GRANDFATHERING LOGIC
// ============================================================================

/**
 * Check if user should be grandfathered and grant entitlement via Edge Function.
 * 
 * This function calls a Supabase Edge Function that:
 * 1. Checks user_profiles.is_grandfathered (computed column based on created_at)
 * 2. If eligible, grants promotional "premium" entitlement via RevenueCat REST API
 * 3. Records the grant in user_profiles.entitlement_granted_at
 * 
 * Error Handling (STRICT - no false positives):
 * - If Edge Function fails: do NOT grant (user must pay or retry later)
 * - If no Supabase record: do NOT grant (user is new)
 * - Only grant if is_grandfathered = true in database
 * 
 * The result is cached in SecureStore so we only call the Edge Function once per device.
 */
async function checkAndGrantGrandfatherEntitlement(): Promise<void> {
  try {
    // Check if we've already done the grandfather check on this device
    const alreadyChecked = await SecureStore.getItemAsync(GRANDFATHER_CHECKED_KEY);
    if (alreadyChecked === 'true') {
      console.log('[Subscription] Grandfather check already completed on this device');
      return;
    }

    console.log('[Subscription] Performing grandfather check via Edge Function...');

    // Get the anonymous ID from usage logger
    const anonymousId = await usageLogger.getAnonymousId();
    if (!anonymousId) {
      console.log('[Subscription] No anonymous ID available - skipping grandfather check');
      await SecureStore.setItemAsync(GRANDFATHER_CHECKED_KEY, 'true');
      return;
    }

    // Ensure RevenueCat is configured so we can get the app user ID
    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      console.warn('[Subscription] RevenueCat not configured - skipping grandfather check');
      // Don't cache this - try again next time
      return;
    }

    // Get RevenueCat app user ID
    let rcAppUserId: string;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      rcAppUserId = customerInfo.originalAppUserId;
      console.log('[Subscription] RevenueCat app user ID:', rcAppUserId);
    } catch (e) {
      console.warn('[Subscription] Failed to get RevenueCat customer info:', e);
      // Don't cache - try again next time
      return;
    }

    // Determine platform for RevenueCat API
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // Call the Edge Function
    console.log('[Subscription] Calling Edge Function with:', {
      anonymous_id: anonymousId,
      rc_app_user_id: rcAppUserId,
      platform,
    });

    const { data, error } = await supabase.functions.invoke(GRANDFATHER_EDGE_FUNCTION, {
      body: {
        anonymous_id: anonymousId,
        rc_app_user_id: rcAppUserId,
        platform,
      },
    });

    if (error) {
      console.error('[Subscription] Edge Function error:', error);
      // Don't cache on error - allow retry
      return;
    }

    console.log('[Subscription] Edge Function response:', data);

    if (data?.success) {
      // Cache that we've completed the check
      await SecureStore.setItemAsync(GRANDFATHER_CHECKED_KEY, 'true');
      
      if (data.grandfathered) {
        console.log('[Subscription] User is grandfathered!', {
          already_granted: data.already_granted,
          message: data.message,
        });
      } else {
        console.log('[Subscription] User is NOT grandfathered:', data.message);
      }
    } else {
      console.warn('[Subscription] Edge Function returned failure:', data?.message);
      // Don't cache on failure - allow retry
    }

  } catch (error) {
    console.error('[Subscription] Grandfather check error:', error);
    // Don't cache on error - allow retry
  }
}

// ============================================================================
// SUBSCRIPTION STATE & HOOK
// ============================================================================

export type SubscriptionState = {
  isLoading: boolean;
  error: string | null;

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

  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPremiumOverride, setIsPremiumOverride] = useState(false);

  // Check if user has the "premium" entitlement from RevenueCat
  // This includes both paid subscriptions AND grandfathered users (promotional entitlement)
  const isEntitled = useMemo(() => {
    if (!customerInfo) return false;
    return !!customerInfo.entitlements.active?.[ENTITLEMENT_ID];
  }, [customerInfo]);

  // User is premium if: entitled OR premium override (dev mode) OR on web
  const isPremium = isEntitled || isPremiumOverride || Platform.OS === 'web';

  // Refresh subscription status from RevenueCat
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
      
      // Debug: Log offerings data to help diagnose product issues
      console.log('[Subscription] Customer info received:', {
        originalAppUserId: info.originalAppUserId,
        activeEntitlements: Object.keys(info.entitlements.active || {}),
        allEntitlements: Object.keys(info.entitlements.all || {}),
      });
      
      console.log('[Subscription] Offerings received:', {
        currentOfferingId: offs.current?.identifier,
        allOfferingIds: Object.keys(offs.all || {}),
        currentPackageCount: offs.current?.availablePackages?.length || 0,
      });
      
      // Log each offering's packages
      if (offs.current) {
        console.log('[Subscription] Current offering packages:');
        offs.current.availablePackages?.forEach((pkg, i) => {
          console.log(`  [${i}] identifier: ${pkg.identifier}, type: ${pkg.packageType}, product: ${pkg.product?.identifier}, price: ${pkg.product?.priceString}`);
        });
      }
      
      setCustomerInfo(info);
      setOfferings(offs);
    } catch (e: any) {
      console.error('[Subscription] Refresh error:', e);
      setError(e?.message || 'Failed to refresh subscription status.');
    }
  }, []);

  // Purchase a subscription package
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
      // RevenueCat throws for cancellations too; don't treat that as a fatal error.
      const isCancelled = e?.userCancelled || e?.code === '1' || e?.message?.includes('cancelled');
      const msg = isCancelled ? null : (e?.message || 'Purchase failed.');
      if (msg) {
        console.error('[Subscription] Purchase error:', e);
        setError(msg);
      }
      return null;
    }
  }, []);

  // Restore previous purchases
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
      console.error('[Subscription] Restore error:', e);
      setError(e?.message || 'Restore failed.');
      return null;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let didCancel = false;
    let removeListener: null | (() => void) = null;

    (async () => {
      try {
        // Step 0: Check for developer premium override
        const override = await SecureStore.getItemAsync(PREMIUM_OVERRIDE_KEY);
        if (override === 'true') {
          console.log('[Subscription] Premium override enabled (developer mode)');
          if (!didCancel) setIsPremiumOverride(true);
        }

        // Step 1: Check and grant grandfather entitlement if eligible
        // This calls the Edge Function which grants the entitlement in RevenueCat
        await checkAndGrantGrandfatherEntitlement();

        // Step 2: Refresh RevenueCat status
        // If user was grandfathered, RevenueCat now has the entitlement
        await refresh();
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    })();

    // Set up listener for purchase/restore updates
    if (Platform.OS !== 'web') {
      try {
        removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
        });
      } catch {
        // no-op - SDK might not be configured yet
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
