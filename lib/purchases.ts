import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import type PurchasesNamespace from 'react-native-purchases';

const RC_IOS_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ||
  // Fallback to app.json extra for preview builds
  ((Constants.expoConfig?.extra as any)?.revenuecat?.iosPublicApiKey ||
    (Constants.manifest as any)?.extra?.revenuecat?.iosPublicApiKey ||
    (Constants.manifest2 as any)?.extra?.revenuecat?.iosPublicApiKey ||
    '');
const RC_ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ||
  // Fallback to app.json extra for preview builds
  ((Constants.expoConfig?.extra as any)?.revenuecat?.androidPublicApiKey ||
    (Constants.manifest as any)?.extra?.revenuecat?.androidPublicApiKey ||
    (Constants.manifest2 as any)?.extra?.revenuecat?.androidPublicApiKey ||
    '');

let purchasesModule: typeof PurchasesNamespace | null = null;

function getPurchasesSafe(): typeof PurchasesNamespace | null {
  if (purchasesModule) return purchasesModule;
  try {
    if (!NativeModules || !('RNPurchases' in NativeModules)) {
      return null;
    }
    // Avoid static import to prevent crashes in environments without the native module (e.g., Expo Go)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    purchasesModule = (mod && mod.default) ? mod.default : mod;
    return purchasesModule;
  } catch {
    return null;
  }
}

export function configurePurchases(): void {
  const Purchases = getPurchasesSafe();
  if (!Purchases) return;
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) {
    console.log('[RevenueCat] API key missing for platform', Platform.OS);
    return;
  }
  console.log('[RevenueCat] API key present for', Platform.OS);
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
}

export async function getCustomerInfoSafe(): Promise<PurchasesNamespace.CustomerInfo | null> {
  const Purchases = getPurchasesSafe();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function fetchPackages(): Promise<PurchasesNamespace.PurchasesPackage[]> {
  const Purchases = getPurchasesSafe();
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    return available;
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesNamespace.PurchasesPackage): Promise<boolean> {
  const Purchases = getPurchasesSafe();
  if (!Purchases) return false;
  try {
    const result = await Purchases.purchasePackage(pkg);
    void result; // not used yet, but ensures type safety
    return true;
  } catch {
    return false;
  }
}

export async function restorePurchasesSafe(): Promise<PurchasesNamespace.CustomerInfo | null> {
  const Purchases = getPurchasesSafe();
  if (!Purchases) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}


