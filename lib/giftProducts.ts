// Pass It On — the three gift SKUs (reworked Jul 18: the single is the only
// tier on screen at first; 5/10 sit behind a "Give more and save" reveal).
// Every tier is anchored against the MONTHLY subscription price — the
// crossed-out figure is months × monthly, so the discount story is "vs paying
// month to month", not vs the single gift. Bulk discounts are deliberately
// deep: unredeemed codes cost nothing (breakage) and redeemed ones are
// word-of-mouth acquisition.
//
// The consumable IAPs exist in App Store Connect (drafts) under exactly these
// product IDs. RevenueCat doesn't have them yet; once they're added there (a
// `gifts` offering) and the ASC drafts are submittable, `fetchGiftProducts`
// starts returning live store products and the purchase screen switches from
// its static prices / dev-mock purchase to the real native payment sheet
// automatically — no code change needed.
import { Platform } from 'react-native';
import Purchases, { PRODUCT_CATEGORY, PurchasesStoreProduct } from 'react-native-purchases';

export interface GiftSku {
  productId: string;
  n: number;               // codes minted per purchase
  label: string;           // "5 gifts"
  price: string;           // static fallback — replaced by the store's localized price
  sub: string;             // one-line role
  badge?: string;          // "Best deal" — chip next to the label
}

// Each gift = 3 months. The monthly-anchor math on the purchase screen uses
// this to turn a pack into months of access.
export const GIFT_MONTHS = 3;

// Static fallback for the monthly subscription price used in the crossed-out
// anchors — replaced by the LIVE monthly price from RevenueCat when it resolves.
export const MONTHLY_PRICE_FALLBACK = 3.99;

// Pricing (Neal, Jul 18 — update the ASC drafts to match): $9.99 / $39.99 /
// $59.99. The unit is the MONTH, not the gift: you're filling a bank of months
// ($3.33 → $2.67 → $2.00/month) that you give away as 3-month codes. LIVE
// prices come from ASC — these are display fallbacks only.
export const GIFT_SKUS: GiftSku[] = [
  { productId: 'gift_3mo_single', n: 1,  label: '3 months',  price: '$9.99',  sub: 'One code to share · full access' },
  { productId: 'gift_3mo_pack5',  n: 5,  label: '15 months', price: '$39.99', sub: 'Five codes · 3 months each' },
  { productId: 'gift_3mo_pack10', n: 10, label: '30 months', price: '$59.99', sub: 'Ten codes · 3 months each', badge: 'Best deal' },
];

// Store products keyed by productId — empty until RevenueCat + ASC are live.
export async function fetchGiftProducts(): Promise<Record<string, PurchasesStoreProduct>> {
  if (Platform.OS === 'web') return {};
  try {
    const products = await Purchases.getProducts(
      GIFT_SKUS.map((s) => s.productId),
      PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    return Object.fromEntries(products.map((p) => [p.identifier, p]));
  } catch (e) {
    console.warn('[Gifts] getProducts failed (expected until RC is configured):', e);
    return {};
  }
}
