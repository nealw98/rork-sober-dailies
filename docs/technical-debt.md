# Technical debt

## RevenueCat SDK type and listener API drift

**Recorded:** 2026-08-05
**Priority:** Post-launch cleanup; do not change before launch without a dedicated subscription regression pass.
**Current decision:** Freeze the working RevenueCat integration.

### Known compiler findings

`hooks/useSubscription.ts` does not match two parts of the installed
`react-native-purchases` TypeScript API:

1. It imports and annotates `Offerings` and `Package`; the installed SDK uses
   the newer purchases-prefixed type names.
2. It treats `Purchases.addCustomerInfoUpdateListener(...)` as if it returns an
   unsubscribe function. In the installed SDK it returns `void`; cleanup uses
   `removeCustomerInfoUpdateListener` with the original callback.

### Current risk assessment

- The type-name mismatch is compile-time only; TypeScript types are erased from
  the production bundle.
- The listener mismatch could leave a duplicate listener if the subscription
  provider unmounts and remounts in the same session. The likely effect would
  be duplicate entitlement state updates or logging—not duplicate purchases or
  charges.
- There is currently no observed purchase, restore, entitlement, or billing
  failure attributed to either finding.
- Fixing subscription lifecycle code immediately before launch creates more
  regression risk than leaving this known mismatch in place.

### Required validation before fixing

Make the type and listener changes in an isolated branch and verify all of the
following with the RevenueCat sandbox on both iOS and Android:

- new purchase and paywall-to-unlocked transition;
- restore purchase;
- active entitlement after app restart;
- customer-info refresh after returning from the store purchase sheet;
- cancellation and expiration state refresh;
- grandfathered access with no paid entitlement;
- repeated subscription-provider mount/unmount without duplicate updates;
- monthly and annual package selection;
- trial eligibility and trial copy;
- Developer Console subscription overrides.

Do not change RevenueCat API keys, product/package identifiers, the `premium`
entitlement identifier, grandfathering, paywall rules, trial logic, or gift-pass
calculations as part of this cleanup.
