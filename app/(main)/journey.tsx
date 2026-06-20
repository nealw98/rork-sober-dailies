import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import {
  redesignColors,
  redesignRadii,
  redesignShadows,
  redesignSpacing,
} from '@/constants/redesignTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  useScreenTimeTracking('Journey');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + redesignSpacing.lg },
      ]}
    >
      <AppText voice="display" weight="bold" size={30}>
        Journey
      </AppText>
      <AppText
        size={15}
        color={redesignColors.inkSecondary}
        style={styles.subtitle}
      >
        Your path of recovery.
      </AppText>

      <View style={styles.placeholderCard}>
        <AppText voice="reader" size={18} style={styles.quote}>
          “Progress grows one day at a time.”
        </AppText>
        <AppText size={14} color={redesignColors.inkSecondary}>
          Your daily history and trends will take shape here as the next phases
          connect your dailies and writing tools.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: redesignColors.warmWhite,
  },
  content: {
    paddingHorizontal: redesignSpacing.xl,
    paddingBottom: 120,
  },
  subtitle: {
    marginTop: 2,
  },
  placeholderCard: {
    marginTop: redesignSpacing.xxl,
    padding: redesignSpacing.xl,
    gap: redesignSpacing.md,
    borderRadius: redesignRadii.lg,
    backgroundColor: redesignColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: redesignColors.border,
    ...redesignShadows.soft,
  },
  quote: {
    color: redesignColors.teal,
  },
});
