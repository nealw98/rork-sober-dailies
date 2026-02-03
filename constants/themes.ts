/**
 * Theme definitions.
 * - Default theme: Original multi-color design with unique gradients for each tile. NEVER changes.
 * - Deep Sea (blue): Dark mode only.
 *   - HOME PAGE: All tiles use PRIMARY color (Blue Slate #3E5C76)
 *   - SPONSOR SELECTION PAGE: 
 *     - Background: Deep Space Blue (#1D2D44) 
 *     - Sponsor tiles: Dusty Denim (#748CAB)
 * - Green theme: Light/dark with all home tiles using primary color.
 */

import type { ThemeDefinition } from '@/types/theme';

// ----- Default theme: Original multi-color design (each tile has unique colors) -----
const defaultLight = {
  text: '#333333',
  background: '#fff',
  tint: '#4A90E2',
  tabIconDefault: '#ccc',
  tabIconSelected: '#4A90E2',
  cardBackground: '#f8f9fa',
  accent: '#5CB85C',
  muted: '#6c757d',
  chatBubbleUser: 'rgba(74, 144, 226, 0.5)',
  chatBubbleBot: 'rgba(92, 184, 92, 0.25)',
  chatBubbleGrace: 'rgba(186, 85, 211, 0.25)',
  chatBubbleSalty: 'rgba(255, 191, 0, 0.25)',
  border: '#e9ecef',
  divider: '#e9ecef',
  destructive: '#EF4444',
  recognition: {
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
    text: 'white',
  },
  gradients: {
    main: ['#B8D4F1', '#C4E0E5'],
    mainThreeColor: ['#B8D4F1', '#C4E0E5', '#D7EDE4'],
    header: ['#4A6FA5', '#3D8B8B', '#45A08A'],
  },
  heroTiles: {
    header: ['#4A6FA5', '#3D8B8B', '#45A08A'],
    dailyReflection: ['#6A88D5', '#4A68B5'],
    aiSponsor: ['#5DABAB', '#3D8B8B'],
    literature: ['#6AC08A', '#4AA06A'],
    morningPrayer: ['#F5D560', '#E5B530'],
    gratitude: ['#F8A870', '#E8884A'],
    eveningPrayer: ['#E590AA', '#D5708A'],
    nightlyReview: ['#AA85D5', '#8A65B5'],
    prayers: ['#6AC8B8', '#4AA898'],
    spotCheck: ['#E0CABE', '#907565'],
  },
} as const;

const defaultDark = {
  ...defaultLight,
  text: '#e9ecef',
  background: '#1a1d21',
  cardBackground: '#25282c',
  muted: '#9ca3af',
  border: '#374151',
  divider: '#374151',
  gradients: {
    main: ['#2d4a6a', '#2d5a5a'],
    mainThreeColor: ['#2d4a6a', '#2d5a5a', '#2d6a4a'],
    header: ['#2d4a6a', '#2d5a5a', '#2d6a4a'],
  },
  heroTiles: {
    header: ['#2d4a6a', '#2d5a5a', '#2d6a4a'],
    dailyReflection: ['#4a68a5', '#3a5885'],
    aiSponsor: ['#3d7a7a', '#2d5a5a'],
    literature: ['#4a906a', '#3a704a'],
    morningPrayer: ['#c5b540', '#a59520'],
    gratitude: ['#d88850', '#b86830'],
    eveningPrayer: ['#c5708a', '#a5506a'],
    nightlyReview: ['#8a65a5', '#6a4585'],
    prayers: ['#4aa888', '#3a8868'],
    spotCheck: ['#b09585', '#907565'],
  },
};

// ----- Blue theme (Deep Sea): Dark mode only, 3 solid colors for tiles -----
const blueDeepSeaDark = {
  text: '#F0EBD8', // Eggshell for text
  background: '#0D1321', // Ink Black for background
  tint: '#3E5C76', // Blue Slate as main tint
  tabIconDefault: '#748CAB',
  tabIconSelected: '#3E5C76',
  cardBackground: '#1D2D44', // Deep Space Blue for cards
  accent: '#3E5C76', // Blue Slate for accents
  muted: '#748CAB', // Dusty Denim for muted text
  chatBubbleUser: 'rgba(116, 140, 171, 0.8)', // Dusty Denim for user messages
  chatBubbleBot: 'rgba(116, 140, 171, 0.4)', // Dusty Denim (lighter) for bot messages
  chatBubbleGrace: 'rgba(116, 140, 171, 0.4)', // Dusty Denim for Grace
  chatBubbleSalty: 'rgba(116, 140, 171, 0.4)', // Dusty Denim for Salty
  border: '#3E5C76', // Blue Slate for borders
  divider: '#3E5C76', // Blue Slate for dividers
  destructive: '#EF4444',
  recognition: { gradientStart: '#1D2D44', gradientEnd: '#3E5C76', text: 'white' },
  gradients: {
    main: ['#1D2D44', '#3E5C76'],
    mainThreeColor: ['#1D2D44', '#3E5C76', '#748CAB'],
    header: ['#1D2D44', '#3E5C76', '#748CAB'], // Keep gradient for header only
  },
  heroTiles: {
    header: ['#1D2D44', '#3E5C76', '#748CAB'],
    // ALL HOME PAGE TILES use Primary color (Blue Slate)
    dailyReflection: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    aiSponsor: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    literature: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    morningPrayer: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    gratitude: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    eveningPrayer: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    nightlyReview: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    prayers: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
    spotCheck: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
  },
  sponsorSelection: {
    background: '#0D1321', // Ink Black for sponsor selection page background
    tileColor: ['#748CAB', '#748CAB'], // Dusty Denim for sponsor tiles
  },
  chatBackground: '#1D2D44', // Deep Space Blue for sponsor chat background
} as const;

