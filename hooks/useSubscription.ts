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

// SecureStore keys
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
 * Check if user is grandfathered by querying the user_profiles table directly.
 * 
 * The is_grandfathered column is a computed column in Supabase that returns true
 * if the user's created_at is before February 4, 2026.
 * 
 * This check happens each time the app initializes subscriptions - no caching.
 * 
 * @returns true if user is grandfathered, false otherwise
 */
async function checkGrandfatherStatus(): Promise<boolean> {
  try {
    // Get the anonymous ID from usage logger
    const anonymousId = await usageLogger.getAnonymousId();
    if (!anonymousId) {
      console.log('[Subscription] No anonymous ID available - not grandfathered');
      return false;
    }

    console.log('[Subscription] Checking grandfather status for:', anonymousId);

    // Query user_profiles table directly
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_grandfathered')
      .eq('anonymous_id', anonymousId)
      .single();

    if (error) {
      // PGRST116 = no rows found, which means user doesn't exist in table
      if (error.code === 'PGRST116') {
        console.log('[Subscription] User not found in user_profiles - not grandfathered');
        return false;
      }
      console.error('[Subscription] Error checking grandfather status:', error);
      return false;
    }

    const isGrandfathered = data?.is_grandfathered === true;
    console.log('[Subscription] Grandfather status:', isGrandfathered);
    return isGrandfathered;
  } catch (error) {
    console.error('[Subscription] Grandfather check error:', error);
    return false;
  }
}

// ============================================================================
// SUBSCRIPTION STATE & HOOK
// ============================================================================

export type SubscriptionState = {
  isLoading: boolean;
  error: string | null;

  isEntitled: boolean;
  isGrandfathered: boolean;
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
  const [isGrandfathered, setIsGrandfathered] = useState(false);

  // Check if user has the "premium" entitlement from RevenueCat (paid subscriptions)
  const isEntitled = useMemo(() => {
    if (!customerInfo) return false;
    return !!customerInfo.entitlements.active?.[ENTITLEMENT_ID];
  }, [customerInfo]);

  // User is premium if: entitled (paid) OR grandfathered OR premium override (dev mode) OR on web
  const isPremium = isEntitled || isGrandfathered || isPremiumOverride || Platform.OS === 'web';

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
        // SecureStore can fail on some Android devices, so wrap in try-catch
        try {
          const override = await SecureStore.getItemAsync(PREMIUM_OVERRIDE_KEY);
          if (override === 'true') {
            console.log('[Subscription] Premium override enabled (developer mode)');
            if (!didCancel) setIsPremiumOverride(true);
          }
        } catch (secureStoreError) {
          console.warn('[Subscription] SecureStore read failed (non-fatal):', secureStoreError);
          // Continue without premium override - not critical
        }

        // Step 1: Check grandfather status directly from Supabase
        try {
          const grandfathered = await checkGrandfatherStatus();
          if (!didCancel) {
            setIsGrandfathered(grandfathered);
            if (grandfathered) {
              console.log('[Subscription] User is grandfathered - unlocking premium features');
            }
          }
        } catch (grandfatherError) {
          console.warn('[Subscription] Grandfather check failed (non-fatal):', grandfatherError);
          // Continue without grandfather status - user can still purchase
        }

        // Step 2: Refresh RevenueCat status for paid subscriptions
        await refresh();
      } catch (error) {
        console.error('[Subscription] Initialization error:', error);
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    })();

    // Set up listener for purchase/restore updates
    // Only add listener after a small delay to ensure RevenueCat is configured
    if (Platform.OS !== 'web') {
      const setupListener = async () => {
        try {
          // Wait for RevenueCat to be configured
          const configured = await ensurePurchasesConfigured();
          if (configured.ok && !didCancel) {
            removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
              setCustomerInfo(info);
            });
          }
        } catch (listenerError) {
          console.warn('[Subscription] Failed to add customer info listener (non-fatal):', listenerError);
        }
      };
      setupListener();
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
      isGrandfathered,
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
      isGrandfathered,
      isPremium,
      offerings,
      customerInfo,
      refresh,
      purchasePackage,
      restorePurchases,
    ]
  );
});
