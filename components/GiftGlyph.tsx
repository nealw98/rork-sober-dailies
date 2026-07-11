// Pass It On gift glyph — the exact 24-viewBox line icon from the handoff
// (box + body + center ribbon + double-loop bow). Matches the GlyphComponent
// shape the Tools grid uses ({ size, color }) so it can sit in a coin.
import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

export default function GiftGlyph({ size = 22, color = '#B55A68', strokeWidth = 1.8 }: {
  size?: number; color?: string; strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={8} width={18} height={4} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8v13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8c-1.5 0-4.5-.5-4.5-3A2.2 2.2 0 0 1 12 4.6 2.2 2.2 0 0 1 16.5 5c0 2.5-3 3-4.5 3z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
