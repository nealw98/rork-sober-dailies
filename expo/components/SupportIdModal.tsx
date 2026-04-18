import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Copy, RefreshCw, X } from 'lucide-react-native';
import Purchases from 'react-native-purchases';
import { adjustFontWeight } from '@/constants/fonts';

interface SupportIdModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SupportIdModal({ visible, onClose }: SupportIdModalProps) {
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [idLoading, setIdLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<'premium' | 'none' | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRefreshResult(null);
    setCopied(false);

    (async () => {
      if (Platform.OS === 'web') {
        setAppUserId(null);
        setIdError('Support ID is not available on web.');
        return;
      }
      setIdLoading(true);
      setIdError(null);
      try {
        const id = await Purchases.getAppUserID();
        setAppUserId(id);
      } catch (e: any) {
        setIdError(e?.message || 'Could not retrieve Support ID.');
      } finally {
        setIdLoading(false);
      }
    })();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!appUserId) return;
    await Clipboard.setStringAsync(appUserId);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [appUserId]);

  const handleRefresh = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setIsRefreshing(true);
    setRefreshResult(null);
    try {
      const info = await Purchases.getCustomerInfo();
      const entitled = !!info?.entitlements?.active?.premium;
      setRefreshResult(entitled ? 'premium' : 'none');
      Haptics.notificationAsync(
        entitled
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    } catch {
      setRefreshResult('none');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Support ID</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={22} color="#6b7c8a" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.intro}>
              If you&apos;re redeeming a gift or contacting support, share the ID below with us.
            </Text>

            <View style={styles.idContainer}>
              {idLoading ? (
                <ActivityIndicator color="#3D8B8B" />
              ) : idError ? (
                <Text style={styles.idError}>{idError}</Text>
              ) : (
                <Text style={styles.idText} selectable>
                  {appUserId || 'Not available'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                (!appUserId || idLoading) && styles.actionBtnDisabled,
              ]}
              onPress={handleCopy}
              disabled={!appUserId || idLoading}
              activeOpacity={0.85}
            >
              <Copy size={16} color="#fff" />
              <Text style={styles.actionBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.refreshNote}>
              If you just received a gift subscription, tap Refresh after Neal confirms it&apos;s granted.
            </Text>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnSecondary,
                (isRefreshing || Platform.OS === 'web') && styles.actionBtnDisabled,
              ]}
              onPress={handleRefresh}
              disabled={isRefreshing || Platform.OS === 'web'}
              activeOpacity={0.85}
            >
              {isRefreshing ? (
                <ActivityIndicator color="#3D8B8B" />
              ) : (
                <>
                  <RefreshCw size={16} color="#3D8B8B" />
                  <Text style={styles.actionBtnSecondaryText}>Refresh subscription</Text>
                </>
              )}
            </TouchableOpacity>

            {refreshResult === 'premium' && (
              <Text style={styles.statusSuccess}>Premium unlocked. You&apos;re all set.</Text>
            )}
            {refreshResult === 'none' && (
              <Text style={styles.statusPending}>
                No active subscription found yet. Give it a moment and tap Refresh again.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f3',
  },
  title: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600', true),
    color: '#2d3748',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
    paddingTop: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4a5565',
    marginBottom: 16,
    fontWeight: adjustFontWeight('400'),
  },
  idContainer: {
    backgroundColor: '#f0f4f4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  idText: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: '#2d3748',
  },
  idError: {
    fontSize: 13,
    color: '#b33a3a',
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3D8B8B',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3D8B8B',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: adjustFontWeight('600', true),
  },
  actionBtnSecondaryText: {
    color: '#3D8B8B',
    fontSize: 15,
    fontWeight: adjustFontWeight('600', true),
  },
  divider: {
    height: 1,
    backgroundColor: '#eef1f3',
    marginVertical: 18,
  },
  refreshNote: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7c8a',
    marginBottom: 12,
  },
  statusSuccess: {
    marginTop: 12,
    fontSize: 14,
    color: '#2f7d5b',
    textAlign: 'center',
    fontWeight: adjustFontWeight('600', true),
  },
  statusPending: {
    marginTop: 12,
    fontSize: 13,
    color: '#6b7c8a',
    textAlign: 'center',
    lineHeight: 18,
  },
});
