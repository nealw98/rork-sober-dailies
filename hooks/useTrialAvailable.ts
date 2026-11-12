// Can this person start a free trial? One answer for every screen that has to
// word itself around it — the paywall (which layout to show) and onboarding's
// "try the sponsors" step (its button and the sponsors' closings).
import { Platform } from 'react-native';
import { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { getNormalSubscriptionOption, trialDaysFromSubscriptionOption } from '@/lib/subscriptionOffers';

export const isYearlyPkg = (p: PurchasesPackage) => {
  const type = String(p?.packageType || '').toUpperCase();
  const id = String(p?.identifier || '').toLowerCase();
  return type.includes('ANNUAL') || type.includes('YEAR') || id === '$rc_annual';
};
export const isMonthlyPkg = (p: PurchasesPackage) => {
  const type = String(p?.packageType || '').toUpperCase();
  const id = String(p?.identifier || '').toLowerCase();
  return type.includes('MONTH') || id === '$rc_monthly';
};

// Trial length comes from the STORE, not from us: the offer is configured in
// App Store Connect / Play, and copy that contradicts the sheet the user is
// about to sign is a broken promise. Returns null when the package carries no
// free intro period (or the store hasn't answered yet).
function iosTrialDays(pkg: PurchasesPackage): number | null {
  const intro = (pkg?.product as any)?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = Number(intro.periodNumberOfUnits ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (String(intro.periodUnit || '').toUpperCase()) {
    case 'DAY': return n;
    case 'WEEK': return n * 7;
    case 'MONTH': return n * 30;
    case 'YEAR': return n * 365;
    default: return null;
  }
}

export function packageTrialDays(pkg: PurchasesPackage | null): number | null {
  if (!pkg) return null;
  return Platform.OS === 'android'
    ? trialDaysFromSubscriptionOption(getNormalSubscriptionOption(pkg))
    : iosTrialDays(pkg);
}

// Has this person already used their free trial? If so the store bills them
// the moment they subscribe, so promising a free week would be a lie.
// Two signals, because neither covers both platforms on its own:
//  · trialEligible === false — StoreKit's answer, iOS only (Play always
//    reports UNKNOWN before purchase, so it never fires on Android).
//  · any prior purchase on the account — works on both. An ACTIVE subscriber
//    never reaches the paywall, so history there means lapsed or expired.
export function hasUsedTrial(trialEligible: boolean | null, customerInfo: CustomerInfo | null): boolean {
  return trialEligible === false || ((customerInfo as any)?.allPurchasedProductIdentifiers?.length ?? 0) > 0;
}

// The paywall's default pick is yearly, so its trial is the one offered.
// Assumes a trial until we know otherwise: before the store answers (or when
// it can't, e.g. no Play account) a newcomer still sees "Start my free trial".
// Only a used trial, or loaded packages that carry none, say no. The paywall
// itself words the offer from the store, so it never promises what isn't there.
export function useTrialAvailable(): boolean {
  const { offerings, trialEligible, customerInfo } = useSubscription();
  if (hasUsedTrial(trialEligible, customerInfo)) return false;
  const offering = offerings?.all?.['default'] ?? offerings?.current ?? null;
  const packages = offering?.availablePackages ?? [];
  if (packages.length === 0) return true;
  const yearly = packages.find(isYearlyPkg) ?? null;
  const monthly = packages.find(isMonthlyPkg) ?? null;
  return (packageTrialDays(yearly) ?? packageTrialDays(monthly)) !== null;
}
