import React, { useMemo } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTextSettings } from '@/hooks/use-text-settings';
import { semanticColors } from '@/constants/designTokens';
import {
  typography,
  roleInk,
  SCALING_ROLES,
  TypographyRole,
  InkRole,
} from '@/constants/typography';

/**
 * AppText — the single text primitive for the 3.0 redesign.
 *
 * Pick a semantic `variant` from the type scale (constants/typography.ts) instead of
 * setting fontFamily/fontSize by hand. It resolves:
 *   • the right font family + size + spacing for the role,
 *   • the 3-level ink color, theme-aware (light/dark) via the prototype palette,
 *   • reading-surface scaling from the user's Text Size setting.
 *
 * Examples:
 *   <AppText variant="pageTitle">Your Day</AppText>
 *   <AppText variant="readingBody">We claim spiritual progress…</AppText>
 *   <AppText variant="caption" color="ink3">Sunday · Jun 14</AppText>
 *   <AppText variant="button" color="inverse">Mark as done</AppText>
 */

type ColorToken = InkRole | 'accent' | 'inverse';

export interface AppTextProps extends TextProps {
  /** Semantic role from the type scale. Defaults to `body`. */
  variant?: TypographyRole;
  /** Override the default ink color: an ink level, `accent`, `inverse`, or a raw color string. */
  color?: ColorToken | (string & {});
  /** Force reading-scale on/off. Defaults to on for reading roles, off otherwise. */
  scales?: boolean;
  /** Convenience for textAlign: 'center'. */
  center?: boolean;
}

export default function AppText({
  variant = 'body',
  color,
  scales,
  center,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { effectiveScheme, palette } = useTheme();
  const { fontSize: readSize, lineHeightMultiplier } = useTextSettings();

  const resolved = useMemo<TextStyle>(() => {
    const preset = typography[variant];
    const sc = semanticColors[effectiveScheme] ?? semanticColors.light;
    const inkMap: Record<InkRole, string> = {
      ink: sc.text,
      ink2: sc.textSecondary,
      ink3: sc.textMuted,
    };

    // Resolve color: explicit prop wins, else the role's default ink level.
    const key = color ?? roleInk[variant];
    let colorValue: string;
    if (key === 'accent') colorValue = palette.tint;
    else if (key === 'inverse') colorValue = '#FFFFFF';
    else if (key === 'ink' || key === 'ink2' || key === 'ink3') colorValue = inkMap[key as InkRole];
    else colorValue = key; // raw color string

    // Reading surfaces follow the user's Text Size setting.
    const shouldScale = scales ?? SCALING_ROLES.has(variant);
    const sizeOverride: TextStyle | null = shouldScale
      ? { fontSize: readSize, lineHeight: Math.round(readSize * lineHeightMultiplier) }
      : null;

    return {
      ...preset,
      color: colorValue,
      ...(center ? { textAlign: 'center' as const } : null),
      ...sizeOverride,
    };
  }, [variant, color, scales, center, effectiveScheme, palette.tint, readSize, lineHeightMultiplier]);

  return (
    <Text style={[resolved, style]} {...rest}>
      {children}
    </Text>
  );
}
