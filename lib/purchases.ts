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
      console.log('[RevenueCat] RNPurchases not found in NativeModules.');
      return null;
    }
    console.log('[RevenueCat] RNPurchases found in NativeModules. Requiring module...');
    // Avoid static import to prevent crashes in environments without the native module (e.g., Expo Go)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    if (!mod) {
      console.log('[RevenueCat] require("react-native-purchases") returned null or undefined.');
      return null;
    }
    purchasesModule = (mod && mod.default) ? mod.default : mod;
    console.log('[RevenueCat] Module required successfully.');
    return purchasesModule;
  } catch (error) {
    console.log('[RevenueCat] Error requiring "react-native-purchases":', error);
    return null;
  }
}

export function configurePurchases(): void {
  const Purchases = getPurchasesSafe();
  if (!Purchases) {
    console.log('[RevenueCat] Purchases module not available. Skipping configuration.');
    return;
  }
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) {
    console.log('[RevenueCat] API key missing for platform', Platform.OS);
    return;
  }
  try {
    console.log('[RevenueCat] Configuring with API key for', Platform.OS);
    if (typeof Purchases.setLogLevel === 'function' && Purchases.LOG_LEVEL?.DEBUG) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    } else {
      console.log('[RevenueCat] setLogLevel not available; continuing without adjusting log level.');
    }
    if (typeof Purchases.configure === 'function') {
      Purchases.configure({ apiKey });
      console.log('[RevenueCat] Configuration complete.');
    } else {
      console.log('[RevenueCat] Purchases.configure unavailable; skipping configuration.');
    }
  } catch (error) {
    console.log('[RevenueCat] Failed to configure purchases module:', error);
  }
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


