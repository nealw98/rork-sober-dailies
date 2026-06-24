// Native PDF reader (redesign 3.0) for the bundled, offline A.A. essays.
// Renders a require()'d PDF asset via react-native-pdf (smooth native zoom/
// paging on iOS + Android). expo-asset resolves the bundled module to a local
// file URI. Presented full-screen in a Modal by the caller.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import Pdf from 'react-native-pdf';
import { X } from 'lucide-react-native';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');

export default function PdfReader({ assetModule, title, onClose }: { assetModule: number; title: string; onClose: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let alive = true;
    setUri(null);
    setFailed(false);
    setPage(1);
    setPages(0);
    (async () => {
      try {
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync(); // copies the bundled asset to a readable file
        if (alive) setUri(asset.localUri ?? asset.uri);
      } catch (e) {
        console.warn('[pdf] asset resolve failed', e);
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [assetModule]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <X size={18} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {pages > 0 && <Text style={styles.meta}>Page {page} of {pages}</Text>}
        </View>
      </View>

      <View style={styles.body}>
        {failed ? (
          <Text style={styles.msg}>This document couldn’t be opened.</Text>
        ) : !uri ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <Pdf
            source={{ uri, cache: true }}
            onLoadComplete={(n) => setPages(n)}
            onPageChanged={(p) => setPage(p)}
            onError={(e) => { console.warn('[pdf] render error', e); setFailed(true); }}
            style={styles.pdf}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.divider },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.display, fontSize: 17, color: c.text, letterSpacing: -0.2 },
  meta: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 1 },
  body: { flex: 1, backgroundColor: '#E6E1D7' },
  pdf: { flex: 1, width: '100%', height: '100%', backgroundColor: '#E6E1D7' },
  msg: { fontFamily: fontFamily.regular, fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 48 },
});
