import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import { EqualizerOverlay } from './EqualizerOverlay';

interface SpeakerPlayerProps {
  youtubeId: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

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

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
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
    // react-native-youtube-iframe doesn't have a direct playbackRate prop
    // Use the initialPlayerParams or webViewProps to set speed
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
      {/* Thin YouTube player with equalizer overlay */}
      <View style={[styles.playerStrip, { backgroundColor: '#000' }]}>
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
            // Set playback speed via injected JS when speed changes
            injectedJavaScript: playbackSpeed !== 1
              ? `try { document.querySelector('video').playbackRate = ${playbackSpeed}; } catch(e) {} true;`
              : 'true;',
          }}
        />
        <EqualizerOverlay isPlaying={isPlaying} />
        {/* YouTube attribution */}
        <View style={styles.ytBadge}>
          <Text style={styles.ytBadgeText}>Playing via YouTube</Text>
        </View>
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
              { width: `${progress * 100}%`, backgroundColor: palette.tint },
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
            color={palette.tint}
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
                  playbackSpeed === speed ? palette.tint : palette.border,
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
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  playerStrip: {
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  ytBadge: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ytBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
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
    marginTop: 8,
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
