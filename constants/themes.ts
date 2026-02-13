/**
 * Theme definitions.
 * - Default theme: Original multi-color design with unique gradients for each tile. NEVER changes.
 * - Deep Sea: Dark mode only.
 *   - HOME PAGE: All tiles use PRIMARY color (Blue Slate #3E5C76)
 *   - SPONSOR SELECTION PAGE: 
 *     - Background: Deep Space Blue (#1D2D44) 
 *     - Sponsor tiles: Dusty Denim (#748CAB)
 */

import type { ThemeDefinition } from '@/types/theme';

// ----- Default theme: Original multi-color design (each tile has unique colors) -----
const defaultLight = {
  text: '#333333',
  background: '#fff',
  tint: '#3D8B8B', // Teal - used for icons, tab highlights, and UI accents
  tabIconDefault: '#ccc',
  tabIconSelected: '#3D8B8B',
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
    speakers: ['#8B6AC0', '#6A4A98'],
  },
  heroTileText: '#ffffff', // White text on colored tile backgrounds
  headerText: '#ffffff', // White text on header gradient
  literatureTiles: {
    bigbook: ['#6AC08A', '#4AA06A'],
    twelveAndTwelve: ['#5DABAB', '#3D8B8B'],
    meetingPocket: ['#AA85D5', '#8A65B5'],
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
    speakers: ['#7a5aaa', '#5a3a88'],
  },
  heroTileText: '#ffffff', // White text on colored tile backgrounds
  headerText: '#ffffff', // White text on header gradient
  literatureTiles: {
    bigbook: ['#4a906a', '#3a704a'],
    twelveAndTwelve: ['#3d7a7a', '#2d5a5a'],
    meetingPocket: ['#8a65a5', '#6a4585'],
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
    speakers: ['#3E5C76', '#3E5C76'], // Primary: Blue Slate
  },
  sponsorSelection: {
    background: '#0D1321', // Ink Black for sponsor selection page background
    tileColor: ['#3E5C76', '#3E5C76'], // Blue Slate for sponsor tiles
    tileText: '#F0EBD8', // Eggshell for sponsor tile text
  },
  chatBackground: '#1D2D44', // Deep Space Blue for sponsor chat background
  sobrietyCardBackground: '#0D1321', // Ink Black for sobriety tracker card
  heroTileText: '#F0EBD8', // Eggshell text on tiles
  headerText: '#F0EBD8', // Eggshell text on header gradient
  literatureTiles: {
    bigbook: ['#3E5C76', '#3E5C76'], // Blue Slate solid for Deep Sea
    twelveAndTwelve: ['#3E5C76', '#3E5C76'],
    meetingPocket: ['#3E5C76', '#3E5C76'],
  },
} as const;

// ----- Export theme definitions -----
export const THEMES: ThemeDefinition[] = [
  { id: 'default', name: 'Default', light: defaultLight as any, dark: defaultDark as any },
  { id: 'blue', name: 'Deep Sea', dark: blueDeepSeaDark as any, forcedMode: 'dark' },
];

export const DEFAULT_THEME_ID = 'default' as const;
export const DEFAULT_COLOR_SCHEME = 'light' as const;

export function getThemeById(id: 'default' | 'blue'): ThemeDefinition {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return THEMES[0];
  return theme;
}
