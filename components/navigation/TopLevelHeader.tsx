import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Menu } from 'lucide-react-native';
import { useHamburgerMenu } from '@/hooks/useHamburgerMenu';
import {
  colors,
  semanticColors,
  spacing,
  fontFamily,
  fontSize,
} from '@/constants/designTokens';

const sem = semanticColors.light;

interface TopLevelHeaderProps {
  title?: string;
  light?: boolean; // true = white icons/text for colored backgrounds
}

export default function TopLevelHeader({ title, light = false }: TopLevelHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { open } = useHamburgerMenu();
  const iconColor = light ? colors.white : sem.text;

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {/* Home icon */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => router.push('/(main)/')}
        activeOpacity={0.7}
      >
        <Home size={22} color={iconColor} />
      </TouchableOpacity>

      {/* Title */}
      {title && (
        <Text style={[styles.title, light && { color: colors.white }]} numberOfLines={1}>
          {title}
        </Text>
      )}

      {/* Hamburger */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={open}
        activeOpacity={0.7}
      >
        <Menu size={22} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: sem.text,
    flex: 1,
    textAlign: 'center',
  },
});
