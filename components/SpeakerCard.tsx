import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import type { Speaker } from '@/hooks/useSpeakers';

interface SpeakerCardProps {
  speaker: Speaker;
  onPress: () => void;
}

function SpeakerCardInner({ speaker, onPress }: SpeakerCardProps) {
  const { palette } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBackground,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
              {speaker.speaker}
            </Text>
            <Text style={[styles.hometown, { color: palette.muted }]} numberOfLines={1}>
              {speaker.hometown}
            </Text>
          </View>
          <Ionicons name="play-circle-outline" size={32} color={palette.tint} />
        </View>

        <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
          {speaker.title}
        </Text>

        {speaker.quote ? (
          <Text style={[styles.quotePreview, { color: palette.muted }]} numberOfLines={1}>
            &ldquo;{speaker.quote}&rdquo;
          </Text>
        ) : null}

        {speaker.explicit && (
          <View style={styles.meta}>
            <View style={[styles.explicitBadge, { backgroundColor: palette.muted }]}>
              <Text style={styles.explicitText}>E</Text>
            </View>
          </View>
        )}

      </View>
    </TouchableOpacity>
  );
}

export const SpeakerCard = React.memo(SpeakerCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
  hometown: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: adjustFontWeight('700'),
    marginBottom: 4,
  },
  quotePreview: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explicitBadge: {
    width: 18,
    height: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: adjustFontWeight('700'),
  },
});
