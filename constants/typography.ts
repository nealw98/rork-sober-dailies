import type { TextStyle } from 'react-native';

/**
 * Typography scale — 3.0 prototype (Typography Audit.html · Session-13 decision).
 *
 * Three voices, each with one job:
 *   Archivo = titles / structure (page & section heroes, feature titles)
 *   Lora    = long-form reading & genuine quotes ONLY (reflections, prayers, literature, pull-quotes)
 *   Inter   = everything you operate (section headers, row titles, labels, buttons, inputs, captions)
 *
 * Hierarchy comes from size + family; weight is used sparingly. Mobile (402px) values.
 *
 * NOTE: on React Native each weight is its own loaded font family
 * (e.g. 'Inter_600SemiBold', 'Archivo_800ExtraBold'), so presets set `fontFamily`
 * per weight rather than relying on `fontWeight` (which Android ignores for named fonts).
 * Keep these family strings in sync with the useFonts() map in app/_layout.tsx.
 */

export type TypographyRole =
  | 'pageTitle'
  | 'featureTitle'
  | 'prompt'
  | 'sectionHeader'
  | 'cardTitle'
  | 'readingBody'
  | 'entry'
  | 'body'
  | 'caption'
  | 'eyebrow'
  | 'button'
  | 'tabLabel';

export const typography: Record<TypographyRole, TextStyle> = {
  // ── Archivo — the title / structure voice ──────────────────────────────
  pageTitle:     { fontFamily: 'Archivo_800ExtraBold', fontSize: 27, lineHeight: 30, letterSpacing: -1 },
  featureTitle:  { fontFamily: 'Archivo_700Bold',      fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },

  // ── Inter — the interface voice ────────────────────────────────────────
  prompt:        { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  sectionHeader: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 22 },
  cardTitle:     { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20 },
  entry:         { fontFamily: 'Inter_400Regular',  fontSize: 16, lineHeight: 24 },
  body:          { fontFamily: 'Inter_400Regular',  fontSize: 14, lineHeight: 22 },
  caption:       { fontFamily: 'Inter_500Medium',   fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
  eyebrow:       { fontFamily: 'Inter_700Bold',     fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  button:        { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 18 },
  tabLabel:      { fontFamily: 'Inter_500Medium',   fontSize: 11, lineHeight: 14 },

  // ── Lora — the reflective / reading voice (scales with Text Size) ───────
  readingBody:   { fontFamily: 'Lora_400Regular',   fontSize: 17, lineHeight: 26 },
};

/** Roles whose size follows the user's Text Size setting (reading surfaces). */
export const SCALING_ROLES: ReadonlySet<TypographyRole> = new Set(['readingBody']);

/** Which level of the ink scale each role defaults to. */
export type InkRole = 'ink' | 'ink2' | 'ink3';
export const roleInk: Record<TypographyRole, InkRole> = {
  pageTitle: 'ink',
  featureTitle: 'ink',
  prompt: 'ink',
  sectionHeader: 'ink',
  cardTitle: 'ink',
  readingBody: 'ink',
  entry: 'ink',
  body: 'ink2',
  caption: 'ink3',
  eyebrow: 'ink3',
  button: 'ink',
  tabLabel: 'ink3',
};
