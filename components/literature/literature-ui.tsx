// Shared Literature building blocks (redesign 3.0), per hifi-literature.jsx:
//  • BigBookCover — the 4th-ed. cover photo (assets/images/bigbook.webp)
//  • TwelveCover  — a styled lavender gradient cover for the 12 & 12
//  • MeetingReadingCard — color-spined card linking to a single reading
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { fontFamily, getSemanticColors } from '@/constants/designTokens';
import type { MeetingReading } from '@/constants/meeting-readings';

const c = getSemanticColors('light');
const BIGBOOK_COVER = require('@/assets/images/bigbook.webp');
const TWELVE_COVER = require('@/assets/images/12x12.webp');

export function BigBookCover({ w = 92, h = 128 }: { w?: number; h?: number }) {
  return (
    <View style={[styles.cover, { width: w, height: h, backgroundColor: '#3A5FA0' }]}>
      <Image source={BIGBOOK_COVER} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

export function TwelveCover({ w = 92, h = 128 }: { w?: number; h?: number }) {
  return (
    <View style={[styles.cover, { width: w, height: h, backgroundColor: '#DCE7F2' }]}>
      <Image source={TWELVE_COVER} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

export function MeetingReadingCard({ reading, onPress }: { reading: MeetingReading; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={[styles.spine, { backgroundColor: reading.tone }]} />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{reading.title}</Text>
        <Text style={styles.cardSource}>{reading.source}</Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#1F3A4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },

  flex: { flex: 1, minWidth: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 13 },
  spine: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
  cardTitle: { fontFamily: fontFamily.display, fontSize: 16, color: c.text, letterSpacing: -0.1 },
  cardSource: { fontFamily: fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 3 },
});
