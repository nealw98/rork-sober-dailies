import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  Offerings,
  Package,
} from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';
import { syncTrialReminder } from '@/lib/trialReminder';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENTITLEMENT_ID = 'premium';

// SecureStore keys
const PREMIUM_OVERRIDE_KEY = 'sober_dailies_premium_override';
// QA: when set, the app ignores grandfather + dev override + any PRE-EXISTING
// entitlement so the paywall gates like a brand-new install — lets a
// grandfathered tester exercise the real paywall + a sandbox purchase. A
// purchase/restore completed during the SAME session still unlocks (so the
// post-paywall transition is testable). Toggle it from the Developer Console.
export const QA_FORCE_NEW_USER_KEY = 'sober_dailies_qa_force_new_user';

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
// Grandfather status is permanent by definition — the column is computed from
// a created_at that can never move. So a device that has ONCE been told "yes"
// can keep that answer when the check can't complete: no network, a Supabase
// outage, or a policy change like the July 2026 RLS incident, which paywalled
// real grandfathered members until it was noticed.
//
// Fail-open is deliberately narrow (Neal, 2026-07-31): only a device holding a
// cached yes for THIS anonymous_id rides through an error. A device that has
// never verified still fails closed, so the cache can't manufacture access.
// A successful "no" clears the cache, which is what makes it self-healing —
// un-grandfathering someone takes effect the next time they're online.
// No TTL: an expiry would just reinstate the lockout during a long outage.
const GF_CACHE_KEY = 'grandfather_verified_v1';

async function cachedGrandfather(anonymousId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GF_CACHE_KEY)) === anonymousId;
  } catch {
    return false;
  }
}

async function rememberGrandfather(anonymousId: string, yes: boolean): Promise<void> {
  try {
    if (yes) await AsyncStorage.setItem(GF_CACHE_KEY, anonymousId);
    else await AsyncStorage.removeItem(GF_CACHE_KEY);
  } catch {}
}

// 'unknown' = we couldn't ASK, which is not the same as a "no". Collapsing the
// two is what used to wall a grandfathered member who happened to be offline.
type GrandfatherStatus = 'yes' | 'no' | 'unknown';

