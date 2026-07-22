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
  text: string; // for card messages, a plain-text fallback so `.text` readers still work
  sender: "user" | "bot";
  timestamp: number;
  model?: string; // dev: the model that produced this bot reply (sponsor-api backend)
  temperature?: number; // dev: the temperature setting used for this reply
  kind?: 'text' | 'spotCheckCard'; // undefined == 'text'
  spotCheck?: import('./spotCheck').SpotCheckEntry; // present iff kind === 'spotCheckCard'
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
