export type CustomerInfo = {
  entitlements: {
    active: Record<string, unknown>;
  };
};

export type PurchasesPackage = {
  identifier: string;
  storeProduct?: {
    identifier?: string;
    price?: string | number;
  };
};

/**
 * RevenueCat is disabled for this build. Expose a simple constant so callers can branch.
 */
export const purchasesAvailable = false;

export function configurePurchases(): void {
  console.log('[Purchases] RevenueCat integration disabled for this build.');
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  return null;
}

export async function fetchPackages(): Promise<PurchasesPackage[]> {
  return [];
}

export async function purchasePackage(_pkg: PurchasesPackage): Promise<boolean> {
  console.log('[Purchases] purchasePackage called while RevenueCat is disabled.');
  return false;
}

export async function restorePurchasesSafe(): Promise<CustomerInfo | null> {
  console.log('[Purchases] restorePurchases called while RevenueCat is disabled.');
  return null;
}
