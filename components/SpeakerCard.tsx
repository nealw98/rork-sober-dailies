import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import type { Speaker } from '@/hooks/useSpeakers';
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
} from '@/constants/designTokens';

const sem = semanticColors.light;

interface SpeakerCardProps {
  speaker: Speaker;
  onPress: () => void;
}

function SpeakerCardInner({ speaker, onPress }: SpeakerCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.cardOuter}
    >
      <View style={styles.cardInner}>
        {/* Top — purple with name + hometown */}
        <View style={styles.topSection}>
          <Text style={styles.name} numberOfLines={1}>
            {speaker.speaker}
          </Text>
          <Text style={styles.hometown} numberOfLines={1}>
            {speaker.hometown}
          </Text>
        </View>

        {/* Bottom — white with talk title */}
        <View style={styles.bottomSection}>
          <Text style={styles.title} numberOfLines={2}>
            {speaker.title}
          </Text>
          {(speaker.date || speaker.meeting) && (
            <Text style={styles.talkMeta}>
              {[
                speaker.meeting,
                speaker.date && new Date(speaker.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              ].filter(Boolean).join(' • ')}
            </Text>
          )}
          {speaker.explicit && (
            <View style={styles.explicitBadge}>
              <Text style={styles.explicitText}>E</Text>
            </View>
          )}
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar} />
      </View>
    </TouchableOpacity>
  );
}

export const SpeakerCard = React.memo(SpeakerCardInner);

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
    backgroundColor: colors.white,
  },
  cardInner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  topSection: {
    backgroundColor: colors.tertiary,
    padding: spacing.lg,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    color: colors.white,
    marginBottom: 2,
  },
  hometown: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bottomBar: {
    height: 14,
    backgroundColor: colors.tertiary,
  },
  bottomSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    minHeight: 120,
  },
  talkMeta: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: sem.textMuted,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.tertiaryDark,
  },
  explicitBadge: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: sem.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  explicitText: {
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
