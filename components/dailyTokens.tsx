import React from 'react';
import { Heart, Users, BookOpen, Moon, NotebookPen, CircleCheck, Phone, Play, House, Circle } from 'lucide-react-native';
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { colors, lighten } from '@/constants/designTokens';

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
const RAW_TONES: Record<string, { ink: string; soft: string }> = {
  teal: { ink: colors.primary, soft: colors.primarySoft },
  azure: { ink: colors.secondary, soft: colors.secondarySoft },
  steel: { ink: colors.steel, soft: colors.steelSoft },
  periwinkle: { ink: colors.tertiary, soft: colors.tertiarySoft },
  amber: { ink: colors.primary, soft: colors.primarySoft },       // → teal
  blue: { ink: colors.secondary, soft: colors.secondarySoft },     // → azure
  lavender: { ink: colors.tertiary, soft: colors.tertiarySoft },   // → periwinkle
  coral: { ink: colors.secondary, soft: colors.secondarySoft },    // → azure
  gray: { ink: '#888B92', soft: '#E7E2D5' },                       // neutral (custom/no-tool)
};

export const ROW_TONES: Record<string, RowTone> = Object.fromEntries(
  Object.entries(RAW_TONES).map(([k, v]) => [k, { ...v, fill: lighten(v.soft, 0.5) }]),
);

export const resolveTone = (name: string): RowTone => ROW_TONES[name] ?? ROW_TONES.gray;

// Small, lighter subtitle shown under a daily's label on Today + My Dailies
// (not the Tools page). Keyed by action; custom dailies have none.
export const ACTION_SUBTITLE: Record<string, string> = {
  reflection: 'Start with AA wisdom',
  prayerMorning: 'Set your intention',
  gratitude: 'Name what’s good',
  meeting: 'Stay connected',
  lit: 'Keep the program close',
  callAnother: 'Don’t do it alone',
  speaker: 'Listen and learn',
  aiSponsor: 'Talk it through',
  journal: 'Write freely',
  meditation: 'Pause and listen',
  spotcheck: 'Pause and review',
  nightly: 'Look back honestly',
  prayerEvening: 'Close with gratitude',
  makeBed: 'Start with order',
  exercise: 'Move your body',
  service: 'Help someone else',
};

export const resolveSubtitle = (action?: string): string | undefined => (action ? ACTION_SUBTITLE[action] : undefined);
