// Pass It On — the three gift SKUs (Pass It On Handoff 2, spec §5).
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
  each: string | null;     // "$9.00 each"
  sub: string;             // one-line role
}

// Pricing (Neal, Jul 11 — set in ASC): $9.99 / $44.99 / $79.99, i.e. ~$10 →
// $9 → $8 per gift, all above yearly's per-month so self-serve stays yearly.
// LIVE prices come from ASC — these are display fallbacks only.
export const GIFT_SKUS: GiftSku[] = [
  { productId: 'gift_3mo_single', n: 1,  label: '1 gift',   price: '$9.99',  each: null,         sub: 'One code · 3 months of full access' },
  { productId: 'gift_3mo_pack5',  n: 5,  label: '5 gifts',  price: '$44.99', each: '$9.00 each', sub: 'Five codes · 3 months of full access each' },
  { productId: 'gift_3mo_pack10', n: 10, label: '10 gifts', price: '$79.99', each: '$8.00 each', sub: 'Ten codes · 3 months of full access each' },
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
