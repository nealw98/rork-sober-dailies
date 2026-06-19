import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTextSettings } from '@/hooks/use-text-settings';
import {
  fontFor,
  redesignColors,
  type TypographyVoice,
  type TypographyWeight,
} from '@/constants/redesignTokens';

type AppTextProps = TextProps & {
  voice?: TypographyVoice;
  weight?: TypographyWeight;
  size?: number;
  lineHeight?: number;
  color?: string;
};

export function AppText({
  voice = 'interface',
  weight = 'regular',
  size = 16,
  lineHeight,
  color = redesignColors.ink,
  style,
  ...props
}: AppTextProps) {
  const { scaleTypography } = useTextSettings();
  const scaledSize = scaleTypography(size, voice);
  const scaledLineHeight = lineHeight
    ? scaleTypography(lineHeight, voice)
    : Math.round(scaledSize * (voice === 'reader' ? 1.55 : 1.35));

  const baseStyle: TextStyle = {
    color,
    fontFamily: fontFor(voice, weight),
    fontSize: scaledSize,
    lineHeight: scaledLineHeight,
  };

  return <Text {...props} style={[baseStyle, style]} />;
}

