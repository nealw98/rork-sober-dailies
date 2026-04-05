/**
 * Design Tokens — Serenity Grid Design System
 *
 * Single source of truth for the 3.0 redesign.
 * All new screens should import from here instead of themes.ts or colors.ts.
 */

// ─── Brand Colors ────────────────────────────────────────────────────────────

export const colors = {
  primary: '#5C8DFF',      // Vibrant blue — primary actions, brand emphasis
  primaryLight: '#A3BFFF',
  primaryDark: '#3A6AE0',

  secondary: '#6DBEBF',    // Calming teal — supporting elements
  secondaryLight: '#A8DEDE',
  secondaryDark: '#4A9E9F',

  tertiary: '#A386D5',     // Soft lavender — accents, highlights
  tertiaryLight: '#C9B8E8',
  tertiaryDark: '#7A5FB5',

  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
};

// ─── Semantic Colors (mode-aware) ────────────────────────────────────────────

export const semanticColors = {
  light: {
    background: '#F8F9FA',    // Neutral — base canvas
    surface: '#FFFFFF',        // Pure white — cards/containers
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#F1F5F9',         // Subtle card borders
    divider: '#E5E7EB',
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
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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