// ----- Green theme: 3 solid colors for tiles -----
const greenPrimary = '#059669';
const greenSecondary = '#34d399';
const greenTertiary = '#6ee7b7';
const greenHeader = ['#059669', '#047857', '#065f46'];

const greenLight = {
  text: '#333333',
  background: '#fff',
  tint: '#059669',
  tabIconDefault: '#ccc',
  tabIconSelected: '#059669',
  cardBackground: '#f0fdf4',
  accent: '#10b981',
  muted: '#64748b',
  chatBubbleUser: 'rgba(5, 150, 105, 0.5)',
  chatBubbleBot: 'rgba(16, 185, 129, 0.25)',
  chatBubbleGrace: 'rgba(52, 211, 153, 0.25)',
  chatBubbleSalty: 'rgba(134, 239, 172, 0.25)',
  border: '#dcfce7',
  divider: '#dcfce7',
  destructive: '#EF4444',
  recognition: { gradientStart: '#10b981', gradientEnd: '#047857', text: 'white' },
  gradients: {
    main: ['#6ee7b7', '#a7f3d0'],
    mainThreeColor: ['#6ee7b7', '#a7f3d0', '#d1fae5'],
    header: greenHeader, // Keep gradient for header
  },
  heroTiles: {
    header: greenHeader,
    // ALL HOME PAGE TILES use Primary color
    dailyReflection: [greenPrimary, greenPrimary], // Primary
    aiSponsor: [greenPrimary, greenPrimary], // Primary (also for sponsor selection tiles)
    literature: [greenPrimary, greenPrimary], // Primary
    morningPrayer: [greenPrimary, greenPrimary], // Primary
    gratitude: [greenPrimary, greenPrimary], // Primary
    eveningPrayer: [greenPrimary, greenPrimary], // Primary
    nightlyReview: [greenPrimary, greenPrimary], // Primary
    prayers: [greenPrimary, greenPrimary], // Primary
    spotCheck: [greenPrimary, greenPrimary], // Primary
  },
} as const;

const greenDark = {
  ...greenLight,
  text: '#ecfdf5',
  background: '#022c22',
  cardBackground: '#064e3b',
  muted: '#6ee7b7',
  border: '#065f46',
  divider: '#065f46',
  gradients: {
    main: ['#065f46', '#047857'],
    mainThreeColor: ['#065f46', '#047857', '#022c22'],
    header: ['#047857', '#065f46', '#064e3b'], // Keep gradient for header
  },
  heroTiles: {
    header: ['#047857', '#065f46', '#064e3b'],
    // ALL HOME PAGE TILES use Primary color
    dailyReflection: ['#047857', '#047857'], // Primary
    aiSponsor: ['#047857', '#047857'], // Primary (also for sponsor selection tiles)
    literature: ['#047857', '#047857'], // Primary
    morningPrayer: ['#047857', '#047857'], // Primary
    gratitude: ['#047857', '#047857'], // Primary
    eveningPrayer: ['#047857', '#047857'], // Primary
    nightlyReview: ['#047857', '#047857'], // Primary
    prayers: ['#047857', '#047857'], // Primary
    spotCheck: ['#047857', '#047857'], // Primary
  },
};

// ----- Export theme definitions -----
export const THEMES: ThemeDefinition[] = [
  { id: 'default', name: 'Default', light: defaultLight as any, dark: defaultDark as any },
  { id: 'blue', name: 'Deep Sea', dark: blueDeepSeaDark as any, forcedMode: 'dark' },
  { id: 'green', name: 'Green', light: greenLight as any, dark: greenDark as any },
];

export const DEFAULT_THEME_ID = 'default' as const;
export const DEFAULT_COLOR_SCHEME = 'light' as const;

export function getThemeById(id: 'default' | 'blue' | 'green'): ThemeDefinition {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return THEMES[0];
  return theme;
}
