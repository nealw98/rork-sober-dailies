// Full Meeting Readings list (redesign 3.0) — reached from the Literature home
// "See all" link and from the Meetings screen. Each card opens a single reading.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';
import { MeetingReadingCard } from '@/components/literature/literature-ui';
import { MEETING_READINGS } from '@/constants/meeting-readings';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');

export default function MeetingReadingsScreen() {
  useScreenTimeTracking('Meeting Readings');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Meeting Readings</Text>
        <Text style={styles.sub}>Read aloud at most meetings.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {MEETING_READINGS.map((r) => (
          <MeetingReadingCard key={r.id} reading={r} onPress={() => router.push(`/(main)/meeting-reading?id=${r.id}`)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 28, letterSpacing: -0.5, color: c.text },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 8 },
});
