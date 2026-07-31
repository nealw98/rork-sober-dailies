// Shared Literature building blocks (redesign 3.0), per hifi-literature.jsx:
//  • BigBookCover — the 4th-ed. cover photo (assets/images/bigbook.webp)
//  • TwelveCover  — a styled lavender gradient cover for the 12 & 12
//  • MeetingReadingCard — color-spined card linking to a single reading
import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Search, Bookmark, Highlighter, X } from 'lucide-react-native';
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

// The find row on a book's Contents page: one search field plus circular icon
// buttons. Replaces the four large utility chips — same handlers, same modals,
// just a quieter row. `accent` is the book's family 700 tone (steel for the Big
// Book, teal for the 12 & 12). Translucent white rather than full white so the
// paper and the header band's warmth bleed through (0.8 — Neal, 2026-07-31),
// and the controls read as
// sitting IN the page rather than on it. `onHighlights` is omitted on books
// that don't support highlighting.
export function FindRow({ accent, query, onQueryChange, onBookmarks, onHighlights, highlightCount = 0 }: {
  accent: string;
  // A real field, live on the page — no search modal to open.
  query: string;
  onQueryChange: (next: string) => void;
  onBookmarks: () => void;
  onHighlights?: () => void;
  highlightCount?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  // The book's own colour at ~14%, so each book's row is tinted by its family
  // without the border ever competing with the text.
  const hairline = accent.startsWith('#') && accent.length === 7 ? `${accent}24` : accent;
  return (
    <View style={styles.findRow}>
      <View style={[styles.findField, { borderColor: hairline }]}>
        <Search size={17} color={accent} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search, or jump to a page…"
          placeholderTextColor={c.textMuted}
          style={[styles.findFieldText, { color: c.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search, or jump to a page"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQueryChange('')} hitSlop={10} accessibilityLabel="Clear search">
            <X size={16} color={c.textMuted} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onBookmarks}
        style={({ pressed }) => [styles.findCircle, { borderColor: hairline }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Bookmarks"
      >
        <Bookmark size={19} color={accent} strokeWidth={2} />
      </Pressable>

      {!!onHighlights && (
        <Pressable
          onPress={onHighlights}
          style={({ pressed }) => [styles.findCircle, { borderColor: hairline }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`Highlights${highlightCount > 0 ? `, ${highlightCount}` : ''}`}
        >
          <Highlighter size={19} color={accent} strokeWidth={2} />
          {highlightCount > 0 && (
            <View style={[styles.findCircleBadge, { backgroundColor: accent, borderColor: c.background }]}>
              <Text style={styles.findBadgeText}>{highlightCount}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
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
    // Find row — a 44pt line of controls, translucent so the page shows through.
    findRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    findField: {
      flex: 1, height: 44, borderRadius: 22, borderWidth: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)',
      flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15,
    },
    findFieldText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, paddingVertical: 0 },
    findCircle: {
      width: 44, height: 44, borderRadius: 22, borderWidth: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)',
      alignItems: 'center', justifyContent: 'center',
    },

    findCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14 },
    findCardOutline: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },
    findLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5 },
    findBadge: { position: 'absolute', top: -7, right: -12, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    // Badge for the circular button — rides the top-right edge, ringed in the
    // page colour so it reads as sitting above the circle.
    findCircleBadge: { position: 'absolute', top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    findBadgeText: { fontFamily: fontFamily.bold, fontSize: 10, color: '#fff' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 13, ...darkCard },
    spine: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
    cardTitle: { fontFamily: fontFamily.display, fontSize: 16, color: c.text, letterSpacing: -0.1 },
  });
};
