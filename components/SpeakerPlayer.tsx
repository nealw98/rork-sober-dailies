import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import { EqualizerOverlay } from './EqualizerOverlay';

const SUPABASE_AUDIO_BASE = 'https://uzfqabcjxjqufpipdcla.supabase.co/storage/v1/object/public/speaker-audio';

interface SpeakerPlayerProps {
  /** Full audio URL from the audio_url column, or null to construct from youtubeId */
  audioUrl?: string | null;
  /** YouTube ID — used as fallback to construct the audio URL */
  youtubeId: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

// Speaker accent colors per theme
const SPEAKER_ACCENT = '#8B6AC0';
const SPEAKER_ACCENT_DARK = '#7A5AAA';
const SPEAKER_ACCENT_DEEPSEA = '#3E5C76';

const CARD_BG_LIGHT = 'rgba(139, 106, 192, 0.08)';
const CARD_BG_DARK = 'rgba(122, 90, 170, 0.12)';
const CARD_BG_DEEPSEA = 'rgba(62, 92, 118, 0.15)';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Configure audio mode for background playback
async function configureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn('[SpeakerPlayer] Failed to configure audio mode:', e);
  }
}

export function SpeakerPlayer({ audioUrl, youtubeId }: SpeakerPlayerProps) {
  const { palette } = useTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressBarRef = useRef<View>(null);
  const barWidthRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive accent and card background colors from theme
  const isDeepSea = (palette.heroTiles as any)?.speakers?.[0] === '#3E5C76';
  const isDark = palette.background !== '#fff';

  const accentColor = isDeepSea ? SPEAKER_ACCENT_DEEPSEA : (isDark ? SPEAKER_ACCENT_DARK : SPEAKER_ACCENT);
  const cardBg = isDeepSea ? CARD_BG_DEEPSEA : (isDark ? CARD_BG_DARK : CARD_BG_LIGHT);

  // Resolve the audio URI
  const resolvedUri = audioUrl || `${SUPABASE_AUDIO_BASE}/${youtubeId}.m4a`;

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

  // Playback status callback
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('[SpeakerPlayer] Playback error:', status.error);
        setError('Failed to load audio');
      }
      return;
    }

    setCurrentTime(status.positionMillis / 1000);
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  // Load the audio
  const loadAudio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await configureAudioMode();

      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: resolvedUri },
        { shouldPlay: false, rate: playbackSpeed, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoaded(true);
    } catch (e) {
      console.error('[SpeakerPlayer] Error loading audio:', e);
      setError('Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedUri, onPlaybackStatusUpdate]);

  // Load audio on mount
  useEffect(() => {
    loadAudio();

    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [resolvedUri]);

  // Update playback speed when changed
  useEffect(() => {
    if (soundRef.current && isLoaded) {
      soundRef.current.setRateAsync(playbackSpeed, true).catch(() => {});
    }
  }, [playbackSpeed, isLoaded]);

  const togglePlay = useCallback(async () => {
    if (!soundRef.current || !isLoaded) {
      // Try loading if not loaded yet
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (e) {
      console.error('[SpeakerPlayer] Toggle play error:', e);
    }
  }, [isPlaying, isLoaded, loadAudio]);

  const skipBack = useCallback(async () => {
    if (!soundRef.current || !isLoaded) return;
    try {
      const newTime = Math.max(0, currentTime - 15);
      await soundRef.current.setPositionAsync(newTime * 1000);
      setCurrentTime(newTime);
    } catch (e) {
      console.error('[SpeakerPlayer] Skip back error:', e);
    }
  }, [currentTime, isLoaded]);

  const skipForward = useCallback(async () => {
    if (!soundRef.current || !isLoaded) return;
    try {
      const newTime = Math.min(duration, currentTime + 30);
      await soundRef.current.setPositionAsync(newTime * 1000);
      setCurrentTime(newTime);
    } catch (e) {
      console.error('[SpeakerPlayer] Skip forward error:', e);
    }
  }, [currentTime, duration, isLoaded]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleProgressBarPress = useCallback(
    async (event: { nativeEvent: { locationX: number } }) => {
      if (barWidthRef.current > 0 && duration > 0 && soundRef.current && isLoaded) {
        const proportion = event.nativeEvent.locationX / barWidthRef.current;
        const seekTime = proportion * duration;
        try {
          await soundRef.current.setPositionAsync(seekTime * 1000);
          setCurrentTime(seekTime);
        } catch (e) {
          console.error('[SpeakerPlayer] Seek error:', e);
        }
      }
    },
    [duration, isLoaded]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      {/* Player Card */}
      <View style={[styles.playerCard, { backgroundColor: cardBg }]}>
        {/* Now Playing header row */}
        <View style={styles.nowPlayingRow}>
          <View style={styles.nowPlayingLeft}>
            <View style={styles.equalizerInline}>
              <EqualizerOverlay isPlaying={isPlaying} barCount={4} barColor={accentColor} />
            </View>
            <Text style={[styles.nowPlayingLabel, { color: accentColor }]}>
              {isLoading ? 'Loading…' : 'Now Playing'}
            </Text>
          </View>
        </View>

        {/* Error state */}
        {!!error && (
          <TouchableOpacity onPress={loadAudio} style={styles.errorRow}>
            <Text style={[styles.errorText, { color: palette.muted }]}>
              {error} — Tap to retry
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
            ref={progressBarRef}
            style={[styles.progressTrack, { backgroundColor: palette.border }]}
            onLayout={(e) => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: palette.muted }]}>
              {formatTime(currentTime)}
            </Text>
            <Text style={[styles.timeText, { color: palette.muted }]}>
              {formatTime(duration)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Playback controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={skipBack} style={styles.controlButton}>
            <Ionicons name="play-back" size={24} color={palette.text} />
            <Text style={[styles.skipLabel, { color: palette.muted }]}>15s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={56}
              color={accentColor}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={skipForward} style={styles.controlButton}>
            <Ionicons name="play-forward" size={24} color={palette.text} />
            <Text style={[styles.skipLabel, { color: palette.muted }]}>30s</Text>
          </TouchableOpacity>
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
                  backgroundColor:
                    playbackSpeed === speed ? accentColor : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.speedText,
                  {
                    color: playbackSpeed === speed ? '#fff' : palette.muted,
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
    marginTop: 16,
  },
  playerCard: {
    borderRadius: 16,
    padding: 16,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nowPlayingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equalizerInline: {
    width: 22,
    height: 24,
    position: 'relative',
  },
  nowPlayingLabel: {
    fontSize: 15,
    fontWeight: adjustFontWeight('600'),
  },
  errorRow: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 24,
  },
  controlButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  playButton: {
    padding: 4,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  speedText: {
    fontSize: 13,
    fontWeight: adjustFontWeight('600'),
  },
});
