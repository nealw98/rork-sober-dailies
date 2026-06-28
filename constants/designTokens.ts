/**
 * Design Tokens — Serenity Grid Design System
 *
 * Single source of truth for the 3.0 redesign.
 * All new screens should import from here instead of themes.ts or colors.ts.
 */

// ─── Brand Colors ────────────────────────────────────────────────────────────
// June 2026 re-theme: the palette derives from the app icon — three quiet colors
// instead of the old per-tool rainbow. Teal leads (unchanged). The old per-tool
// accents (amber / coral) are kept ONLY as aliases that re-tint into the brand
// palette, so every legacy reference collapses automatically (token-driven):
//   teal = Daily Reflection, Literature, Gratitude, Prayers, Notebook + chrome
//   cyan (secondary)   = Journal, Spot Check, Reach Out
//   periwinkle (tertiary) = Speaker, Nightly, Meditation, AI Sponsor, Meetings

export const colors = {
  primary: '#3D8B8B',      // Teal — brand anchor (unchanged)
  primaryLight: '#7FB8B8',
  primaryDark: '#2E6F6F',
  primarySoft: '#D8E8E8',

  secondary: '#1C8198',    // Cyan — write/act family (Journal, Spot Check, Reach Out)
  secondaryLight: '#5BA9B8',
  secondaryDark: '#0E6375',
  secondarySoft: '#D5E8EC',

  tertiary: '#6E7AB0',     // Periwinkle — reflective family (Speaker, Nightly, Meditation, AI Sponsor, Meetings)
  tertiaryLight: '#9AA4CA',
  tertiaryExtraLight: '#EEF0F7',
  tertiaryDark: '#515D92',
  tertiaryExtraDark: '#3E4773',
  tertiarySoft: '#E2E4F1',

  // Legacy accent aliases — collapsed into the brand palette. amber → teal,
  // coral → cyan. (Names retained so existing imports keep working.)
  amber: '#3D8B8B',
  amberSoft: '#D8E8E8',
  coral: '#1C8198',

  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
};

// ─── Per-tool tones ──────────────────────────────────────────────────────────
// One color per tool/concept. MUST match the Journey medallions and Tools
// tiles exactly (see DESIGN-DECISIONS.md "Tile color tone-per-tool").

export const toolColors = {
  dailyReflection: colors.primary,   // teal
  speakerTapes: colors.tertiary,     // lavender
  literature: colors.amber,          // amber
  journal: colors.secondary,         // blue
  gratitude: colors.amber,           // amber
  spotCheck: colors.coral,           // coral
  nightlyReview: colors.tertiary,    // lavender
  prayers: colors.amber,             // amber
  meditation: colors.tertiary,       // lavender
  aiSponsor: colors.tertiary,        // lavender
} as const;

// ─── Semantic Colors (mode-aware) ────────────────────────────────────────────

export const semanticColors = {
  light: {
    background: '#F7F2E8',    // Soft cream — light warm paper (keeps warmth without dulling the white tiles)
    surface: '#FFFFFF',        // Pure white — cards/containers
    text: '#232529',
    textSecondary: '#474A52',
    textMuted: '#888B92',
    border: '#E8E4DA',         // Warm subtle card borders
    divider: '#F0ECE2',
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  dark: {
    background: '#121218',
    surface: '#1E1E2A',
    text: '#F0F0F5',
    textSecondary: '#A0A0B0',
    textMuted: '#6B6B80',
    border: '#2E2E40',
    divider: '#252535',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

// ─── Card Backgrounds ────────────────────────────────────────────────────────

export const cardColors = {
  light: {
    reflection: '#FFFFFF',
    sponsor: '#6DBEBF',      // Secondary color
    speakers: '#A386D5',     // Tertiary color
    literature: '#FFFFFF',
    ritual: '#FFFFFF',
  },
  dark: {
    reflection: '#1E2A3E',
    sponsor: '#1A2E28',
    speakers: '#2A2040',
    literature: '#1E1E2A',
    ritual: '#1E1E2A',
  },
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

// Three voices, three jobs (DESIGN-DECISIONS.md "Visual system"):
//   display (Archivo) = titles / page & section headers — the structural voice
//   serif   (Lora)    = long-form reading + genuine quotes ONLY
//   regular…bold (Inter) = everything you operate (UI, labels, prompts, counters)
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  serif: 'Lora_400Regular',
  serifMedium: 'Lora_500Medium',      // a touch heavier than regular — reflection hero titles
  regularItalic: 'Inter_400Regular_Italic', // RN needs the real italic face — fontStyle:'italic' won't synthesize it
  semiBoldItalic: 'Inter_600SemiBold_Italic', // RN needs the real italic face — fontStyle:'italic' won't synthesize it
  serifItalic: 'Lora_400Regular_Italic', // RN needs the real italic face — fontStyle:'italic' won't synthesize it
  serifMediumItalic: 'Lora_500Medium_Italic', // the affirmation weight (prototype uses 500)
  serifBold: 'Lora_700Bold',
  display: 'Archivo_600SemiBold',     // section headers, row/tab titles
  displayBold: 'Archivo_700Bold',     // page titles, hero
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 22,
  '4xl': 28,
  hero: 32,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  softUI: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── Gradients ───────────────────────────────────────────────────────────────

export const gradients = {
  header: ['#4A6FA5', '#3D8B8B', '#45A08A'] as const,
  primary: ['#5C8DFF', '#6DBEBF'] as const,
  tertiary: ['#A386D5', '#6DBEBF'] as const,
};

// ─── Helper ──────────────────────────────────────────────────────────────────

export type ColorMode = 'light' | 'dark';

export const getSemanticColors = (mode: ColorMode) => semanticColors[mode];
export const getCardColors = (mode: ColorMode) => cardColors[mode];

// Mix a hex colour toward white by `t` (0 = unchanged, 1 = white). RN has no
// CSS `color-mix`, so precompute lighter tints at module load with this.
export const lighten = (hex: string, t: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
};
