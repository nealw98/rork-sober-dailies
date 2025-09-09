import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesPackage, PurchasesError } from 'react-native-purchases';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

export function configurePurchases(): void {
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) {
    console.warn('RevenueCat API key missing for platform');
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    return null;
  }
}

export async function fetchPackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    return available;
  } catch (e) {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const result = await Purchases.purchasePackage(pkg);
    const entitlements = result.customerInfo.entitlements.active;
    // For consumables, success is enough; for future entitlements, check here
    return true;
  } catch (e) {
    const err = e as PurchasesError;
    // User cancellation and other non-fatal errors should not throw UI errors
    return false;
  }
}


