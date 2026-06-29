/**
 * Design Tokens — Steel Navy color system
 *
 * Single source of truth for the 3.0 redesign, structured for theming.
 *
 * How it fits together (top → bottom):
 *   1. color math + `ramp()`  — turn one base hex into a 50→900 scale
 *   2. Theme                  — 5 family base hexes + the neutral set
 *   3. ACTIVE_THEME           — the one knob: point it at a different Theme
 *   4. families / colors       — every value re-derives from the active theme
 *   5. toolFamily             — which family each tool "speaks in" (assignments)
 *
 * To create a new theme: copy `steelNavyTheme`, change the base hexes, and set
 * `ACTIVE_THEME` to it. To re-assign a tool's color: edit one line in
 * `toolFamily`. Nothing downstream hardcodes a hex.
 */

// ─── Color math ──────────────────────────────────────────────────────────────

const hexToRgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const to2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

// Mix colour `a` toward colour `b` by `t` (0 = a, 1 = b).
const mix = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return ('#' + [0, 1, 2].map((i) => to2(A[i] + (B[i] - A[i]) * t)).join('')).toUpperCase();
};

// Mix a hex toward white by `t` (0 = unchanged, 1 = white). Kept as a public
// helper — screens use it for one-off lighter fills (e.g. card backgrounds).
export const lighten = (hex: string, t: number): string => mix(hex, '#FFFFFF', t);

// ─── Ramp generator ──────────────────────────────────────────────────────────
// One base hex → a 10-step scale. Tints (<500) mix toward white; shades (>500)
// mix toward a cool near-black. (Same math as the Steel Navy palette spec.)

const RAMP_SHADE = '#171A22';
const TINT: Record<number, number> = { 50: 0.93, 100: 0.85, 200: 0.7, 300: 0.5, 400: 0.26 };
const SHADE: Record<number, number> = { 600: 0.16, 700: 0.32, 800: 0.48, 900: 0.64 };
const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export type RampStep = (typeof RAMP_STEPS)[number];
export type Ramp = Record<RampStep, string>;

const ramp = (base: string): Ramp => {
  const out = {} as Ramp;
  for (const s of RAMP_STEPS) {
    out[s] = s === 500 ? base.toUpperCase() : s < 500 ? mix(base, '#FFFFFF', TINT[s]) : mix(base, RAMP_SHADE, SHADE[s]);
  }
  return out;
};

// ─── Theme ───────────────────────────────────────────────────────────────────
// A theme is the only place real hexes live: the 5 family bases + the neutrals.

export type Theme = {
  name: string;
  families: { steel: string; teal: string; periwinkle: string; terracotta: string };
  neutrals: { ink: string; ink2: string; ink3: string; surface: string; background: string; divider: string; border: string; stage: string };
};

export const steelNavyTheme: Theme = {
  name: 'Steel Navy',
  families: {
    steel: '#2D5882',       // Steel Navy — Speakers · Meetings · Reach Out (people & connection)
    teal: '#3D8B8B',         // Teal — Reflection · Gratitude · Prayers · Meditation (spiritual practice)
    periwinkle: '#8273B5',   // Periwinkle — Literature · Journal · Spot Check · Nightly (learn & reflect)
    terracotta: '#C16745',   // Terracotta — warm accent + AI Sponsor
  },
  neutrals: {
    ink: '#232529',          // primary text
    ink2: '#474A52',         // secondary text
    ink3: '#888B92',         // captions / muted
    surface: '#FFFFFF',      // cards
    background: '#FAF6EF',    // page (warm oat)
    divider: '#F1EDE4',      // hairlines inside cards
    border: '#E8E4DA',       // card & control borders
    stage: '#D8D2C4',        // deepest paper (canvas behind sheets)
  },
};

// ⇩ The active theme — the single knob. Swap this to re-skin the whole app.
export const ACTIVE_THEME: Theme = steelNavyTheme;

// ─── Families ────────────────────────────────────────────────────────────────
// Each base, expanded to its full ramp. `families.teal[500]` is the base, [100]
// a soft tint for medallion fills, [700] a darker shade for text/pressed states.

export const families = {
  steel: ramp(ACTIVE_THEME.families.steel),
  teal: ramp(ACTIVE_THEME.families.teal),
  periwinkle: ramp(ACTIVE_THEME.families.periwinkle),
  terracotta: ramp(ACTIVE_THEME.families.terracotta),
};
export type FamilyName = keyof typeof families;

// ─── Role assignments (tool → family) ────────────────────────────────────────
// THE assignment table. Edit a line to re-tint that tool everywhere it's drawn.

