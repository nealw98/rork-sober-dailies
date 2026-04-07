import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Download, Check, X } from 'lucide-react-native';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';
import { useSpeakerDownload, resolveAudioUri } from '@/hooks/useSpeakerDownload';
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
  const remoteUri = audioUrl || `${SUPABASE_AUDIO_BASE}/${youtubeId}.m4a`;

  // Download management
  const download = useSpeakerDownload(speakerId, remoteUri);

  // Is this player's speaker the currently loaded one?
  const isThisSpeaker = player.currentSpeakerId === speakerId;
  const isPlaying = isThisSpeaker && player.isPlaying;
  const isBuffering = isThisSpeaker && player.isBuffering;
  const isLoaded = isThisSpeaker && player.isLoaded;
  const currentTime = isThisSpeaker ? player.positionMs / 1000 : 0;
  const duration = isThisSpeaker ? player.durationMs / 1000 : 0;
  const loadError = isThisSpeaker ? player.loadError : null;

  // Don't auto-load on mount — only load when user presses play.
  // This prevents interrupting a currently playing speaker when
  // opening another speaker's detail page.

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
      const uri = await resolveAudioUri(speakerId, remoteUri);
      await player.load(speakerId, uri, true);
      return;
    }
    if (isPlaying) {
      await player.pause();
    } else {
      await player.play();
    }
  }, [isLoaded, isPlaying, speakerId, remoteUri]);

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
    const uri = await resolveAudioUri(speakerId, remoteUri);
    await player.load(speakerId, uri);
  }, [speakerId, remoteUri]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.playerCard}>

        {/* Download pill */}
        <View style={styles.downloadRow}>
          {download.downloadStatus === 'not_downloaded' && (
            <TouchableOpacity onPress={download.startDownload} style={styles.downloadPill}>
              <Download size={14} color={colors.tertiaryDark} />
              <Text style={styles.downloadPillText}>Download</Text>
            </TouchableOpacity>
          )}
          {download.downloadStatus === 'downloading' && (
            <View style={styles.downloadPill}>
              <ActivityIndicator size="small" color={colors.tertiaryDark} />
              <Text style={styles.downloadPillText}>{download.downloadProgress}%</Text>
              <TouchableOpacity onPress={download.cancelDownload} hitSlop={8}>
                <X size={14} color={sem.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          {download.downloadStatus === 'downloaded' && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Remove Download',
                  'Delete the downloaded audio file?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: download.deleteDownload },
                  ]
                );
              }}
              style={styles.downloadedPill}
            >
              <Check size={14} color={colors.tertiaryDark} />
              <Text style={styles.downloadPillText}>Downloaded</Text>
            </TouchableOpacity>
          )}
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

        {/* Playback controls — back, stop, play/pause, forward */}
        <View style={styles.controls}>
          <Text style={[styles.skipLabel, { marginRight: -spacing.md }]}>15s</Text>

          <TouchableOpacity onPress={handleSkipBack} style={styles.controlButton}>
            <Ionicons name="play-back" size={28} color={sem.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleStop} style={styles.controlButton}>
            <Ionicons name="stop" size={28} color={sem.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTogglePlay} style={styles.playButton}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkipForward} style={styles.controlButton}>
            <Ionicons name="play-forward" size={28} color={sem.text} />
          </TouchableOpacity>

          <Text style={[styles.skipLabel, { marginLeft: -spacing.md }]}>30s</Text>
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
  downloadRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.tertiaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  downloadedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.tertiaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  downloadPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSizeTokens.sm,
    color: colors.tertiaryDark,
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
    gap: spacing.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tertiaryExtraDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: sem.textMuted,
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
