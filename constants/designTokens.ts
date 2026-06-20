/**
 * Design Tokens — Serenity Grid Design System
 *
 * Single source of truth for the 3.0 redesign.
 * All new screens should import from here instead of themes.ts or colors.ts.
 */

// ─── Brand Colors ────────────────────────────────────────────────────────────

// Brand palette aligned to the 3.0 prototype (frames/hifi-tokens.js · SD_TOKENS):
// teal = primary brand, blue = supporting, lavender = accent, amber = warm hopeful accent.
export const colors = {
  primary: '#3D8B8B',      // Teal — primary actions, brand emphasis
  primaryLight: '#7FB8B8',
  primaryDark: '#2E6F6F',
  primarySoft: '#D8E8E8',

  secondary: '#5C8DFF',    // Blue — supporting elements, links
  secondaryLight: '#A3BFFF',
  secondaryDark: '#3A6AE0',
  secondaryExtraDark: '#2E7A7B', // retained for back-compat with existing screens
  secondarySoft: '#DEE8FF',

  tertiary: '#A386D5',     // Soft lavender — accents, highlights
  tertiaryLight: '#C9B8E8',
  tertiaryExtraLight: '#E8DFF5',
  tertiaryDark: '#7A5FB5',
  tertiaryExtraDark: '#5A4290',
  tertiarySoft: '#E9E0F6',

  amber: '#E8A95D',        // Warm hopeful accent
  amberSoft: '#F6E5C8',

  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
};

// ─── Semantic Colors (mode-aware) ────────────────────────────────────────────

export const semanticColors = {
  light: {
    background: '#F9F7F2',    // Warm paper — base canvas (SD_TOKENS.bg)
    surface: '#FFFFFF',        // Pure white — cards/containers
    text: '#2B2A30',           // ink
    textSecondary: '#4A4A5E',  // ink2
    textMuted: '#8A8A9A',      // ink3
    border: '#EDEAE2',         // warm hairline border
    divider: '#F3F1EC',
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

// Three type voices (3.0 prototype, Session-13 decision):
//   Inter   = everything you operate (UI, labels, buttons, inputs, prompts, counters)
//   Archivo = titles, page & section headers (the structural "marquee" voice)
//   Lora    = long-form reading & genuine quotes ONLY (reflections, prayers, literature, pull-quotes)
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Archivo_600SemiBold',
  displayMedium: 'Archivo_500Medium',
  displayBold: 'Archivo_700Bold',
  displayHeavy: 'Archivo_800ExtraBold',
  serif: 'Lora_400Regular',
  serifBold: 'Lora_700Bold',
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