export const toolFamily: Record<string, FamilyName> = {
  // Teal — spiritual practice + writing
  reflection: 'teal',       // the Morning/Evening prayer dailies are tinted in DEFAULT_PROGRAM
  prayers: 'teal',
  journal: 'teal',
  // Steel Navy — people & connection + reading
  speakers: 'steel',
  meetings: 'steel',
  reachOut: 'steel',
  literature: 'steel',
  // Periwinkle — reflect & wind-down
  meditation: 'periwinkle',
  nightly: 'periwinkle',
  aiSponsor: 'periwinkle',
  // Terracotta — warm accents (+ Morning Prayer daily)
  gratitude: 'terracotta',
  spotCheck: 'terracotta',
};

export const accentFamily: FamilyName = 'terracotta'; // emphasis · streaks · primary actions · AI Sponsor
export const chromeFamily: FamilyName = 'teal';        // tab bar / headers / brand chrome

// The working tones a screen needs from a family: a base ink, a soft fill, a
// lighter step, and a darker shade.
export type Tone = { base: string; soft: string; light: string; dark: string };
export const toneFor = (family: FamilyName): Tone => {
  const r = families[family];
  return { base: r[500], soft: r[100], light: r[300], dark: r[700] };
};

// ─── Brand colors (derived — backwards-compatible flat names) ─────────────────
// Existing screens import these; they now resolve through the active theme's
// ramps. `primary` = teal, `secondary` = azure, `tertiary` = periwinkle, plus
// the new `steel` and `accent` families.

export const colors = {
  // Teal — reflection family + brand chrome
  primary: families.teal[500],
  primaryLight: families.teal[300],
  primaryDark: families.teal[700],
  primarySoft: families.teal[100],

  // Legacy "secondary" — the Azure family was retired; folded into Periwinkle
  // so any remaining references stay on-palette.
  secondary: families.periwinkle[500],
  secondaryLight: families.periwinkle[300],
  secondaryDark: families.periwinkle[700],
  secondarySoft: families.periwinkle[100],

  // Periwinkle — reflective family (Nightly · Meditation · AI Sponsor)
  tertiary: families.periwinkle[500],
  tertiaryLight: families.periwinkle[300],
  tertiaryExtraLight: families.periwinkle[50],
  tertiaryDark: families.periwinkle[700],
  tertiaryExtraDark: families.periwinkle[800],
  tertiarySoft: families.periwinkle[100],

  // Steel Navy — out-in-the-world family (Speakers · Meetings)
  steel: families.steel[500],
  steelLight: families.steel[300],
  steelDark: families.steel[700],
  steelSoft: families.steel[100],

  // Terracotta — the single warm accent (emphasis · streaks · primary actions)
  accent: families.terracotta[500],
  accentLight: families.terracotta[300],
  accentDark: families.terracotta[700],
  accentSoft: families.terracotta[100],

  // Legacy accent aliases — collapsed into the palette so old imports keep
  // working. amber → teal, coral → azure.
  amber: families.teal[500],
  amberSoft: families.teal[100],
  coral: families.periwinkle[500],

  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
};

// ─── Per-tool tones (derived from the assignment table) ───────────────────────

export const toolColors = {
  dailyReflection: families[toolFamily.reflection][500],
  speakerTapes: families[toolFamily.speakers][500],
  literature: families[toolFamily.literature][500],
  journal: families[toolFamily.journal][500],
  gratitude: families[toolFamily.gratitude][500],
  spotCheck: families[toolFamily.spotCheck][500],
  nightlyReview: families[toolFamily.nightly][500],
  prayers: families[toolFamily.prayers][500],
  meditation: families[toolFamily.meditation][500],
  aiSponsor: families[toolFamily.aiSponsor][500],
} as const;

// ─── Semantic Colors (mode-aware) ────────────────────────────────────────────

export const semanticColors = {
  light: {
    background: ACTIVE_THEME.neutrals.background,
    surface: ACTIVE_THEME.neutrals.surface,
    text: ACTIVE_THEME.neutrals.ink,
    textSecondary: ACTIVE_THEME.neutrals.ink2,
    textMuted: ACTIVE_THEME.neutrals.ink3,
    border: ACTIVE_THEME.neutrals.border,
    divider: ACTIVE_THEME.neutrals.divider,
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

// ─── Card Backgrounds (legacy) ───────────────────────────────────────────────

export const cardColors = {
  light: {
    reflection: '#FFFFFF',
    sponsor: '#6DBEBF',
    speakers: '#A386D5',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type ColorMode = 'light' | 'dark';

export const getSemanticColors = (mode: ColorMode) => semanticColors[mode];
export const getCardColors = (mode: ColorMode) => cardColors[mode];
