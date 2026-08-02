import React from 'react';
import { Heart, Users, BookOpen, Moon, NotebookPen, CircleCheck, Phone, Play, House, Circle, Mic, Dumbbell, HeartHandshake } from 'lucide-react-native';
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { colors, lighten, getColors, type ColorMode } from '@/constants/designTokens';

/**
 * Shared glyph + tone maps for the dailies surfaces (Today + My Dailies editor),
 * so the two stay in lockstep. Prayer/Meditation use Phosphor (Lucide has no
 * praying-hands / lotus) per the DESIGN-DECISIONS icon lockdown.
 */

export type GlyphComponent = React.ComponentType<{ size?: number; color?: string }>;

export const GLYPH: Record<string, GlyphComponent> = {
  pray: HandsPraying,
  lotus: FlowerLotus,
  heart: Heart,
  users: Users,
  library: BookOpen,
  book: BookOpen,
  moon: Moon,
  journal: NotebookPen,
  check: CircleCheck,
  phone: Phone,
  play: Play,
  mic: Mic,
  dumbbell: Dumbbell,
  heartHandshake: HeartHandshake,
  home: House,
  circle: Circle,
};

export const resolveGlyph = (name: string): GlyphComponent => GLYPH[name] ?? Circle;

// tone name → { ink (solid), soft (tint), fill } — matches the Journey/Tools
// medallions. `fill` is the completed-row inset wash on Today: `soft` lightened
// ~50% toward white (precomputed; RN has no color-mix).
type RowTone = { ink: string; soft: string; fill: string };
// Tone names map into the active palette (Steel Navy): teal / azure / periwinkle
// / steel, so existing daily `color` values keep working. Legacy aliases (amber,
// blue, coral) collapse into the new families.
const rawTones = (mode: ColorMode): Record<string, { ink: string; soft: string }> => {
  const cs = getColors(mode);
  return {
    teal: { ink: cs.primary, soft: cs.primarySoft },
    steel: { ink: cs.steel, soft: cs.steelSoft },
    periwinkle: { ink: cs.tertiary, soft: cs.tertiarySoft },
    terracotta: { ink: cs.accent, soft: cs.accentSoft },
    amber: { ink: cs.accent, soft: cs.accentSoft },          // → terracotta (warm stays warm)
    lavender: { ink: cs.tertiary, soft: cs.tertiarySoft },   // → periwinkle
    // retired Azure family — folds into periwinkle
    azure: { ink: cs.tertiary, soft: cs.tertiarySoft },
    blue: { ink: cs.tertiary, soft: cs.tertiarySoft },
    coral: { ink: cs.accent, soft: cs.accentSoft },          // → terracotta (warm stays warm)
    gray: mode === 'dark'
      ? { ink: '#92949A', soft: 'rgba(255,255,255,0.08)' }   // neutral (custom/no-tool)
      : { ink: '#888B92', soft: '#E7E2D5' },
  };
};

// On dark the soft tints are already low-alpha washes, so `fill` (the
// completed-row inset wash) just reuses them; on light it lightens 50%.
const buildTones = (mode: ColorMode): Record<string, RowTone> => Object.fromEntries(
  Object.entries(rawTones(mode)).map(([k, v]) => [
    k,
    { ...v, fill: mode === 'dark' ? v.soft : lighten(v.soft, 0.5) },
  ]),
);

const TONES_BY_MODE: Record<ColorMode, Record<string, RowTone>> = {
  light: buildTones('light'),
  dark: buildTones('dark'),
};

export const ROW_TONES: Record<string, RowTone> = TONES_BY_MODE.light;
export const getRowTones = (mode: ColorMode) => TONES_BY_MODE[mode];

export const resolveTone = (name: string, mode: ColorMode = 'light'): RowTone =>
  TONES_BY_MODE[mode][name] ?? TONES_BY_MODE[mode].gray;

