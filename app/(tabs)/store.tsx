import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { Stack } from "expo-router";
import { 
  fetchPackages as rcFetchPackages,
  purchasePackage as rcPurchasePackage,
  restorePurchasesSafe,
  getCustomerInfoSafe,
} from "@/lib/purchases";

export default function StoreScreen() {
  // -------- State --------
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------- Load offerings --------
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const allPkgs = await rcFetchPackages();

      // Filter to your StoreKit IDs:
      const wanted = new Set(["monthly_support", "yearly_support"]);
      
      // Log all packages for debugging
      console.log('[Store] All packages with details:', allPkgs.map((p) => ({
        pkgId: p.identifier,
        storeId: p.storeProduct?.identifier,
        price: p.storeProduct?.price,
        priceString: p.storeProduct?.priceString
      })));
      
      // First try to filter by store product identifier
      let filtered = allPkgs
        .filter((p) => p.storeProduct && wanted.has(p.storeProduct.identifier))
        .sort((a, b) => (a.storeProduct?.price || 0) - (b.storeProduct?.price || 0));
      
      // If we didn't find any products by store identifier, try package identifier
      if (filtered.length === 0) {
        console.log('[Store] No products found by store identifier, trying package identifier');
        filtered = allPkgs
          .filter((p) => wanted.has(p.identifier))
          .sort((a, b) => (a.storeProduct?.price || 0) - (b.storeProduct?.price || 0));
        
        if (filtered.length > 0) {
          console.log('[Store] Found products by package identifier:', filtered.map((p) => p.identifier));
        }
      }
      
      console.log('[Store] Final filtered packages:', filtered.map((p) => ({
        pkgId: p.identifier, 
        storeId: p.storeProduct?.identifier
      })));

      setPackages(filtered);
    } catch (e: any) {
      Alert.alert("Store not ready", e?.message ?? "Unable to load products. Check your RevenueCat Offering 'default'.");
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update status text after ~2s if sheet hasn't appeared yet
  useEffect(() => {
    if (!purchasingId) {
      setConnecting(false);
      return;
    }
    const timer = setTimeout(() => setConnecting(true), 2000);
    return () => {
      clearTimeout(timer);
      setConnecting(false);
    };
  }, [purchasingId]);

  // -------- Purchase / Restore --------
  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasingId(pkg.storeProduct.identifier);
      setErrorMessage(null);
      const ok = await rcPurchasePackage(pkg);
      if (ok) {
        const info = await getCustomerInfoSafe();
        if (info) onCustomerInfoUpdated(info);
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      // Minimal, non-blocking error
      setErrorMessage(e?.message ?? "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    try {
      const info: CustomerInfo | null = await restorePurchasesSafe();
      if (!info) throw new Error('Store unavailable');
      onCustomerInfoUpdated(info);
      // FYI: Restoring **consumables** won’t re-grant old tips. That’s expected.
      Alert.alert("Restored", "Restored eligible purchases (non-consumables/subscriptions).");
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? "Unable to restore purchases right now.");
    }
  };

  const onCustomerInfoUpdated = (_info: CustomerInfo) => {
    // Hook for entitlements if you ever add subscriptions/non-consumables later.
  };

  // -------- UI --------
  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading products…</Text>
        </View>
      );
    }

    if (packages.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.muted}>No products available. Check your RevenueCat default offering.</Text>
        </View>
      );
    }

    return (
      <View style={styles.list}>
        {packages.map((pkg) => {
          const id = pkg?.storeProduct?.identifier ?? pkg?.identifier;
          const priceString = pkg?.storeProduct?.priceString ?? "";
          const isMonthly = id === "monthly_support";
          const isYearly = id === "yearly_support";

          if (!id) {
            return null;
          }

          return (
          <TouchableOpacity
            key={id}
            style={styles.contributionButton}
            activeOpacity={0.85}
            disabled={purchasingId === id}
            onPress={() => handlePurchase(pkg)}
          >
            {purchasingId === id ? (
              <View style={{ alignItems: "center" }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.statusText}>Opening Apple…</Text>
                {connecting ? (
                  <Text style={styles.statusSubtext}>Connecting to App Store…</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.contributionText}>
                {isMonthly
                  ? "$1.99 / month"
                  : isYearly
                  ? "$19.99 / year"
                  : `${friendlyTitle(id)}${priceString ? ` — ${priceString}` : ''}`}
              </Text>
            )}
          </TouchableOpacity>
          );
        })}

        <Text style={styles.disclaimer}>Subscriptions are optional and help support app development.</Text>

        {errorMessage ? (
          <Text style={styles.inlineError}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.85}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, packages, purchasingId]);

  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: '',
        headerBackTitle: '',
        headerBackTitleVisible: false
      }} />
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Support Sober Dailies</Text>
      <Text style={styles.subheader}>Choose a subscription plan</Text>
      {content}
      <Text style={styles.legal}>Processed by Apple. Support: support@soberdailies.com</Text>
    </ScrollView>
    </>
  );
}

function friendlyTitle(id: string) {
  switch (id) {
    case "monthly_support":
      return "Monthly Support";
    case "yearly_support":
      return "Yearly Support";
    default:
      return id;
  }
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 22, fontWeight: "800", textAlign: "center", color: "#0f172a" },
  subheader: { fontSize: 14, textAlign: "center", color: "#475569", marginTop: 6, marginBottom: 12 },
  list: { gap: 12 },
  contributionButton: {
    backgroundColor: "#2f6fec",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  contributionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statusText: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 6 },
  statusSubtext: { color: "#e5e7eb", fontSize: 12, marginTop: 2 },
  disclaimer: { textAlign: "center", color: "#6b7280", marginTop: 8, marginBottom: 8, fontSize: 14, fontStyle: "italic" },
  inlineError: { textAlign: "center", color: "#b91c1c", marginBottom: 8, fontSize: 12 },
  restoreButton: {
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  restoreText: { color: "#2f6fec", fontSize: 14, fontWeight: "600" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 8 },
  muted: { color: "#6b7280", fontSize: 14 },
  legal: { fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 16 },
});


