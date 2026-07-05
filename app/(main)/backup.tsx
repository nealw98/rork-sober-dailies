// Backup & Restore (redesign 3.0). iCloud back up / restore (file-blob, whole
// snapshot incl. chat) — the clipboard copy/restore fallback was retired once
// iCloud sync was working. (Start Fresh — re-run onboarding / wipe data — lives
// in Settings › Developer.)
// Core: lib/userDataSync.ts + lib/icloudSync.ts.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { CloudUpload, CloudDownload } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { countStoredItems } from '@/lib/userDataSync';
import { iCloudSupported, iCloudAvailable, pushToICloud, pullFromICloud, isSyncPaused, setSyncPaused } from '@/lib/icloudSync';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';


const reloadApp = async () => {
  try { const U = await import('expo-updates'); await U.reloadAsync(); } catch { /* dev / no updates module */ }
};

export default function BackupScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const TEAL = colors.primaryDark;
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [icloud, setIcloud] = useState<boolean | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    countStoredItems().then(setCount).catch(() => {});
    isSyncPaused().then(setPaused).catch(() => {});
    if (iCloudSupported()) iCloudAvailable().then(setIcloud).catch(() => setIcloud(false));
  }, []);

  const backupICloud = async () => {
    setBusy(true);
    try {
      await setSyncPaused(false); setPaused(false); // an explicit backup resumes sync
      const ok = await pushToICloud();
      Alert.alert(ok ? 'Backed up to iCloud' : 'iCloud unavailable', ok
        ? 'Your data is in iCloud. It will restore automatically on a reinstall or another device signed into the same iCloud.'
        : 'Sign into iCloud in Settings, then try again.');
    } finally { setBusy(false); }
  };

  const restoreICloud = async () => {
    setBusy(true);
    try {
      const restored = await pullFromICloud(true); // force: ignore the newer-than gate + pause
      setPaused(false);
      if (restored) {
        Alert.alert('Restored from iCloud', 'The app will reload.', [
          { text: 'OK', onPress: reloadApp },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No iCloud backup was found for this app yet.');
      }
    } finally { setBusy(false); }
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
        {iCloudSupported() && (
          <>
            <Text style={styles.label}>iCLOUD{icloud === false ? ' · NOT SIGNED IN' : icloud ? ' · ON' : ''}{paused ? ' · PAUSED' : ''}</Text>
            {paused && (
              <Text style={styles.pausedNote}>
                Sync is paused after a reset, so your iCloud backup is protected. Restoring or backing up resumes it.
              </Text>
            )}
            <Row icon={<CloudUpload size={20} color={TEAL} strokeWidth={2} />} title="Back up to iCloud now"
              sub="Auto-restores on reinstall or another device on the same iCloud." onPress={backupICloud} disabled={busy} />
            <Row icon={<CloudDownload size={20} color={TEAL} strokeWidth={2} />} title="Restore from iCloud"
              sub="Pull the latest iCloud backup onto this device." onPress={restoreICloud} disabled={busy} />
          </>
        )}

        <Text style={styles.note}>
          Backups include your dailies, sober date, gratitude, spot checks, nightly reviews, journal, meetings, contacts, AI Sponsor chats, and reading progress. Device-only settings and caches aren't included.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, sub, onPress, disabled }: {
  icon: React.ReactNode; title: string; sub: string; onPress: () => void; disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const TEAL = colors.primaryDark;
  const TEAL_SOFT = colors.primarySoft;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.4, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textMuted, marginTop: 6 },
  scroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 },
  label: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginTop: 14, marginBottom: 8, paddingHorizontal: 4 },
  pausedNote: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, color: TEAL, paddingHorizontal: 4, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: TEAL_SOFT, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
  note: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, color: c.textMuted, paddingHorizontal: 4, marginTop: 16 },
  });
};
