import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const PATTERN_HEIGHT = 320;

/**
 * A single tile of topographical contour lines.
 * Stroke: 0.75pt, Deep Charcoal #2C2C2C at 2.5% opacity.
 */
const TopoTile = () => (
  <Svg width="100%" height={PATTERN_HEIGHT} viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice">
    {/* Contour lines — organic, flowing curves */}
    <Path
      d="M0 40 Q50 20 100 45 T200 35 T300 50 T400 30"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.025}
    />
    <Path
      d="M0 70 Q80 55 140 75 T240 60 T340 80 T400 65"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.025}
    />
    <Path
      d="M0 100 Q60 110 120 95 T220 105 T320 90 T400 100"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.03}
    />
    <Path
      d="M0 130 Q90 120 150 140 T260 125 T360 145 T400 130"
      stroke="#2C2C2C"
      strokeWidth={0.5}
      fill="none"
      opacity={0.02}
    />
    <Path
      d="M0 165 Q70 175 130 160 T230 170 T330 155 T400 168"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.025}
    />
    <Path
      d="M0 195 Q100 185 160 200 T270 190 T370 205 T400 195"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.03}
    />
    <Path
      d="M0 225 Q55 235 115 220 T215 230 T315 215 T400 228"
      stroke="#2C2C2C"
      strokeWidth={0.5}
      fill="none"
      opacity={0.02}
    />
    <Path
      d="M0 258 Q85 248 145 262 T250 250 T350 265 T400 255"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.025}
    />
    <Path
      d="M0 290 Q65 300 125 285 T225 295 T325 280 T400 292"
      stroke="#2C2C2C"
      strokeWidth={0.75}
      fill="none"
      opacity={0.02}
    />
  </Svg>
);

interface TopoWatermarkProps {
  repeatCount?: number;
}

/**
 * Full-height topographical watermark overlay.
 * Repeats the tile pattern vertically to fill the scrollable content.
 */
export default function TopoWatermark({ repeatCount = 12 }: TopoWatermarkProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: repeatCount }, (_, i) => (
        <TopoTile key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
