import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { getAnonymousId } from '@/lib/anonymousId';
import { syncTrialReminder } from '@/lib/trialReminder';
import {
  getNormalSubscriptionOption,
  getPassSubscriptionOption,
  trialDaysFromSubscriptionOption,
} from '@/lib/subscriptionOffers';

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

// How long one RevenueCat/store round-trip may run before we surface the error
// card instead. getOfferings has known native hang modes; without a bound the
// paywall's resolving spinner never exits — the original pre-fail-screen bug,
// still latent underneath it.
const FETCH_TIMEOUT_MS = 10000;

// Silent launch retries. One failed request must not become a terminal fail
// screen: the 2026-08-18 App Review rejection was a single bad fetch that a
// retry seconds later would almost certainly have erased. The paywall holds
// its resolving spinner while these run.
const RETRY_DELAYS_MS = [2000, 6000];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Store request timed out.')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// "Loaded" means something we can actually sell, not just a 200. RevenueCat
// can resolve successfully with an empty catalog (the store declined to vend
// the products) — that must retry exactly like a transport failure.
function hasSellablePackages(offs: PurchasesOfferings): boolean {
  const offering = offs.all?.['default'] ?? offs.current ?? null;
  return (offering?.availablePackages?.length ?? 0) > 0;
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
  // Silent launch retries in progress — the paywall shows its resolving
  // spinner, not the fail screen, while this is true.
  autoRetrying: boolean;
  error: string | null;

  isEntitled: boolean;
  isGrandfathered: boolean;
  isPremium: boolean;

  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  trialEligible: boolean | null;
  // QA force-new-user flag (Developer Console) is active — the paywall is gating
  // only because the flag hides grandfather/entitlement. Lets the paywall show
  // a QA banner so a forced gate is never mistaken for a real one.
  qaForceNewUser: boolean;

  refresh: () => Promise<boolean>;
  applyCustomerInfo: (info: CustomerInfo) => void;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  purchasePassPackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPremiumOverride, setIsPremiumOverride] = useState(false);
  const [isGrandfathered, setIsGrandfathered] = useState(false);
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
        // An unanswerable grandfather check does NOT grant access. Previously
        // verified members are still protected: checkGrandfatherStatus() turns
        // their cached confirmation into "yes" during an outage. Treating every
        // uncached "unknown" as premium let a fresh user bypass the paywall by
        // launching while the grandfather endpoint was unreachable.
        : isEntitled || isGrandfathered || isPremiumOverride;

  // Tracks whether we currently hold a sellable catalog, for the resume-refetch
  // below. A ref, not state: the AppState listener must read the latest value
  // without re-subscribing.
  const offeringsOkRef = useRef(false);
  // True while the silent launch retry loop runs — the paywall shows its
  // resolving spinner instead of the fail screen during this window.
  const [autoRetrying, setAutoRetrying] = useState(false);
  const autoRetryingRef = useRef(false);
  const lastResumeAttemptRef = useRef(0);

  // Refresh subscription status from RevenueCat. Returns whether we ended up
  // with a sellable catalog, so callers (launch retry, resume refetch) can
  // decide to try again.
  const refresh = useCallback(async (): Promise<boolean> => {
    setError(null);

    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return false;
    }

    if (Platform.OS === 'web') return true;

    try {
      const [info, offs] = await withTimeout(
        Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]),
        FETCH_TIMEOUT_MS,
      );
      
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
      const ok = hasSellablePackages(offs);
      offeringsOkRef.current = ok;
      return ok;
    } catch (e: any) {
      console.error('[Subscription] Refresh error:', e);
      setError(e?.message || 'Failed to refresh subscription status.');
      return false;
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

  // Purchase a normal subscription package. Android is deliberately explicit:
  // purchasePackage() lets RevenueCat choose a default, and with the private
  // pass active that default can be the longest free trial (three months).
  // Selecting a known non-pass SubscriptionOption keeps the ordinary paywall
  // on its seven-day offer or the base plan when the user is ineligible.
  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    setError(null);

    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return null;
    }

    if (Platform.OS === 'web') return null;

    try {
      const result = Platform.OS === 'android'
        ? await (async () => {
            const option = getNormalSubscriptionOption(pkg);
            if (!option) throw new Error('This subscription plan is not currently available.');
            return Purchases.purchaseSubscriptionOption(option);
          })()
        : await Purchases.purchasePackage(pkg);
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

  // Purchase the private Google Play pass option. The caller is responsible
  // for validating and binding the share token before invoking this method.
  const purchasePassPackage = useCallback(async (pkg: PurchasesPackage) => {
    setError(null);

    const configured = await ensurePurchasesConfigured();
    if (!configured.ok) {
      setError(configured.error);
      return null;
    }
    if (Platform.OS !== 'android') return null;

    try {
      const option = getPassSubscriptionOption(pkg);
      if (!option) {
        throw new Error('This Google Play account is not eligible for the pass offer.');
      }
      const result = await Purchases.purchaseSubscriptionOption(option);
      setCustomerInfo(result.customerInfo);
      if (result.customerInfo.entitlements.active?.[ENTITLEMENT_ID]) setSessionPurchaseUnlock(true);
      return result.customerInfo;
    } catch (e: any) {
      const isCancelled = e?.userCancelled || e?.code === '1' || e?.message?.includes('cancelled');
      const msg = isCancelled ? null : (e?.message || 'Purchase failed.');
      if (msg) {
        console.error('[Subscription] Pass purchase error:', e);
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
    let customerInfoListener: CustomerInfoUpdateListener | null = null;

    (async () => {
      // Whether the launch fetch left us with something to sell — drives the
      // silent retry loop below. Start true so web/dev short-circuits skip it.
      let refreshedOk = true;
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
        const [grandfather, ok] = await Promise.all([
          checkGrandfatherStatus(),
          refresh(),
        ]);
        refreshedOk = ok;
        if (!didCancel) {
          setIsGrandfathered(grandfather === 'yes');
          if (grandfather === 'yes') {
            console.log('[Subscription] User is grandfathered - unlocking premium features');
          } else if (grandfather === 'unknown') {
            console.warn('[Subscription] Grandfather status UNKNOWN - access requires another entitlement');
          }
        }
      } catch (error) {
        console.error('[Subscription] Initialization error:', error);
        refreshedOk = false;
      } finally {
        if (!didCancel) setIsLoading(false);
      }

      // Silent launch retries: a failed (or empty) first fetch gets two more
      // chances before anyone sees the fail screen. Deliberately after
      // isLoading clears so grandfather/entitlement gating is never delayed —
      // only the paywall's own resolve waits, on its spinner.
      if (!didCancel && !refreshedOk && Platform.OS !== 'web') {
        setAutoRetrying(true);
        autoRetryingRef.current = true;
        try {
          for (const delay of RETRY_DELAYS_MS) {
            await sleep(delay);
            if (didCancel) return;
            if (await refresh()) break;
          }
        } finally {
          autoRetryingRef.current = false;
          if (!didCancel) setAutoRetrying(false);
        }
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
            customerInfoListener = (info) => {
              if (!didCancel) setCustomerInfo(info);
            };
            Purchases.addCustomerInfoUpdateListener(customerInfoListener);
          }
        } catch (listenerError) {
          console.warn('[Subscription] Failed to add customer info listener (non-fatal):', listenerError);
        }
      };
      setupListener();
    }

    return () => {
      didCancel = true;
      if (customerInfoListener) {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
        customerInfoListener = null;
      }
    };
  }, [refresh]);

  // A launch that failed offline should heal the moment the user comes back to
  // the app with connectivity — not wait for them to find the Retry button.
  // Guarded: only when we hold no sellable catalog, never overlapping the
  // launch retry loop, at most once per 10s.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (offeringsOkRef.current || autoRetryingRef.current) return;
      const now = Date.now();
      if (now - lastResumeAttemptRef.current < 10000) return;
      lastResumeAttemptRef.current = now;
      refresh().catch(() => {});
    });
    return () => sub.remove();
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
    const trialPkgs = ((offering?.availablePackages ?? []) as PurchasesPackage[]).filter((p) => {
      if (Platform.OS === 'android') {
        // Ignore the Pass It On option. Its presence must not make the ordinary
        // paywall advertise a trial the normal purchase path will never select.
        return trialDaysFromSubscriptionOption(getNormalSubscriptionOption(p)) !== null;
      }
      const ip = (p.product as any)?.introPrice;
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
      autoRetrying,
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
      purchasePassPackage,
      restorePurchases,
    }),
    [
      isLoading,
      autoRetrying,
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
      purchasePassPackage,
      restorePurchases,
    ]
  );
});
