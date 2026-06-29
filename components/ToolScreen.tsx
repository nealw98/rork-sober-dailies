// Shared chrome for the writing tools (Gratitude, Nightly Review, Spot Check).
// Mirrors the prototype's ToolHeader (large ScreenHeader + Save/Cancel) and
// ToolIntro (quote card with a left accent border, Lora italic). See
// hifi-tools-four.jsx. Light-mode only, matching the other redesign screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';
import BackButton from '@/components/BackButton';

const c = getSemanticColors('light');

export type ToolMeta = { id: string; label: string; accent: string; soft: string; dark: string };

// Per-tool tones — accent/soft/dark per the prototype's TOOL map.
export const TOOLS = {
  gratitude: { id: 'gratitude', label: 'Gratitude', accent: colors.accent, soft: colors.accentSoft, dark: colors.accentDark },         // terracotta
  nightly: { id: 'nightly', label: 'Nightly Review', accent: colors.tertiary, soft: colors.tertiarySoft, dark: colors.tertiaryDark },  // periwinkle
  spotcheck: { id: 'spotcheck', label: 'Spot Check Inventory', accent: colors.accent, soft: colors.accentSoft, dark: colors.accentDark }, // terracotta
  journal: { id: 'journal', label: 'Journal', accent: colors.primary, soft: colors.primarySoft, dark: colors.primaryDark },             // teal
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

// Quote / framing card — soft tinted background, 3px accent left border, italic serif.
export function ToolIntro({ tool, children }: { tool: ToolMeta; children: React.ReactNode }) {
  return (
    <View style={styles.introWrap}>
      <View style={[styles.introCard, { backgroundColor: tool.soft + '66', borderLeftColor: tool.accent }]}>
        <Text style={styles.introText}>{children}</Text>
      </View>
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

  introWrap: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 22 },
  introCard: { borderLeftWidth: 3, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4 },
  introText: { fontFamily: fontFamily.serifItalic, fontSize: 14, lineHeight: 20, color: c.textSecondary },
});
