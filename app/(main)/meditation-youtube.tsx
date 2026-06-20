import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import {
  redesignColors,
  redesignRadii,
} from '@/constants/redesignTokens';
import {
  DEFAULT_MEDITATION_SETTINGS,
  getMeditationSettings,
  MeditationSettings,
} from '@/hooks/use-meditation-settings';
import { useDailiesStore } from '@/hooks/use-dailies-store';

function Header({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ChevronLeft size={22} color={redesignColors.inkSecondary} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.headerIcon}>
        <PrototypeIcon name="lotus" size={30} color={redesignColors.white} stroke={1.8} />
      </View>
      <View style={styles.headerCopy}>
        <AppText typeRole="displayM" color={redesignColors.ink} style={styles.headerTitle}>
          Meditation
        </AppText>
        <AppText typeRole="sub" color={redesignColors.inkMuted}>
          {label || 'video'} · video
        </AppText>
      </View>
    </View>
  );
}

export default function MeditationYouTubeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const { items, setDoneForDate } = useDailiesStore();
  const [settings, setSettings] = useState<MeditationSettings>(DEFAULT_MEDITATION_SETTINGS);

  useEffect(() => {
    getMeditationSettings()
      .then(setSettings)
      .catch(error => {
        console.error('[Meditation] Failed to load YouTube settings', error);
      });
  }, []);

  const markDone = async () => {
    const targetId = dailyId || items.find(item => item.action === 'meditation')?.id;
    if (targetId) {
      await setDoneForDate(targetId, true);
    }
    router.back();
  };

  const label = settings.youtube.label || 'Meditation';
  const title = settings.youtube.title || label;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <Header label={label} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.playerCard}>
            <View style={styles.playCircle}>
              <PrototypeIcon name="play" size={32} color="#17152A" stroke={2} />
            </View>
            <View style={styles.progressRow}>
              <AppText typeRole="counter" color={redesignColors.white}>
                0:00
              </AppText>
              <View style={styles.track}>
                <View style={styles.trackPlayed} />
              </View>
              <AppText typeRole="counter" color={redesignColors.white}>
                5:32
              </AppText>
            </View>
          </View>

          <AppText typeRole="displayS" color={redesignColors.ink} style={styles.videoTitle}>
            {title}
          </AppText>
          <View style={styles.sourceRow}>
            <ExternalLink size={15} color={redesignColors.inkMuted} strokeWidth={2} />
            <AppText typeRole="sub" color={redesignColors.inkMuted}>
              Plays here in the app · from YouTube
            </AppText>
          </View>

          <View style={styles.descriptionCard}>
            <AppText typeRole="bodyL" color={redesignColors.inkSecondary} style={styles.descriptionText}>
              A short guided breathing meditation — settle in, follow the breath, and return to your day clear.
            </AppText>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 14, 26) }]}>
          <Pressable style={styles.doneButton} onPress={markDone}>
            <View style={styles.doneIcon}>
              <PrototypeIcon name="checkPlain" size={13} color={redesignColors.lavender} stroke={2.6} />
            </View>
            <AppText typeRole="ui" color={redesignColors.white}>
              Mark meditation done
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: redesignColors.warmWhite,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavender,
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    shadowColor: redesignColors.lavender,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    width: 42,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
    marginTop: 28,
  },
  scrollContent: {
    paddingBottom: 28,
    paddingHorizontal: 18,
  },
  playerCard: {
    aspectRatio: 1.78,
    backgroundColor: '#211936',
    borderRadius: 16,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 14,
  },
  playCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 33,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  progressRow: {
    alignItems: 'center',
    bottom: 14,
    flexDirection: 'row',
    gap: 10,
    left: 14,
    position: 'absolute',
    right: 14,
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  trackPlayed: {
    backgroundColor: '#FF5A64',
    borderRadius: 999,
    height: 4,
    width: 22,
  },
  videoTitle: {
    marginTop: 20,
  },
  sourceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  descriptionCard: {
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  descriptionText: {
    lineHeight: 24,
  },
  footer: {
    backgroundColor: redesignColors.surface,
    borderTopColor: redesignColors.border,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavender,
    borderRadius: redesignRadii.pill,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 54,
  },
  doneIcon: {
    alignItems: 'center',
    backgroundColor: redesignColors.white,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
});
