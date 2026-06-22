import React from 'react';
import { Heart, Users, BookOpen, Moon, NotebookPen, CircleCheck, Phone, Play, House, Circle } from 'lucide-react-native';
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';

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

// tone name → { ink (solid), soft (tint) } — matches the Journey/Tools medallions
export const ROW_TONES: Record<string, { ink: string; soft: string }> = {
  teal: { ink: '#3D8B8B', soft: '#D8E8E8' },
  amber: { ink: '#E8A95D', soft: '#F6E5C8' },
  blue: { ink: '#5C8DFF', soft: '#DEE8FF' },
  lavender: { ink: '#A386D5', soft: '#E9E0F6' },
  coral: { ink: '#D36A5A', soft: '#F4DAD3' },
  gray: { ink: '#9A9AA8', soft: '#E7E2D5' },
};

export const resolveTone = (name: string) => ROW_TONES[name] ?? ROW_TONES.gray;

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
