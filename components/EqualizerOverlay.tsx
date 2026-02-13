import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface EqualizerOverlayProps {
  isPlaying: boolean;
  barCount?: number;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;

// Each bar gets a unique duration and delay for organic feel
const BAR_CONFIGS = [
  { duration: 400, delay: 0 },
  { duration: 350, delay: 100 },
  { duration: 450, delay: 50 },
  { duration: 380, delay: 150 },
  { duration: 420, delay: 80 },
];

function Bar({ isPlaying, index }: { isPlaying: boolean; index: number }) {
  const height = useSharedValue(MIN_HEIGHT);
  const config = BAR_CONFIGS[index % BAR_CONFIGS.length];

  useEffect(() => {
    if (isPlaying) {
      height.value = withDelay(
        config.delay,
        withRepeat(
          withTiming(MAX_HEIGHT, {
            duration: config.duration,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(MIN_HEIGHT, { duration: 300 });
    }
  }, [isPlaying, height, config.delay, config.duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
      ]}
    />
  );
}

export function EqualizerOverlay({ isPlaying, barCount = 5 }: EqualizerOverlayProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.bars}>
        {Array.from({ length: barCount }).map((_, i) => (
          <Bar key={i} isPlaying={isPlaying} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
    height: MAX_HEIGHT,
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
});
