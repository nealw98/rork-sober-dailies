import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Circle, Line, Path, Polygon, G } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COMPASS_SIZE = SCREEN_WIDTH * 0.9;

/**
 * Bold Compass Rose watermark — heavy geometric star design.
 * Thick strokes and solid fills so it reads clearly at low opacity.
 */
export default function CompassWatermark() {
  const cx = 200;
  const cy = 200;
  const S = "#FFFFFF";

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width={COMPASS_SIZE}
        height={COMPASS_SIZE}
        viewBox="0 0 400 400"
      >
        <G opacity={0.03}>
          {/* Outer thick ring */}
          <Circle cx={cx} cy={cy} r={190} stroke={S} strokeWidth={4} fill="none" />

          {/* Second ring */}
          <Circle cx={cx} cy={cy} r={178} stroke={S} strokeWidth={2} fill="none" />

          {/* Inner ring */}
          <Circle cx={cx} cy={cy} r={80} stroke={S} strokeWidth={2.5} fill="none" />

          {/* Center circle */}
          <Circle cx={cx} cy={cy} r={16} stroke={S} strokeWidth={3} fill="none" />
          <Circle cx={cx} cy={cy} r={5} fill={S} />

          {/* Main 8-point star — cardinal points (large) */}
          {/* North */}
          <Polygon points={`${cx},${cy - 170} ${cx - 18},${cy - 50} ${cx},${cy} ${cx + 18},${cy - 50}`} fill={S} />
          {/* South */}
          <Polygon points={`${cx},${cy + 170} ${cx - 18},${cy + 50} ${cx},${cy} ${cx + 18},${cy + 50}`} fill={S} />
          {/* East */}
          <Polygon points={`${cx + 170},${cy} ${cx + 50},${cy - 18} ${cx},${cy} ${cx + 50},${cy + 18}`} fill={S} />
          {/* West */}
          <Polygon points={`${cx - 170},${cy} ${cx - 50},${cy - 18} ${cx},${cy} ${cx - 50},${cy + 18}`} fill={S} />

          {/* Ordinal points (smaller, thinner) */}
          {/* NE */}
          <Polygon points={`${cx + 120},${cy - 120} ${cx + 25},${cy - 40} ${cx},${cy} ${cx + 40},${cy - 25}`} fill={S} opacity={0.6} />
          {/* SE */}
          <Polygon points={`${cx + 120},${cy + 120} ${cx + 25},${cy + 40} ${cx},${cy} ${cx + 40},${cy + 25}`} fill={S} opacity={0.6} />
          {/* SW */}
          <Polygon points={`${cx - 120},${cy + 120} ${cx - 25},${cy + 40} ${cx},${cy} ${cx - 40},${cy + 25}`} fill={S} opacity={0.6} />
          {/* NW */}
          <Polygon points={`${cx - 120},${cy - 120} ${cx - 25},${cy - 40} ${cx},${cy} ${cx - 40},${cy - 25}`} fill={S} opacity={0.6} />

          {/* Degree ticks around outer ring — every 10 degrees, thick */}
          {Array.from({ length: 36 }, (_, i) => {
            const deg = i * 10;
            const isCardinal = deg % 90 === 0;
            const isMajor = deg % 30 === 0;
            const rad = (deg * Math.PI) / 180;
            const rStart = isCardinal ? 155 : isMajor ? 163 : 168;
            const rEnd = 178;
            const sw = isCardinal ? 4 : isMajor ? 2.5 : 1.5;

            return (
              <Line
                key={`tick-${deg}`}
                x1={cx + rStart * Math.sin(rad)}
                y1={cy - rStart * Math.cos(rad)}
                x2={cx + rEnd * Math.sin(rad)}
                y2={cy - rEnd * Math.cos(rad)}
                stroke={S}
                strokeWidth={sw}
              />
            );
          })}

          {/* Cross-hair lines through center */}
          <Line x1={cx} y1={cy - 80} x2={cx} y2={cy - 16} stroke={S} strokeWidth={2} />
          <Line x1={cx} y1={cy + 16} x2={cx} y2={cy + 80} stroke={S} strokeWidth={2} />
          <Line x1={cx - 80} y1={cy} x2={cx - 16} y2={cy} stroke={S} strokeWidth={2} />
          <Line x1={cx + 16} y1={cy} x2={cx + 80} y2={cy} stroke={S} strokeWidth={2} />

          {/* Decorative diamond at center */}
          <Path
            d={`M${cx} ${cy - 40} L${cx + 40} ${cy} L${cx} ${cy + 40} L${cx - 40} ${cy} Z`}
            stroke={S}
            strokeWidth={2}
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 20,
    zIndex: 0,
  },
});
