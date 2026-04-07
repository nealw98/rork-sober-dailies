import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EqualizerOverlay } from './EqualizerOverlay';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize as fontSizeTokens,
  shadows,
} from '@/constants/designTokens';

const sem = semanticColors.light;

const SUPABASE_AUDIO_BASE = 'https://uzfqabcjxjqufpipdcla.supabase.co/storage/v1/object/public/speaker-audio';

interface SpeakerPlayerProps {
  speakerId: string;
  audioUrl?: string | null;
  youtubeId: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

const ACCENT_COLOR = colors.tertiaryExtraDark;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SpeakerPlayer({ speakerId, audioUrl, youtubeId }: SpeakerPlayerProps) {
  const player = useGlobalAudioPlayer();
  const barWidthRef = useRef(0);

  // Resolve the audio URI
  const resolvedUri = audioUrl || `${SUPABASE_AUDIO_BASE}/${youtubeId}.m4a`;

  // Is this player's speaker the currently loaded one?
  const isThisSpeaker = player.currentSpeakerId === speakerId;
  const isPlaying = isThisSpeaker && player.isPlaying;
  const isBuffering = isThisSpeaker && player.isBuffering;
  const isLoaded = isThisSpeaker && player.isLoaded;
  const currentTime = isThisSpeaker ? player.positionMs / 1000 : 0;
  const duration = isThisSpeaker ? player.durationMs / 1000 : 0;
  const loadError = isThisSpeaker ? player.loadError : null;

  // Load audio on mount if not already loaded for this speaker
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!isThisSpeaker && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      player.load(speakerId, resolvedUri);
    }
  }, [speakerId, resolvedUri]);

  // Keep screen awake while playing
  useEffect(() => {
    if (isPlaying) {
      activateKeepAwakeAsync('speaker-player');
    } else {
      deactivateKeepAwake('speaker-player');
    }
    return () => {
      deactivateKeepAwake('speaker-player');
    };
  }, [isPlaying]);

  const handleTogglePlay = useCallback(async () => {
    if (!isLoaded) {
      await player.load(speakerId, resolvedUri, true);
      return;
    }
    if (isPlaying) {
      await player.pause();
    } else {
      await player.play();
    }
  }, [isLoaded, isPlaying, speakerId, resolvedUri]);

  const handleStop = useCallback(async () => {
    await player.stop();
  }, []);

  const handleSkipBack = useCallback(async () => {
    await player.seekBy(-15);
  }, []);

  const handleSkipForward = useCallback(async () => {
    await player.seekBy(30);
  }, []);

  const handleSpeedChange = useCallback(async (speed: number) => {
    await player.setRate(speed);
  }, []);

  const handleProgressBarPress = useCallback(
    async (event: { nativeEvent: { locationX: number } }) => {
      if (barWidthRef.current > 0 && duration > 0 && isLoaded) {
        const proportion = event.nativeEvent.locationX / barWidthRef.current;
        const seekTimeMs = proportion * duration * 1000;
        await player.seekTo(seekTimeMs);
      }
    },
    [duration, isLoaded]
  );

  const handleRetry = useCallback(async () => {
    await player.load(speakerId, resolvedUri);
  }, [speakerId, resolvedUri]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.playerCard}>
        {/* Now Playing header row */}
        <View style={styles.nowPlayingRow}>
          <View style={styles.nowPlayingLeft}>
            <View style={styles.equalizerInline}>
              <EqualizerOverlay isPlaying={isPlaying} barCount={4} barColor={ACCENT_COLOR} />
            </View>
            <Text style={[styles.nowPlayingLabel, { color: ACCENT_COLOR }]}>
              {isBuffering ? 'Loading…' : isPlaying ? 'Now Playing' : isLoaded ? 'Paused' : 'Ready'}
            </Text>
          </View>
        </View>

        {/* Error state */}
        {!!loadError && (
          <TouchableOpacity onPress={handleRetry} style={styles.errorRow}>
            <Text style={styles.errorText}>
              {loadError} — Tap to retry
            </Text>
          </TouchableOpacity>
        )}

        {/* Progress bar */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleProgressBarPress}
          style={styles.progressContainer}
        >
          <View
            style={styles.progressTrack}
            onLayout={(e) => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: ACCENT_COLOR },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </TouchableOpacity>

        {/* Playback controls — stop, skip back, play/pause, skip forward */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleStop} style={styles.controlButton}>
            <Ionicons name="stop-circle-outline" size={28} color={sem.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkipBack} style={styles.controlButton}>
            <Ionicons name="play-back" size={24} color={sem.text} />
            <Text style={styles.skipLabel}>15s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTogglePlay} style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={56}
              color={ACCENT_COLOR}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkipForward} style={styles.controlButton}>
            <Ionicons name="play-forward" size={24} color={sem.text} />
            <Text style={styles.skipLabel}>30s</Text>
          </TouchableOpacity>

          {/* Spacer to balance the stop button */}
          <View style={styles.controlButton}>
            <View style={{ width: 28, height: 28 }} />
          </View>
        </View>

        {/* Speed selector */}
        <View style={styles.speedRow}>
          {SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              onPress={() => handleSpeedChange(speed)}
              style={[
                styles.speedButton,
                {
                  backgroundColor: player.rate === speed ? ACCENT_COLOR : sem.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.speedText,
                  {
                    color: player.rate === speed ? colors.white : sem.textMuted,
                  },
                ]}
              >
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  playerCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  nowPlayingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  equalizerInline: {
    width: 22,
    height: 24,
    position: 'relative',
  },
  nowPlayingLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSizeTokens.base,
  },
  errorRow: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizeTokens.sm,
    color: sem.textMuted,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: sem.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizeTokens.sm,
    color: sem.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    gap: spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  skipLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: sem.textMuted,
    marginTop: 2,
  },
  playButton: {
    padding: spacing.xs,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  speedButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  speedText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSizeTokens.sm,
  },
});
