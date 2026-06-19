import type { TextStyle, ViewStyle } from 'react-native';

export const redesignColors = {
  paper: '#F9F7F2',
  paperDeep: '#F2EEE6',
  surface: '#FFFFFF',
  ink: '#2B2A30',
  inkSecondary: '#68666F',
  inkMuted: '#97939B',
  border: '#E7E1D8',
  divider: '#EEE9E1',
  teal: '#3D8B8B',
  tealSoft: '#E4F0EE',
  lavender: '#A386D5',
  lavenderSoft: '#EEE8F7',
  blue: '#5C8DFF',
  blueSoft: '#E8EEFF',
  amber: '#E8A95D',
  amberSoft: '#F8EEDC',
  coral: '#D36A5A',
  coralSoft: '#F7E7E2',
  white: '#FFFFFF',
  shadow: '#2B2A30',
} as const;

export const redesignTypography = {
  display: {
    regular: 'Archivo_400Regular',
    medium: 'Archivo_500Medium',
    semiBold: 'Archivo_600SemiBold',
    bold: 'Archivo_700Bold',
  },
  interface: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  reader: {
    regular: 'Lora_400Regular',
    bold: 'Lora_700Bold',
  },
} as const;

export const redesignTypeSize = {
  caption: 12,
  label: 13,
  bodySmall: 14,
  body: 16,
  bodyLarge: 18,
  section: 20,
  title: 30,
  hero: 34,
} as const;

export const redesignSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const redesignRadii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const redesignShadows: Record<'soft' | 'floating', ViewStyle> = {
  soft: {
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  floating: {
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 9,
  },
};

export type TypographyVoice = 'display' | 'interface' | 'reader';
export type TypographyWeight = 'regular' | 'medium' | 'semiBold' | 'bold';

export function fontFor(
  voice: TypographyVoice,
  weight: TypographyWeight = 'regular',
): TextStyle['fontFamily'] {
  if (voice === 'display') {
    return redesignTypography.display[weight];
  }
  if (voice === 'reader') {
    return weight === 'bold'
      ? redesignTypography.reader.bold
      : redesignTypography.reader.regular;
  }
  return redesignTypography.interface[weight];
}

