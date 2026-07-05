// Online meetings — in-app browser for aa-intergroup.org (redesign 3.0).
// Browse-only: the user never leaves Sober Dailies and nothing auto-adds to
// My meetings. Per the Meetings handoff.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import BackButton from '@/components/BackButton';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const ONLINE_AA_URL = 'https://aa-intergroup.org/meetings/';

export default function OnlineMeetingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.flex}>
          <Text style={styles.title}>Online meetings</Text>
          <Text style={styles.sub}>aa-intergroup.org</Text>
        </View>
      </View>
      <View style={styles.flex}>
        <WebView source={{ uri: ONLINE_AA_URL }} onLoadEnd={() => setLoading(false)} startInLoadingState />
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  sub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  });
};
