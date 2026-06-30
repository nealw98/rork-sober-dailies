export interface Reflection {
  date: string; // Format: "MM-DD"
  title: string;
  quote: string;
  source: string;
  reflection: string;
  thought: string;
  homeQuote?: string; // Optional curated quote for the home page card
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: number;
}

export interface EveningReviewEntry {
  date: string; // Format: "YYYY-MM-DD"
  answers: { [key: string]: boolean | null };
  reflection: string;
  completed: boolean;
}

export interface WeeklyProgressDay {
  dayName: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export type SponsorType =
  | "salty"
  | "supportive"
  | "grace"
  | "salty-v2"
  | "supportive-v2"
  | "grace-v2"
  | "cowboy-pete"
  | "co-sign-sally"
  | "fresh"
  | "mama-jo";

export type { ThemeId, ColorSchemePreference, ResolvedPalette, ThemePalette, ThemeDefinition } from './theme';
