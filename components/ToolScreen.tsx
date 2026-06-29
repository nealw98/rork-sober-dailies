// Shared chrome for the writing tools (Gratitude, Nightly Review, Spot Check).
// Mirrors the prototype's ToolHeader (large ScreenHeader + Save/Cancel) and
// ToolIntro (quote card with a left accent border, Lora italic). See
// hifi-tools-four.jsx. Light-mode only, matching the other redesign screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontFamily, getSemanticColors, families } from '@/constants/designTokens';
import BackButton from '@/components/BackButton';

const c = getSemanticColors('light');

export type ToolMeta = { id: string; label: string; accent: string; soft: string; dark: string };

// Per-tool tones — accent/soft/dark per the prototype's TOOL map.
export const TOOLS = {
  // `soft` is the intro-pill tint, bumped +2 ramp steps (100 → 300) for more color.
  gratitude: { id: 'gratitude', label: 'Gratitude', accent: colors.accent, soft: families.terracotta[300], dark: colors.accentDark },         // terracotta
  nightly: { id: 'nightly', label: 'Nightly Review', accent: colors.tertiary, soft: families.periwinkle[300], dark: colors.tertiaryDark },     // periwinkle
  spotcheck: { id: 'spotcheck', label: 'Spot Check Inventory', accent: colors.accent, soft: families.terracotta[300], dark: colors.accentDark }, // terracotta
  journal: { id: 'journal', label: 'Journal', accent: colors.primary, soft: families.teal[300], dark: colors.primaryDark },                   // teal
} satisfies Record<string, ToolMeta>;

// The "today" subtitle shown under each tool title.
export function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Large header: back chevron + Save/Cancel pill, then the tool title + date.
// The pill reads "Cancel" (ghost) until the entry is dirty, then "Save"
// (filled). Both invoke onCommit, which saves when dirty and always goes back.
export function ToolHeader({ tool, dirty, onCommit }: { tool: ToolMeta; dirty: boolean; onCommit: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.backRow}>
        <BackButton onPress={() => router.back()} />
        <Pressable
          onPress={onCommit}
          accessibilityRole="button"
          accessibilityLabel={dirty ? 'Save' : 'Cancel'}
          style={[styles.saveBtn, dirty ? { backgroundColor: tool.accent } : styles.saveBtnGhost]}
        >
          <Text style={[styles.saveText, { color: dirty ? '#fff' : c.textSecondary }]}>{dirty ? 'Save' : 'Cancel'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{tool.label}</Text>
      <Text style={styles.subtitle}>{todayLabel()}</Text>
    </View>
  );
}

// Framing line above each tool — borderless (Inter). `variant` picks the accent
// treatment so the four workbook screens can be compared:
//   mark  — large accent quotation mark above the text (editorial)
//   rule  — short accent rule above the text
//   bar   — thin accent rule down the left (blockquote)
//   plain — quiet italic line, no accent
export type IntroVariant = 'plain' | 'mark' | 'rule' | 'bar';

export function ToolIntro({ tool, children, variant = 'plain' }: { tool: ToolMeta; children: React.ReactNode; variant?: IntroVariant }) {
  if (variant === 'mark') {
    return (
      <View style={styles.introWrap}>
        <Text style={[styles.introMark, { color: tool.accent }]}>&ldquo;</Text>
        <Text style={styles.introQuote}>{children}</Text>
      </View>
    );
  }
  if (variant === 'rule') {
    return (
      <View style={styles.introWrap}>
        <View style={[styles.introRule, { backgroundColor: tool.accent }]} />
        <Text style={styles.introLine}>{children}</Text>
      </View>
    );
  }
  if (variant === 'bar') {
    return (
      <View style={[styles.introWrap, styles.introBarRow]}>
        <View style={[styles.introBar, { backgroundColor: tool.accent }]} />
        <Text style={[styles.introLine, styles.introItalic, styles.introFlex]}>{children}</Text>
      </View>
    );
  }
  return (
    <View style={styles.introWrap}>
      <Text style={[styles.introLine, styles.introItalic, styles.introMuted]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  saveBtnGhost: { borderWidth: 1.5, borderColor: c.border },
  saveText: { fontFamily: fontFamily.semiBold, fontSize: 13.5 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },

  introWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  introLine: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24, color: c.text },
  introItalic: { fontFamily: fontFamily.regularItalic },
  introMuted: { color: c.textSecondary },
  introFlex: { flex: 1 },
  // mark
  introMark: { fontFamily: fontFamily.displayBold, fontSize: 42, lineHeight: 34, marginBottom: 2 },
  introQuote: { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 25, color: c.text },
  // rule
  introRule: { width: 34, height: 3, borderRadius: 2, marginBottom: 12 },
  // bar
  introBarRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  introBar: { width: 3, borderRadius: 2 },
});
