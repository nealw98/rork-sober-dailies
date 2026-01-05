import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { NativeModules } from 'react-native';

// Lazy-load RevenueCat to avoid NativeEventEmitter crash in Expo Go/simulators without native module
let _purchasesModule: any = null;
function getPurchases(): any {
  if (_purchasesModule !== null) return _purchasesModule === false ? null : _purchasesModule;
  try {
    const nativeModule = NativeModules?.RNPurchases;
    if (!nativeModule || typeof nativeModule.setupPurchases !== 'function') {
      _purchasesModule = false;
      return null;
    }
    const mod = require('react-native-purchases');
    _purchasesModule = (mod && mod.default) ? mod.default : mod;
    return _purchasesModule;
  } catch (e) {
    console.log('[RevenueCat] Failed to load:', e);
    _purchasesModule = false;
    return null;
  }
}

const SupportDeveloperScreen = () => {
  const log = __DEV__ ? console.log : (..._args: any[]) => {};
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [packagesById, setPackagesById] = useState<Record<string, PurchasesPackage>>({});
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadOfferings = async () => {
      log(`[Offerings] Starting to load offerings (attempt ${retryCount + 1})`);
      
      try {
        const Purchases = getPurchases();
        if (!Purchases) {
          if (mounted) {
            setErrorMessage('RevenueCat not available in this environment');
            setIsLoadingOfferings(false);
          }
          return;
        }
        
        const offs: any = await Purchases.getOfferings();
        const current = offs?.current;
        
        const allPkgs = current?.availablePackages ?? [];
        const wantedTiers = new Set(['tier1', 'tier2', 'tier3', 'Tier1', 'Tier2', 'Tier3']);
        
        const filtered: PurchasesPackage[] = allPkgs.filter((p: any) => 
          wantedTiers.has(p.identifier) || 
          /^tier[123]$/i.test(p.identifier) ||
          p.identifier?.startsWith('$rc_')
        );

        const byId: Record<string, PurchasesPackage> = {};
        
        filtered.forEach((p: any) => {
          const normalizedId = p.identifier.toLowerCase();
          if (normalizedId === 'tier1' || normalizedId === 'tier2' || normalizedId === 'tier3') {
            byId[normalizedId] = p;
          } else if (normalizedId === '$rc_monthly' && !byId['tier1']) {
            byId['tier1'] = p;
          } else if (normalizedId === '$rc_six_month' && !byId['tier2']) {
            byId['tier2'] = p;
          } else if (normalizedId === '$rc_annual' && !byId['tier3']) {
            byId['tier3'] = p;
          }
        });
        
        if (mounted) {
          setPackagesById(byId);
          setErrorMessage(null);
          setIsLoadingOfferings(false);
        }
      } catch (error: any) {
        if (mounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = 2000 * retryCount;
            setTimeout(() => {
              if (mounted) loadOfferings();
            }, retryDelay);
          } else {
            setErrorMessage('Unable to load products. Please check your connection and try again.');
            setIsLoadingOfferings(false);
          }
        }
      }
    };

    loadOfferings();
    return () => { mounted = false; };
  }, []);

  const handleTierPress = async (tierId: string) => {
    try { await Haptics.selectionAsync(); } catch {}
    
    if (isLoadingOfferings) {
      setErrorMessage('Loading products...');
      return;
    }
    
    const pkg = packagesById[tierId];
    
    if (!pkg) {
      setErrorMessage('Product not available. Please try again or check your connection.');
      return;
    }
    
    try {
      setErrorMessage(null);
      setPurchasingId(tierId);

      await Promise.resolve();

      const hideTimer = setTimeout(() => {
        setPurchasingId(null);
      }, 1500);

      try {
        const Purchases = getPurchases();
        if (!Purchases) {
          throw new Error('RevenueCat not available');
        }
        await Purchases.purchasePackage(pkg);
      } finally {
        clearTimeout(hideTimer);
      }
      
      Alert.alert('Thank you!', 'Your support helps keep Sober Dailies running smoothly.');
    } catch (e: any) {
      if (e?.userCancelled) {
        return;
      }
      setErrorMessage(e?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const tier1Pkg = packagesById['tier1'];
  const tier2Pkg = packagesById['tier2'];
  const tier3Pkg = packagesById['tier3'];
  
  const tier1Label = (tier1Pkg as any)?.storeProduct?.priceString || '$4.99';
  const tier2Label = (tier2Pkg as any)?.storeProduct?.priceString || '$9.99';
  const tier3Label = (tier3Pkg as any)?.storeProduct?.priceString || '$19.99';
  
  const areProductsAvailable = !isLoadingOfferings && (tier1Pkg || tier2Pkg || tier3Pkg);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
          style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
          <Text style={styles.headerTitle}>Support the App</Text>
        </LinearGradient>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.descriptionText}>
            These are one-time voluntary support options. No extra content is unlocked.
          </Text>

          {isLoadingOfferings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#3D8B8B" />
              <Text style={styles.loadingText}>Loading products…</Text>
            </View>
          ) : !areProductsAvailable ? (
            <Text style={styles.unavailableText}>Support options unavailable right now.</Text>
          ) : (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.tierButton, styles.tierButtonBlue, !tier1Pkg && styles.tierButtonDisabled]}
                onPress={() => tier1Pkg && handleTierPress('tier1')}
                disabled={!tier1Pkg || purchasingId === 'tier1'}
                activeOpacity={0.8}
              >
                {purchasingId === 'tier1' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.tierButtonText}>{tier1Label}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tierButton, styles.tierButtonTeal, !tier2Pkg && styles.tierButtonDisabled]}
                onPress={() => tier2Pkg && handleTierPress('tier2')}
                disabled={!tier2Pkg || purchasingId === 'tier2'}
                activeOpacity={0.8}
              >
                {purchasingId === 'tier2' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.tierButtonText}>{tier2Label}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tierButton, styles.tierButtonGreen, !tier3Pkg && styles.tierButtonDisabled]}
                onPress={() => tier3Pkg && handleTierPress('tier3')}
                disabled={!tier3Pkg || purchasingId === 'tier3'}
                activeOpacity={0.8}
              >
                {purchasingId === 'tier3' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.tierButtonText}>{tier3Label}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {errorMessage ? (
            <Text style={styles.inlineError}>{errorMessage}</Text>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  descriptionText: {
    fontSize: 18,
    color: '#555',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  unavailableText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 40,
  },
  buttonsContainer: {
    gap: 16,
  },
  tierButton: {
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tierButtonBlue: {
    backgroundColor: '#4A68B5',
    shadowColor: '#4A68B5',
  },
  tierButtonTeal: {
    backgroundColor: '#3D8B8B',
    shadowColor: '#3D8B8B',
  },
  tierButtonGreen: {
    backgroundColor: '#4AA06A',
    shadowColor: '#4AA06A',
  },
  tierButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
    shadowColor: '#9ca3af',
  },
  tierButtonText: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  inlineError: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default SupportDeveloperScreen;
