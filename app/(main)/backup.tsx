// Backup & Restore (redesign 3.0) — Phase 0 of iCloud sync. Manual, OTA-safe:
// copy a JSON backup of all user data to the clipboard and restore it after a
// reinstall / on another device. Core: lib/userDataSync.ts. iCloud auto-sync
// reuses the same serialize/restore later.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, ClipboardPaste } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { serializeUserData, restoreUserData, countStoredItems } from '@/lib/userDataSync';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const TEAL = colors.primaryDark ?? '#2E6F6F';
const TEAL_SOFT = colors.primarySoft ?? '#D8E8E8';

export default function BackupScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => { countStoredItems().then(setCount).catch(() => {}); }, []);

  const copyBackup = async () => {
    setBusy(true);
    try {
      const json = await serializeUserData();
      await Clipboard.setStringAsync(json);
      Alert.alert('Backup copied', 'Your data is on the clipboard. Paste it somewhere safe — then use “Restore from clipboard” after reinstalling or on another device.');
    } catch (e: any) {
      Alert.alert('Couldn’t back up', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    const json = await Clipboard.getStringAsync();
    if (!json) {
      Alert.alert('Clipboard is empty', 'Copy a backup first, then try again.');
      return;
    }
    Alert.alert('Restore backup?', 'This replaces your current data on this device with the backup on the clipboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const n = await restoreUserData(json);
            Alert.alert('Restored', `${n} items restored. The app will reload to load your data.`, [
              { text: 'OK', onPress: async () => { try { const U = await import('expo-updates'); await U.reloadAsync(); } catch { /* ignore */ } } },
            ]);
          } catch (e: any) {
            Alert.alert('Couldn’t restore', e?.message ?? 'Unknown error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Backup & Restore</Text>
        <Text style={styles.sub}>
          Save a copy of your data and bring it back after reinstalling or on another device.{count != null ? ` Currently storing ${count} item${count === 1 ? '' : 's'}.` : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>BACK UP</Text>
        <Row icon={<Copy size={20} color={TEAL} strokeWidth={2} />} title="Copy backup to clipboard"
          sub="A snapshot of all your data. Paste it somewhere safe." onPress={copyBackup} disabled={busy} />

        <Text style={styles.label}>RESTORE</Text>
        <Row icon={<ClipboardPaste size={20} color={TEAL} strokeWidth={2} />} title="Restore from clipboard"
          sub="Replaces this device's data with a copied backup." onPress={restore} disabled={busy} />

        <Text style={styles.note}>
          Includes your dailies, sober date, gratitude, spot checks, nightly reviews, journal, meetings, contacts, AI Sponsor chats, and reading progress. Device-only settings and caches aren't included.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, sub, onPress, disabled }: {
  icon: React.ReactNode; title: string; sub: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.row, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled} accessibilityRole="button">
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.4, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textMuted, marginTop: 6 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  label: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginTop: 14, marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: TEAL_SOFT, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
  note: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, color: c.textMuted, paddingHorizontal: 4, marginTop: 16 },
});
