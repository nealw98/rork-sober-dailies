import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import { redesignColors, redesignRadii } from '@/constants/redesignTokens';
import { DEFAULT_MEDITATION_SETTINGS, getMeditationSettings, MeditationSettings } from '@/hooks/use-meditation-settings';
import { useDailiesStore } from '@/hooks/use-dailies-store';

const SOUND_LABEL: Record<string, string> = {
  silence: 'Silence',
  rain: 'Rainfall',
  ocean: 'Ocean',
  forest: 'Forest',
};

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function MeditationTimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const { items, setDoneForDate } = useDailiesStore();
  const [settings, setSettings] = useState<MeditationSettings>(DEFAULT_MEDITATION_SETTINGS);
  const [phase, setPhase] = useState<'ready' | 'running' | 'paused' | 'complete'>('ready');
  const [remaining, setRemaining] = useState(DEFAULT_MEDITATION_SETTINGS.timer.minutes * 60);

  useEffect(() => {
    getMeditationSettings()
      .then(nextSettings => {
        setSettings(nextSettings);
        setRemaining(nextSettings.timer.minutes * 60);
      })
      .catch(error => {
        console.error('[Meditation] Failed to load timer settings', error);
      });
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    if (remaining <= 0) {
      setPhase('complete');
      markDone();
      return;
    }
    const timeout = setTimeout(() => setRemaining(value => Math.max(value - 1, 0)), 1000);
    return () => clearTimeout(timeout);
  }, [phase, remaining]);

  const totalSeconds = settings.timer.minutes * 60;
  const progress = useMemo(() => {
    if (!totalSeconds) return 1;
    return 1 - remaining / totalSeconds;
  }, [remaining, totalSeconds]);

  const markDone = async () => {
    const targetId = dailyId || items.find(item => item.action === 'meditation')?.id;
    if (targetId) {
      await setDoneForDate(targetId, true);
    }
  };

  const completeNow = async () => {
    await markDone();
    setPhase('complete');
  };

  const done = async () => {
    await markDone();
    router.back();
  };

  const sitLonger = () => {
    setRemaining(5 * 60);
    setPhase('running');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: Math.max(insets.top + 10, 48), paddingBottom: Math.max(insets.bottom + 24, 34) }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <X size={20} color={redesignColors.white} strokeWidth={2.2} />
          </Pressable>
        </View>

        {phase === 'complete' ? (
          <View style={styles.center}>
            <View style={styles.completeMark}>
              <PrototypeIcon name="checkPlain" size={42} color={redesignColors.white} stroke={3.6} />
            </View>
            <AppText typeRole="displayM" color={redesignColors.white} style={styles.centerTitle}>
              Nicely done
            </AppText>
            <AppText typeRole="bodyL" color="rgba(255,255,255,0.72)" style={styles.centerSubtitle}>
              {settings.timer.minutes} minutes of stillness.{'\n'}Marked complete on Your Day.
            </AppText>
          </View>
        ) : (
          <View style={styles.center}>
            <AppText typeRole="eyebrow" color="rgba(255,255,255,0.62)" style={styles.breatheLabel}>
              {phase === 'ready' ? 'Built-in timer' : phase === 'paused' ? 'Paused' : 'Breathe'}
            </AppText>
            <View style={styles.timerRing}>
              <View style={[styles.progressFill, { opacity: phase === 'ready' ? 0 : Math.max(progress, 0.12) }]} />
              <AppText voice="display" weight="medium" size={46} color={redesignColors.white} style={styles.timerText}>
                {phase === 'ready' ? `${settings.timer.minutes}:00` : formatRemaining(remaining)}
              </AppText>
              <AppText typeRole="sub" color="rgba(255,255,255,0.58)">
                minutes
              </AppText>
            </View>
            {settings.timer.sound !== 'silence' ? (
              <View style={styles.soundPill}>
                <AppText typeRole="ui" color={redesignColors.white}>
                  {SOUND_LABEL[settings.timer.sound]}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        {phase === 'ready' ? (
          <Pressable style={styles.primaryButton} onPress={() => setPhase('running')}>
            <PrototypeIcon name="play" size={18} color="#2B2145" stroke={2} />
            <AppText typeRole="ui" color="#2B2145">
              Begin
            </AppText>
          </Pressable>
        ) : phase === 'complete' ? (
          <View style={styles.completeActions}>
            <Pressable style={styles.primaryButton} onPress={done}>
              <AppText typeRole="ui" color="#2B2145">
                Done
              </AppText>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={sitLonger}>
              <AppText typeRole="ui" color="rgba(255,255,255,0.76)">
                Sit a little longer
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.runActions}>
            <Pressable style={styles.stopButton} onPress={completeNow}>
              <View style={styles.stopSquare} />
            </Pressable>
            <Pressable
              style={styles.pauseButton}
              onPress={() => setPhase(current => current === 'paused' ? 'running' : 'paused')}
            >
              <AppText typeRole="ui" color="#2B2145">
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </AppText>
            </Pressable>
            <View style={styles.stopButtonGhost} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#201936',
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 22,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  breatheLabel: {
    marginBottom: 30,
  },
  timerRing: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 118,
    borderWidth: 2,
    height: 236,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 236,
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(163,134,213,0.28)',
  },
  timerText: {
    letterSpacing: -1.2,
  },
  soundPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: redesignRadii.pill,
    borderWidth: 1,
    marginTop: 34,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#EFEAF9',
    borderRadius: redesignRadii.pill,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
  },
  runActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  stopButtonGhost: {
    width: 60,
  },
  stopSquare: {
    backgroundColor: redesignColors.white,
    borderRadius: 3,
    height: 16,
    width: 16,
  },
  pauseButton: {
    alignItems: 'center',
    backgroundColor: '#EFEAF9',
    borderRadius: 43,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  completeMark: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavender,
    borderRadius: 46,
    height: 92,
    justifyContent: 'center',
    marginBottom: 26,
    width: 92,
  },
  centerTitle: {
    textAlign: 'center',
  },
  centerSubtitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  completeActions: {
    gap: 11,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: redesignRadii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
});
