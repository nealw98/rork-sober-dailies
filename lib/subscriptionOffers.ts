import { Platform } from 'react-native';
import type { PurchasesPackage, SubscriptionOption } from 'react-native-purchases';

// Google Play offer IDs. They deliberately live in one place because the
// ordinary paywall and Pass It On must make opposite choices from the same
// annual product: the normal seven-day trial vs. the private three-month pass.
export const NORMAL_YEARLY_OFFER_ID = 'free-trial-2';
export const PASS_OFFER_ID = 'pass-3mo';

function offerId(option: SubscriptionOption): string {
  const parts = option.id.split(':');
  return parts[parts.length - 1] || option.id;
}

export function isPassOption(option: SubscriptionOption): boolean {
  return offerId(option) === PASS_OFFER_ID || option.tags?.includes(PASS_OFFER_ID) === true;
}

function isYearlyPackage(pkg: PurchasesPackage): boolean {
  const packageType = String(pkg.packageType || '').toUpperCase();
  const packageId = String(pkg.identifier || '').toLowerCase();
  const productId = String(pkg.product?.identifier || '').toLowerCase();
  return packageType.includes('ANNUAL') || packageType.includes('YEAR') ||
    packageId === '$rc_annual' || productId.includes('yearly');
}

/**
 * Pick the option used by the ordinary Android paywall. Never return the Pass
 * It On option: RevenueCat's automatic default favors the longest free trial,
 * which would otherwise make the private three-month offer available to every
 * eligible annual buyer.
 */
export function getNormalSubscriptionOption(pkg: PurchasesPackage): SubscriptionOption | null {
  if (Platform.OS !== 'android') return null;
  const options = pkg.product?.subscriptionOptions ?? [];
  const safe = options.filter((option) => !isPassOption(option));
  if (safe.length === 0) return null;

  if (isYearlyPackage(pkg)) {
    const normalTrial = safe.find((option) => offerId(option) === NORMAL_YEARLY_OFFER_ID);
    if (normalTrial) return normalTrial;
  }

  const defaultOption = pkg.product?.defaultOption;
  if (defaultOption && !isPassOption(defaultOption)) {
    const matching = safe.find((option) => option.id === defaultOption.id);
    if (matching) return matching;
  }

  // Google removes ineligible offers. A returning user therefore falls back to
  // the base plan and is charged immediately, exactly as the Play sheet states.
  return safe.find((option) => option.isBasePlan) ?? safe[0] ?? null;
}

export function getPassSubscriptionOption(pkg: PurchasesPackage | null): SubscriptionOption | null {
  if (Platform.OS !== 'android' || !pkg) return null;
  return (pkg.product?.subscriptionOptions ?? []).find(isPassOption) ?? null;
}

export function trialDaysFromSubscriptionOption(option: SubscriptionOption | null): number | null {
  const free = option?.pricingPhases?.find((phase) => phase.price.amountMicros === 0);
  if (!free) return null;
  const value = Number(free.billingPeriod?.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (String(free.billingPeriod?.unit || '').toUpperCase()) {
    case 'DAY': return value;
    case 'WEEK': return value * 7;
    case 'MONTH': return value * 30;
    case 'YEAR': return value * 365;
    default: return null;
  }
}
