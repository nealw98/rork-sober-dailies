import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { adjustFontWeight } from '@/constants/fonts';
import type { Speaker } from '@/hooks/useSpeakers';

// Speaker accent colors — shared with SpeakerPlayer
const SPEAKER_ACCENT = '#8B6AC0';
const SPEAKER_ACCENT_DARK = '#7A5AAA';
const SPEAKER_ACCENT_DEEPSEA = '#3E5C76';

interface SpeakerCardProps {
  speaker: Speaker;
  onPress: () => void;
}

function SpeakerCardInner({ speaker, onPress }: SpeakerCardProps) {
  const { palette } = useTheme();

  const isDeepSea = (palette.heroTiles as any)?.speakers?.[0] === '#3E5C76';
  const isDark = palette.background !== '#fff';
  const accentColor = isDeepSea ? SPEAKER_ACCENT_DEEPSEA : (isDark ? SPEAKER_ACCENT_DARK : SPEAKER_ACCENT);

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
          <Ionicons name="play-circle-outline" size={32} color={accentColor} />
        </View>

        <Text style={[styles.title, { color: accentColor }]} numberOfLines={2}>
          {speaker.title}
        </Text>

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
    fontSize: 18,
    fontWeight: adjustFontWeight('700'),
  },
  hometown: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    marginBottom: 4,
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