async function checkGrandfatherStatus(): Promise<GrandfatherStatus> {
  let anonymousId = '';
  try {
    // Get the anonymous ID from usage logger
    anonymousId = (await getAnonymousId()) ?? '';
    if (!anonymousId) {
      console.log('[Subscription] No anonymous ID available - not grandfathered');
      return 'no';
    }

    console.log('[Subscription] Checking grandfather status for:', anonymousId);

    // Query user_profiles table directly
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_grandfathered')
      .eq('anonymous_id', anonymousId)
      .single();

    if (error) {
      // PGRST116 = no rows found, which means user doesn't exist in table.
      // That's a real answer, not a failure — clear any cached yes.
      if (error.code === 'PGRST116') {
        console.log('[Subscription] User not found in user_profiles - not grandfathered');
        await rememberGrandfather(anonymousId, false);
        return 'no';
      }
      // Anything else is the check FAILING, not answering. Honour a cached yes;
      // otherwise say so, rather than pretending we got a "no".
      console.error('[Subscription] Error checking grandfather status:', error);
      const remembered = await cachedGrandfather(anonymousId);
      if (remembered) console.log('[Subscription] Check failed - honouring cached grandfather status');
      return remembered ? 'yes' : 'unknown';
    }

    const isGrandfathered = data?.is_grandfathered === true;
    console.log('[Subscription] Grandfather status:', isGrandfathered);
    await rememberGrandfather(anonymousId, isGrandfathered);
    return isGrandfathered ? 'yes' : 'no';
  } catch (error) {
    // Thrown (offline, DNS, timeout) — same rule as an error response.
    console.error('[Subscription] Grandfather check error:', error);
    if (!anonymousId) return 'unknown';
    const remembered = await cachedGrandfather(anonymousId);
    if (remembered) console.log('[Subscription] Check threw - honouring cached grandfather status');
    return remembered ? 'yes' : 'unknown';
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
  trialEligible: boolean | null;
  // QA force-new-user flag (Developer Console) is active — the paywall is gating
  // only because the flag hides grandfather/entitlement. Lets the paywall show
  // a QA banner so a forced gate is never mistaken for a real one.
  qaForceNewUser: boolean;

  refresh: () => Promise<void>;
  applyCustomerInfo: (info: CustomerInfo) => void;
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
  // We asked and couldn't get an answer (offline, or our backend is down).
  const [grandfatherUnknown, setGrandfatherUnknown] = useState(false);
  // QA "force new-user" (see QA_FORCE_NEW_USER_KEY). `sessionPurchaseUnlock`
  // records a purchase/restore made THIS session so the gate still drops after a
  // real sandbox buy even while the flag ignores the standing entitlement.
  const [forceNewUser, setForceNewUser] = useState(false);
  const [sessionPurchaseUnlock, setSessionPurchaseUnlock] = useState(false);
  // Free-trial eligibility for the `default` offering. null = not yet resolved.
  // Determined once, early (as soon as offerings load — during onboarding), so
  // the paywall can pick the trial vs. no-trial layout with no on-mount flash.
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);

  // Check if user has the "premium" entitlement from RevenueCat (paid subscriptions)
  const isEntitled = useMemo(() => {
    if (!customerInfo) return false;
    return !!customerInfo.entitlements.active?.[ENTITLEMENT_ID];
  }, [customerInfo]);

  // User is premium if: entitled (paid) OR grandfathered OR premium override (dev mode) OR on web.
  // QA "force new-user" overrides all of that to non-premium, except a purchase
  // made during this session — so the paywall gates and its unlock is testable.
  const isPremium =
    Platform.OS === 'web'
      ? true
      : forceNewUser
        ? sessionPurchaseUnlock
        // FAIL OPEN on an unanswerable grandfather check. A member who is
        // offline, or whose check hits a backend outage, must never be shown a
        // paywall for an app they were promised free — that is this app's worst
        // failure, and it has happened in production once already. The cost is
        // a brief free ride during an outage, which is small: everything a
        // subscription buys beyond the local daily program (reflections, the AI
        // sponsor, speaker tapes) is Supabase-backed and broken for PAYING
        // users at that same moment. Self-healing: a successful "no" clears the
        // cache and the wall returns on the next launch.
        //
        // DELIBERATELY NOT HANDLED (2026-08-13): a FRESH install that is also
        // fully offline has no local data to fall back on, so failing open
        // drops it into an empty app with no content. We considered gating
        // first run behind a "connect to the internet" screen and decided
        // against it. Reaching that state means losing connectivity between
        // downloading the app and first launch; it self-corrects on the next
        // launch with signal; and a hard gate on first run would block EVERY
        // new install if it ever misfired (a RevenueCat outage, a bad offering
        // config). The rare user who hits it is a support conversation, not a
        // control-flow branch. Don't add the gate without a strong reason.
        : isEntitled || isGrandfathered || isPremiumOverride || grandfatherUnknown;

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

  // Apply a CustomerInfo handed to us by a paywall callback (purchase/restore
  // completed). The RC paywall delivers the post-purchase entitlement in its
  // callback args — applying it directly flips isPremium on the next render,
  // instead of leaving the finished paywall on screen while a network refresh
  // re-fetches what we were already given.
  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    // A user-driven purchase/restore that lands premium unlocks even under the
    // QA force-new-user flag (which otherwise ignores the standing entitlement).
    if (info.entitlements.active?.[ENTITLEMENT_ID]) setSessionPurchaseUnlock(true);
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
      if (result.customerInfo.entitlements.active?.[ENTITLEMENT_ID]) setSessionPurchaseUnlock(true);
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
      if (info.entitlements.active?.[ENTITLEMENT_ID]) setSessionPurchaseUnlock(true);
      return info;
    } catch (e: any) {
      console.error('[Subscription] Restore error:', e);
      setError(e?.message || 'Restore failed.');
      return null;
    }
  }, []);

  // Keep the day-5 trial reminder honest: whenever RC hands us fresh
  // CustomerInfo, drop the pending reminder if the trial was cancelled or the
  // entitlement lapsed (lib/trialReminder no-ops when nothing is scheduled).
  useEffect(() => {
    if (customerInfo) syncTrialReminder(customerInfo).catch(() => {});
  }, [customerInfo]);

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

        // QA: force-new-user flag (Developer Console) — makes a grandfathered device
        // gate like a fresh install so the paywall can be tested.
        try {
          const forced = await SecureStore.getItemAsync(QA_FORCE_NEW_USER_KEY);
          if (forced === 'true') {
            console.log('[Subscription] QA force-new-user enabled — ignoring grandfather/entitlement');
            if (!didCancel) setForceNewUser(true);
          }
        } catch (qaError) {
          console.warn('[Subscription] SecureStore QA flag read failed (non-fatal):', qaError);
        }

        // Steps 1+2: the Supabase grandfather check and the RevenueCat refresh
        // are independent network calls — run them concurrently. Both handle
        // their own errors internally (grandfather failure just means false).
        const [grandfather] = await Promise.all([
          checkGrandfatherStatus(),
          refresh(),
        ]);
        if (!didCancel) {
          setIsGrandfathered(grandfather === 'yes');
          setGrandfatherUnknown(grandfather === 'unknown');
          if (grandfather === 'yes') {
            console.log('[Subscription] User is grandfathered - unlocking premium features');
          } else if (grandfather === 'unknown') {
            console.warn('[Subscription] Grandfather status UNKNOWN - failing open until we can check');
          }
        }
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

  // Resolve free-trial eligibility as soon as offerings are available (which
  // happens at launch, during onboarding).
  //
  // TWO routes to "ineligible", and Android relies on the first:
  //
  //  1. No zero-price intro in the offering at all. Play returns only the
  //     offers an account QUALIFIES for, so a Google account that has already
  //     used the trial simply doesn't get the free-trial offer back — no
  //     introPrice, no trial packages, ineligible. This is the Android signal;
  //     checkTrialOrIntroductoryPriceEligibility below always answers UNKNOWN
  //     there, so it can never be the one that fires.
  //
  //  2. StoreKit says INELIGIBLE. iOS only. Apple grants the intro offer once
  //     per subscription GROUP per Apple ID, so a lapsed user comes back
  //     ineligible even on a brand-new device with no local history.
  //
  // On error we fall back to ineligible: an honest "no trial" beats promising
  // a free week the store will refuse to honour.
  useEffect(() => {
    if (Platform.OS === 'web') { setTrialEligible(false); return; }
    if (!offerings) return;
    const offering = offerings.all?.['default'] ?? offerings.current ?? null;
    const trialPkgs = ((offering?.availablePackages ?? []) as any[]).filter((p: any) => {
      const ip = p?.product?.introPrice;
      return !!ip && ip.price === 0;
    });
    if (!trialPkgs.length) { setTrialEligible(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const ids = trialPkgs.map((p: any) => p.product.identifier as string);
        const map = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
        const INELIGIBLE = Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE;
        // Yearly/Monthly share a subscription group → same status; eligible
        // unless the store explicitly says INELIGIBLE.
        const eligible = ids.some((id: string) => map[id]?.status !== INELIGIBLE);
        if (!cancelled) setTrialEligible(eligible);
      } catch (e) {
        console.warn('[Subscription] Trial eligibility check failed:', e);
        if (!cancelled) setTrialEligible(false);
      }
    })();
    return () => { cancelled = true; };
  }, [offerings]);

  return useMemo(
    () => ({
      isLoading,
      error,

      isEntitled,
      isGrandfathered,
      isPremium,

      offerings,
      customerInfo,
      trialEligible,
      qaForceNewUser: forceNewUser,

      refresh,
      applyCustomerInfo,
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
      trialEligible,
      forceNewUser,
      refresh,
      applyCustomerInfo,
      purchasePackage,
      restorePurchases,
    ]
  );
});
