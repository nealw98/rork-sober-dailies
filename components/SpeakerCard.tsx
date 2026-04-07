import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import type { Speaker } from '@/hooks/useSpeakers';
import { EqualizerOverlay } from './EqualizerOverlay';
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
  isActive?: boolean;
  isPlaying?: boolean;
  isDownloaded?: boolean;
}

function SpeakerCardInner({ speaker, onPress, isActive = false, isPlaying = false, isDownloaded = false }: SpeakerCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.cardOuter}
    >
      <View style={styles.cardInner}>
        {/* Top — purple with name + hometown + playback badge */}
        <View style={styles.topSection}>
          {isActive && (
            <View style={styles.playbackBadge}>
              <View style={styles.equalizerInline}>
                <EqualizerOverlay isPlaying={isPlaying} barCount={3} barColor={colors.white} />
              </View>
              <Text style={styles.playbackLabel}>
                {isPlaying ? 'Now Playing' : 'Paused'}
              </Text>
            </View>
          )}
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
          {isDownloaded && (
            <View style={styles.downloadedDot}>
              <ArrowDown size={14} color={colors.tertiaryDark} strokeWidth={3} />
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );
}

export const SpeakerCard = React.memo(SpeakerCardInner);

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardInner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  topSection: {
    backgroundColor: colors.tertiaryExtraDark,
    padding: spacing.lg,
  },
  playbackBadge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  equalizerInline: {
    width: 18,
    height: 16,
    position: 'relative',
  },
  playbackLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  downloadedDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tertiaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingRight: spacing.xl + spacing.sm,
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
