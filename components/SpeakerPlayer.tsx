import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import { EqualizerOverlay } from './EqualizerOverlay';

interface SpeakerPlayerProps {
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

export function SpeakerPlayer({ youtubeId }: SpeakerPlayerProps) {
  const { palette } = useTheme();
  const playerRef = useRef<YoutubeIframeRef>(null);
  const progressBarRef = useRef<View>(null);
  const barWidthRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Derive accent and card background colors from theme
  const isDeepSea = (palette.heroTiles as any)?.speakers?.[0] === '#3E5C76';
  const isDark = palette.background !== '#fff';

  const accentColor = isDeepSea ? SPEAKER_ACCENT_DEEPSEA : (isDark ? SPEAKER_ACCENT_DARK : SPEAKER_ACCENT);
  const cardBg = isDeepSea ? CARD_BG_DEEPSEA : (isDark ? CARD_BG_DARK : CARD_BG_LIGHT);

  // Poll current time while playing
  useEffect(() => {
    if (!isPlaying || !isReady) return;

    const interval = setInterval(async () => {
      try {
        const time = await playerRef.current?.getCurrentTime();
        if (time !== undefined) setCurrentTime(time);
      } catch {
        // Player may not be ready
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isReady]);

  const onReady = useCallback(async () => {
    setIsReady(true);
    try {
      const dur = await playerRef.current?.getDuration();
      if (dur !== undefined) setDuration(dur);
    } catch {
      // ignore
    }
  }, []);

  const onStateChange = useCallback((state: string) => {
    if (state === 'playing') {
      setIsPlaying(true);
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false);
    }
  }, []);

  const hasPlayedRef = useRef(false);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const willPlay = !prev;
      // On first play, seek to 0 to ensure the WebView player is fully engaged
      if (willPlay && !hasPlayedRef.current) {
        hasPlayedRef.current = true;
        playerRef.current?.seekTo(0, true);
      }
      return willPlay;
    });
  }, []);

  const skipBack = useCallback(() => {
    const newTime = Math.max(0, currentTime - 15);
    playerRef.current?.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [currentTime]);

  const skipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 30);
    playerRef.current?.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleProgressBarPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (barWidthRef.current > 0 && duration > 0) {
        const proportion = event.nativeEvent.locationX / barWidthRef.current;
        const seekTime = proportion * duration;
        playerRef.current?.seekTo(seekTime, true);
        setCurrentTime(seekTime);
      }
    },
    [duration]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      {/* Hidden YouTube player — invisible, audio only */}
      <View style={styles.hiddenPlayer}>
        <YoutubePlayer
          ref={playerRef}
          height={1}
          width={1}
          videoId={youtubeId}
          play={isPlaying}
          onReady={onReady}
          onChangeState={onStateChange}
          initialPlayerParams={{
            controls: false,
            modestbranding: true,
            rel: false,
          }}
          webViewProps={{
            injectedJavaScript: playbackSpeed !== 1
              ? `try { document.querySelector('video').playbackRate = ${playbackSpeed}; } catch(e) {} true;`
              : 'true;',
          }}
        />
      </View>

      {/* Player Card */}
      <View style={[styles.playerCard, { backgroundColor: cardBg }]}>
        {/* Now Playing header row */}
        <View style={styles.nowPlayingRow}>
          <View style={styles.nowPlayingLeft}>
            <View style={styles.equalizerInline}>
              <EqualizerOverlay isPlaying={isPlaying} barCount={4} barColor={accentColor} />
            </View>
            <Text style={[styles.nowPlayingLabel, { color: accentColor }]}>
              Now Playing
            </Text>
          </View>
          <Text style={[styles.ytAttribution, { color: palette.muted }]}>
            Playing via YouTube
          </Text>
        </View>

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
  hiddenPlayer: {
    height: 1,
    width: 1,
    overflow: 'hidden',
    position: 'absolute',
    top: -1,
    left: -1,
    zIndex: -1,
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
  ytAttribution: {
    fontSize: 11,
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
