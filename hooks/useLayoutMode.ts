// Layout modes for the 3.5 wide-layout system (docs/3.5-wide-layouts-handoff.md).
// One source of truth: semantic width classes derived from the LIVE window
// width — never device names, Platform.isPad, or orientation (plan §3).
//
// Measured canvases (pt), for choosing thresholds:
//   iPhone 17 402 · Duo cover 466 · Duo inner portrait 669 ·
//   iPad 11" portrait 820 · Duo inner landscape ~951 · iPad 11" landscape 1180.
// compact keeps today's phone UI untouched; medium has room for a second pane
// but not the nav rail + 330pt list; expanded fits rail | list | detail.
// Tune thresholds through live resize testing — in one place, here.
import { useWindowDimensions } from 'react-native';

export type LayoutMode = 'compact' | 'medium' | 'expanded';

export const MEDIUM_MIN_WIDTH = 600;
export const EXPANDED_MIN_WIDTH = 900;

// Pure helper so nested layouts can classify a CONTAINER width — a pane can
// be compact inside an expanded window.
export function layoutModeForWidth(width: number): LayoutMode {
  if (width >= EXPANDED_MIN_WIDTH) return 'expanded';
  if (width >= MEDIUM_MIN_WIDTH) return 'medium';
  return 'compact';
}

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  return layoutModeForWidth(width);
}
