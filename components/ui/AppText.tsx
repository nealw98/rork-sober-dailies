import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTextSettings } from '@/hooks/use-text-settings';
import {
  fontFor,
  redesignColors,
  redesignTextRoles,
  type RedesignTextRole,
  type TypographyVoice,
  type TypographyWeight,
} from '@/constants/redesignTokens';

type AppTextProps = TextProps & {
  typeRole?: RedesignTextRole;
  voice?: TypographyVoice;
  weight?: TypographyWeight;
  size?: number;
  lineHeight?: number;
  color?: string;
  italic?: boolean;
};

export function AppText({
  typeRole,
  voice = 'interface',
  weight = 'regular',
  size = 16,
  lineHeight,
  color = redesignColors.ink,
  italic = false,
  style,
  ...props
}: AppTextProps) {
  const { scaleTypography } = useTextSettings();
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const roleSpec = typeRole ? redesignTextRoles[typeRole] : null;
  const resolvedVoice = roleSpec?.voice ?? voice;
  const resolvedWeight = roleSpec?.weight ?? weight;
  const resolvedSize = roleSpec?.size ?? size;
  const resolvedLineHeight = lineHeight ?? (roleSpec ? roleSpec.size * roleSpec.leading : undefined);
  const wantsItalic = italic || flattenedStyle?.fontStyle === 'italic';
  const scaledSize = scaleTypography(resolvedSize, resolvedVoice);
  const scaledLineHeight = resolvedLineHeight
    ? scaleTypography(resolvedLineHeight, resolvedVoice)
    : Math.round(scaledSize * (resolvedVoice === 'reader' ? 1.55 : 1.35));

  const baseStyle: TextStyle = {
    color,
    fontFamily: fontFor(resolvedVoice, resolvedWeight, wantsItalic),
    fontSize: scaledSize,
    letterSpacing: roleSpec?.tracking,
    lineHeight: scaledLineHeight,
  };

  const shouldUppercase = roleSpec && 'uppercase' in roleSpec && roleSpec.uppercase;
  const textProps = shouldUppercase && typeof props.children === 'string'
    ? { ...props, children: props.children.toUpperCase() }
    : props;

  return <Text {...textProps} style={[baseStyle, style]} />;
}
