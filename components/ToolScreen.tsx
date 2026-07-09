// Shared chrome for the writing tools (Gratitude, Nightly Review, Spot Check).
// Mirrors the prototype's ToolHeader (large ScreenHeader + Save/Cancel) and
// ToolIntro (quote card with a left accent border, Lora italic). See
// hifi-tools-four.jsx. Mode-aware: light renders exactly as before; on dark the
// tool accents brighten via the family tones.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontFamily, families, type Tokens, type FamilyName } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';

export type ToolMeta = { id: string; label: string; accent: string; soft: string; dark: string };

// Per-tool tones — accent/soft/dark per the prototype's TOOL map.
export const TOOLS = {
  // `soft` is the intro-pill tint, bumped +2 ramp steps (100 → 300) for more color.
  gratitude: { id: 'gratitude', label: 'Gratitude', accent: colors.accent, soft: families.terracotta[300], dark: colors.accentDark },         // terracotta
  nightly: { id: 'nightly', label: 'Nightly Review', accent: colors.tertiary, soft: families.periwinkle[300], dark: colors.tertiaryDark },     // periwinkle
  spotcheck: { id: 'spotcheck', label: 'Spot Check Inventory', accent: colors.accent, soft: families.terracotta[300], dark: colors.accentDark }, // terracotta
  journal: { id: 'journal', label: 'Journal', accent: colors.primary, soft: families.teal[300], dark: colors.primaryDark },                   // teal
} satisfies Record<string, ToolMeta>;

// Tool → color family, so accents can brighten on dark (light keeps tool.accent).
const TOOL_FAMILY: Record<string, FamilyName> = {
  gratitude: 'terracotta',
  spotcheck: 'terracotta',
  nightly: 'periwinkle',
  journal: 'teal',
};

function useToolAccent(tool: ToolMeta): string {
  const { isDark, tone } = useTokens();
  if (!isDark) return tool.accent;
  const family = TOOL_FAMILY[tool.id] ?? 'teal';
  return tone(family).base;
}

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
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const accent = useToolAccent(tool);
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.backRow}>
        <BackButton onPress={() => router.back()} />
        <Pressable
          onPress={onCommit}
          accessibilityRole="button"
          accessibilityLabel={dirty ? 'Save' : 'Cancel'}
          style={[styles.saveBtn, dirty ? { backgroundColor: accent } : styles.saveBtnGhost]}
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
  const styles = useThemedStyles(makeStyles);
  const accent = useToolAccent(tool);
  if (variant === 'mark') {
    return (
      <View style={styles.introWrap}>
        <Text style={[styles.introMark, { color: accent }]}>&ldquo;</Text>
        <Text style={styles.introQuote}>{children}</Text>
      </View>
    );
  }
  if (variant === 'rule') {
    return (
      <View style={styles.introWrap}>
        <View style={[styles.introRule, { backgroundColor: accent }]} />
        <Text style={styles.introLine}>{children}</Text>
      </View>
    );
  }
  if (variant === 'bar') {
    return (
      <View style={[styles.introWrap, styles.introBarRow]}>
        <View style={[styles.introBar, { backgroundColor: accent }]} />
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

const makeStyles = (tk: Tokens) => {
  const { c } = tk;
  return StyleSheet.create({
    header: { paddingHorizontal: 22, paddingBottom: 28 },
    backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    saveBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
    saveBtnGhost: { borderWidth: 1.5, borderColor: c.border },
    saveText: { fontFamily: fontFamily.semiBold, fontSize: 13.5 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    subtitle: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 3 },

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
};
