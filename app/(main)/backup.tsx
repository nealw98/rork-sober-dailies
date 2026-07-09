// Backup & Restore (redesign 3.0). Cloud back up / restore (file-blob, whole
// snapshot incl. chat): iCloud on iOS (no sign-in), Google Drive on Android
// (connect a Google account once; auto sync runs silently after). The
// clipboard copy/restore fallback was retired once iCloud sync was working.
// (Start Fresh — re-run onboarding / wipe data — lives in Settings › Developer.)
// Core: lib/userDataSync.ts + lib/cloudSync.ts (+ lib/googleDriveAuth.ts).
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { CloudUpload, CloudDownload, LogIn } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { countStoredItems } from '@/lib/userDataSync';
import { cloudBackupSupported, cloudAvailable, pushToCloud, pullFromCloud, isSyncPaused, setSyncPaused, CLOUD_NAME } from '@/lib/cloudSync';
import { isDriveSignedIn, getDriveAccountEmail, getDriveAccessToken, signOutDrive } from '@/lib/googleDriveAuth';
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
  const isAndroid = Platform.OS === 'android';
  const supported = cloudBackupSupported();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null); // iOS: iCloud signed in
  const [connected, setConnected] = useState<boolean | null>(null); // Android: Google account
  const [email, setEmail] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    countStoredItems().then(setCount).catch(() => {});
    isSyncPaused().then(setPaused).catch(() => {});
    if (!supported) return;
    if (isAndroid) {
      isDriveSignedIn().then((s) => {
        setConnected(s);
        if (s) getDriveAccountEmail().then(setEmail).catch(() => {});
      }).catch(() => setConnected(false));
    } else {
      cloudAvailable().then(setAvailable).catch(() => setAvailable(false));
    }
  }, [supported, isAndroid]);

  const backupNow = async () => {
    setBusy(true);
    try {
      await setSyncPaused(false); setPaused(false); // an explicit backup resumes sync
      const ok = await pushToCloud(true);
      Alert.alert(ok ? `Backed up to ${CLOUD_NAME}` : `${CLOUD_NAME} unavailable`, ok
        ? `Your data is in ${CLOUD_NAME}. It will restore automatically on a reinstall or another device signed into the same account.`
        : isAndroid ? 'Connect your Google account, then try again.' : 'Sign into iCloud in Settings, then try again.');
    } finally { setBusy(false); }
  };

  const restoreNow = async () => {
    setBusy(true);
    try {
      const restored = await pullFromCloud(true); // force: ignore the newer-than gate + pause
      setPaused(false);
      if (restored) {
        Alert.alert(`Restored from ${CLOUD_NAME}`, 'The app will reload.', [
          { text: 'OK', onPress: reloadApp },
        ]);
      } else {
        Alert.alert('Nothing to restore', `No ${CLOUD_NAME} backup was found for this app yet.`);
      }
    } finally { setBusy(false); }
  };

  // Android: connect a Google account, then immediately do the right thing —
  // restore if this account already holds a backup this device hasn't synced
  // (the reinstall / new-phone case), otherwise start the backup. Auto sync
  // (push on background, pull on launch) takes over from here.
  const connectDrive = async () => {
    setBusy(true);
    try {
      const token = await getDriveAccessToken(true);
      if (!token) {
        Alert.alert("Couldn't connect", 'Google sign-in did not complete. Please try again.');
        return;
      }
      setConnected(true);
      getDriveAccountEmail().then(setEmail).catch(() => {});
      const restored = await pullFromCloud();
      if (restored) {
        Alert.alert('Backup found', 'Your data was restored from Google Drive. The app will reload.', [
          { text: 'OK', onPress: reloadApp },
        ]);
      } else {
        await setSyncPaused(false); setPaused(false);
        const ok = await pushToCloud(true);
        if (ok) Alert.alert('Google Drive connected', 'Your data is backed up and will now stay backed up automatically.');
      }
    } finally { setBusy(false); }
  };

  const disconnectDrive = async () => {
    await signOutDrive();
    setConnected(false); setEmail(null);
  };

  const statusTag = isAndroid
    ? (connected === false ? ' · NOT CONNECTED' : connected ? ' · ON' : '')
    : (available === false ? ' · NOT SIGNED IN' : available ? ' · ON' : '');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Backup & Restore</Text>
        <Text style={styles.sub}>
          {supported ? 'Save a copy of your data and bring it back after reinstalling or on another device.' : 'Your data is saved on this device.'}{count != null ? ` Currently storing ${count} item${count === 1 ? '' : 's'}.` : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {supported && (
          <>
            <Text style={styles.label}>{CLOUD_NAME.toUpperCase()}{statusTag}{paused ? ' · PAUSED' : ''}</Text>
            {paused && (
              <Text style={styles.pausedNote}>
                Sync is paused after a reset, so your {CLOUD_NAME} backup is protected. Restoring or backing up resumes it.
              </Text>
            )}
            {isAndroid && !connected ? (
              <Row icon={<LogIn size={20} color={TEAL} strokeWidth={2} />} title="Connect Google Drive"
                sub="Sign in with Google once. Your data then backs up automatically and follows you to a new phone." onPress={connectDrive} disabled={busy} />
            ) : (
              <>
                <Row icon={<CloudUpload size={20} color={TEAL} strokeWidth={2} />} title={`Back up to ${CLOUD_NAME} now`}
                  sub="Auto-restores on reinstall or another device on the same account." onPress={backupNow} disabled={busy} />
                <Row icon={<CloudDownload size={20} color={TEAL} strokeWidth={2} />} title={`Restore from ${CLOUD_NAME}`}
                  sub={`Pull the latest ${CLOUD_NAME} backup onto this device.`} onPress={restoreNow} disabled={busy} />
                {isAndroid && (
                  <Pressable onPress={disconnectDrive} disabled={busy} accessibilityRole="button">
                    <Text style={styles.disconnect}>Disconnect{email ? ` ${email}` : ' Google Drive'}</Text>
                  </Pressable>
                )}
              </>
            )}
          </>
        )}

        {/* A binary without the cloud modules (e.g. an OTA onto an older build):
            say so plainly instead of rendering an empty screen. The Settings
            entry row is also hidden then; this covers deep links. */}
        {!supported && (
          <View style={styles.emptyCard}>
            <View style={styles.rowIcon}><CloudUpload size={20} color={TEAL} strokeWidth={2} /></View>
            <Text style={styles.emptyTitle}>Cloud backup needs an app update</Text>
            <Text style={styles.emptyBody}>
              Your data is stored safely on this device. Update the app from the store to turn on cloud backup.
            </Text>
          </View>
        )}

        {supported && (
          <Text style={styles.note}>
            Backups include your dailies, sober date, gratitude, spot checks, nightly reviews, journal, meetings, contacts, AI Sponsor chats, and reading progress. Device-only settings and caches aren't included.
            {isAndroid ? ' Backups live in a private app folder in your Google Drive that only this app can see.' : ''}
          </Text>
        )}
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
  disconnect: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.textMuted, textAlign: 'center', paddingVertical: 10 },
  note: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18, color: c.textMuted, paddingHorizontal: 4, marginTop: 16 },
  emptyCard: { alignItems: 'flex-start', gap: 10, padding: 18, marginTop: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: c.textMuted },
  });
};
