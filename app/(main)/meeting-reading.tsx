// Single Meeting Reading (redesign 3.0), per hifi-literature.jsx
// ScreenMeetingReading: a distraction-free Lora reader for the public-domain
// passages. The reading body itself lives in MeetingReadingContent (shared
// with the Literature tab's wide-layout detail pane); this screen owns the
// pushed-reader chrome: back button, "aA" size control, scroll container.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import BackButton from '@/components/BackButton';
import { getMeetingReading } from '@/constants/meeting-readings';
import MeetingReadingContent from '@/components/literature/MeetingReadingContent';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { useThemedStyles } from '@/hooks/useTokens';

export default function MeetingReadingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reading = id ? getMeetingReading(id) : undefined;
  useScreenTimeTracking('Meeting Reading');

  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);

  if (!reading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}><BackButton onPress={() => router.back()} /></View>
        <Text style={styles.missing}>That reading couldn’t be found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <BackButton onPress={() => router.back()} />
        <Pressable onPress={() => setSizeSheetOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Text size" style={styles.aaBtn}>
          <Text style={styles.aaLabel}>aA</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <MeetingReadingContent reading={reading} />
      </ScrollView>

      <ReadingSizeSheet visible={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    headerBar: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aaBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
    aaLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },
    scroll: { paddingHorizontal: 26, paddingBottom: 56 },
    missing: { fontFamily: fontFamily.regular, fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 40 },
  });
};
