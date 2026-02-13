/**
 * Theme types for app-wide color palettes.
 * Default theme = current multi-color design (unchanged).
 * Other themes = single-hue variants.
 */

export type ThemeId = 'default' | 'blue';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

export interface RecognitionColors {
  gradientStart: string;
  gradientEnd: string;
  text: string;
}

export interface HeroTilesGradients {
  header: string[];
  dailyReflection: string[];
  aiSponsor: string[];
  literature: string[];
  morningPrayer: string[];
  gratitude: string[];
  eveningPrayer: string[];
  nightlyReview: string[];
  prayers: string[];
  spotCheck: string[];
  speakers: string[];
}

/** Resolved palette: semantic colors + gradients + hero tiles. Used by useTheme(). */
export interface ResolvedPalette {
  text: string;
  background: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  cardBackground: string;
  accent: string;
  muted: string;
  chatBubbleUser: string;
  chatBubbleBot: string;
  chatBubbleGrace: string;
  chatBubbleSalty: string;
  border: string;
  divider: string;
  destructive?: string;
  recognition: RecognitionColors;
  gradients: {
    main: string[];
    mainThreeColor: string[];
    header: string[];
  };
  heroTiles: HeroTilesGradients;
  /** Text color for hero tiles */
  heroTileText: string;
  /** Text color for header gradient */
  headerText: string;
  /** Literature tile colors */
  literatureTiles: {
    bigbook: string[];
    twelveAndTwelve: string[];
    meetingPocket: string[];
  };
  /** Sponsor selection page specific colors */
  sponsorSelection?: {
    background: string; // Background color for sponsor selection page
    tileColor: string[]; // Color for sponsor tiles
    tileText?: string; // Text color for sponsor tiles
  };
  /** Chat background for sponsor chat windows */
  chatBackground?: string;
  /** Sobriety tracker card background */
  sobrietyCardBackground?: string;
}

/** Per-theme palette (light or dark variant). */
export interface ThemePalette {
  text: string;
  background: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  cardBackground: string;
  accent: string;
  muted: string;
  chatBubbleUser: string;
  chatBubbleBot: string;
  chatBubbleGrace: string;
  chatBubbleSalty: string;
  border: string;
  divider: string;
  destructive?: string;
  recognition: RecognitionColors;
  gradients: {
    main: string[];
    mainThreeColor: string[];
    header: string[];
  };
  heroTiles: HeroTilesGradients;
  /** Text color for hero tiles */
  heroTileText: string;
  /** Text color for header gradient */
  headerText: string;
  /** Literature tile colors */
  literatureTiles: {
    bigbook: string[];
    twelveAndTwelve: string[];
    meetingPocket: string[];
  };
  /** Sponsor selection page specific colors */
  sponsorSelection?: {
    background: string;
    tileColor: string[];
    tileText?: string;
  };
  /** Chat background for sponsor chat windows */
  chatBackground?: string;
  /** Sobriety tracker card background */
  sobrietyCardBackground?: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  light?: ThemePalette;
  dark?: ThemePalette;
  /** If true, this theme ignores system color scheme and always uses its defined mode */
  forcedMode?: 'light' | 'dark';
}
