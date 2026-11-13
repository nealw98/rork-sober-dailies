// The four tab destinations and Today's sunrise glyph, shared by the bottom
// tab bar, the navigation rail, and the paywall's feature list.
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { BookOpen, Library, PenLine } from 'lucide-react-native';

type GlyphProps = { size?: number; color?: string; strokeWidth?: number };

// Today's brand "sunrise" glyph — a custom sun-over-horizon with rays (no
// up-arrow). Lucide's Sunrise differs, so we draw the prototype's exact paths.
export function SunriseGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.6v2.5" />
      <Path d="M5.9 6 7.7 7.8" />
      <Path d="M18.1 6 16.3 7.8" />
      <Path d="M7.4 14.5a4.6 4.6 0 0 1 9.2 0" />
      <Path d="M3.5 19q8.5-2.9 17 0" />
    </Svg>
  );
}

// Tools takes the `Library` glyph so Literature can own the `BookOpen` book.
// Addressed by path: the bar and rail live outside the tab navigator.
export const TAB_ITEMS = [
  { path: '/', label: 'Today', Glyph: SunriseGlyph },
  { path: '/tools', label: 'Tools', Glyph: Library },
  { path: '/literature', label: 'Literature', Glyph: BookOpen },
  { path: '/journey', label: 'Journal', Glyph: PenLine },
] as const;
