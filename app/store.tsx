import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Purchases, {
  CustomerInfo,
  Offerings,
  PurchasesPackage,
  PurchaseResult,
} from "react-native-purchases";
import { showToast } from "@/lib/toast";

export default function StoreScreen() {
  // -------- State --------
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // -------- Load offerings --------
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const offs: Offerings = await Purchases.getOfferings();
      const current = offs.current;
      const allPkgs = current?.availablePackages ?? [];

      // Filter to your StoreKit IDs:
      const wanted = new Set(["Tier1", "Tier2", "Tier3"]);
      const filtered = allPkgs
        .filter((p) => wanted.has(p.storeProduct.identifier))
        .sort((a, b) => a.storeProduct.price - b.storeProduct.price);

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

  // -------- Purchase / Restore --------
  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasingId(pkg.storeProduct.identifier);
      const result: PurchaseResult = await Purchases.purchasePackage(pkg);
      onCustomerInfoUpdated(result.customerInfo);
      showToast("Thank you for your contribution!");
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert("Purchase failed", e?.message ?? "Something went wrong processing your contribution.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    try {
      const info: CustomerInfo = await Purchases.restorePurchases();
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
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.contributionButton}
            activeOpacity={0.85}
            disabled={!!purchasingId}
            onPress={() => handlePurchase(pkg)}
          >
            <Text style={styles.contributionText}>
              {friendlyTitle(pkg.storeProduct.identifier)} — {pkg.storeProduct.priceString}
            </Text>
            {purchasingId === pkg.storeProduct.identifier ? (
              <ActivityIndicator style={{ marginTop: 6 }} />
            ) : null}
          </TouchableOpacity>
        ))}

        <Text style={styles.disclaimer}>Contributions are optional and don’t unlock features.</Text>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.85}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, packages, purchasingId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Support Sober Dailies</Text>
      <Text style={styles.subheader}>Choose a one-time tip</Text>
      {content}
      <Text style={styles.legal}>Processed by Apple. Support: support@soberdailies.com</Text>
    </ScrollView>
  );
}

function friendlyTitle(id: string) {
  switch (id) {
    case "Tier1":
      return "Show your appreciation";
    case "Tier2":
      return "Support the App";
    case "Tier3":
      return "Keep it Free";
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
  disclaimer: { textAlign: "center", color: "#6b7280", marginTop: 8, marginBottom: 8, fontSize: 14, fontStyle: "italic" },
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


