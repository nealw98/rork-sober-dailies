// Shared Literature building blocks (redesign 3.0), per hifi-literature.jsx:
//  • BigBookCover — the 4th-ed. cover photo (assets/images/bigbook.webp)
//  • TwelveCover  — a styled lavender gradient cover for the 12 & 12
//  • MeetingReadingCard — color-spined card linking to a single reading
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import type { MeetingReading } from '@/constants/meeting-readings';

const BIGBOOK_COVER = require('@/assets/images/bigbook.webp');
const TWELVE_COVER = require('@/assets/images/12x12.webp');

export function BigBookCover({ w = 92, h = 128 }: { w?: number; h?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.cover, { width: w, height: h, backgroundColor: '#3A5FA0' }]}>
      <Image source={BIGBOOK_COVER} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

export function TwelveCover({ w = 92, h = 128 }: { w?: number; h?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.cover, { width: w, height: h, backgroundColor: '#DCE7F2' }]}>
      <Image source={TWELVE_COVER} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

// A "find tool" feature card (Search / Go to page / Bookmarks) used on the book
// Contents pages. `accent`/`soft` tint it per book (amber for Big Book, lavender
// for 12 & 12). `variant="outline"` draws the card as a white surface with a
// hairline instead of a soft fill — for pages that sit the row on a tinted band.
export function FindCard({ Icon, label, count, accent, soft, variant = 'soft', onPress }: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  count?: number;
  accent: string;
  soft: string;
  variant?: 'soft' | 'outline';
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.findCard,
        variant === 'outline' ? styles.findCardOutline : { backgroundColor: soft },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View>
        <Icon size={20} color={accent} strokeWidth={2} />
        {count != null && count > 0 && (
          <View style={[styles.findBadge, { backgroundColor: accent }]}><Text style={styles.findBadgeText}>{count}</Text></View>
        )}
      </View>
      <Text style={[styles.findLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

export function MeetingReadingCard({ reading, onPress }: { reading: MeetingReading; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={[styles.spine, { backgroundColor: reading.tone }]} />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{reading.title}</Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  // Cheap dark-card treatment for the repeated reading rows.
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
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
    findCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14 },
    findCardOutline: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    findLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5 },
    findBadge: { position: 'absolute', top: -7, right: -12, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    findBadgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 13, ...darkCard },
    spine: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
    cardTitle: { fontFamily: fontFamily.display, fontSize: 16, color: c.text, letterSpacing: -0.1 },
  });
};
