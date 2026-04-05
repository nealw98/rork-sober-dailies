import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import {
  semanticColors,
  spacing,
  fontFamily,
  fontSize,
} from '@/constants/designTokens';

const sem = semanticColors.light;

interface SubPageHeaderProps {
  title?: string;
  onBack?: () => void;
}

export default function SubPageHeader({ title, onBack }: SubPageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={handleBack}
        activeOpacity={0.7}
      >
        <ChevronLeft size={22} color={sem.text} />
      </TouchableOpacity>

      {/* Title */}
      {title && (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}

      {/* Spacer to balance layout */}
      <View style={styles.iconBtn} />
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
    backgroundColor: 'transparent',
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
