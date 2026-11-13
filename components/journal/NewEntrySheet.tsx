// NewEntrySheet — the Journal tab's "+" menu. A short bottom sheet listing the
// four writing tools; picking one closes the sheet and opens that tool, whose
// entries then land back in this Journal. Colors match each entry's tone in
// the Journal feed (terracotta gratitude / spot check, periwinkle nightly,
// teal journal).
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Heart, Moon, CircleCheck, NotebookPen } from 'lucide-react-native';
import { fontFamily, getColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import type { NotebookType } from '@/hooks/use-notebook';

type GlyphIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ENTRY_TYPES: { type: NotebookType; label: string; hint: string; Icon: GlyphIcon }[] = [
  { type: 'journal', label: 'Journal entry', hint: "Write whatever's on your mind.", Icon: NotebookPen },
  { type: 'gratitude', label: 'Gratitude list', hint: "What you're grateful for today.", Icon: Heart },
  { type: 'nightly', label: 'Nightly review', hint: 'Look back over the day.', Icon: Moon },
  { type: 'spotcheck', label: 'Spot check', hint: 'Pause and check in when disturbed.', Icon: CircleCheck },
];

const toneFor = (cs: ReturnType<typeof getColors>, type: NotebookType) =>
  type === 'journal' ? { ink: cs.primary, soft: cs.primarySoft }
    : type === 'nightly' ? { ink: cs.tertiary, soft: cs.tertiarySoft }
      : { ink: cs.accent, soft: cs.accentSoft };

export default function NewEntrySheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (type: NotebookType) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, mode } = useTokens();
  const cs = getColors(mode);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        {/* edges left/right: native Modals escape the root SideInsetGuard,
            so the sheet pads the Duo's side safe strips itself. */}
        <SafeAreaView edges={['left', 'right']} style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>New entry</Text>
          {ENTRY_TYPES.map(({ type, label, hint, Icon }) => {
            const tone = toneFor(cs, type);
            return (
              <Pressable
                key={type}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => onPick(type)}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <View style={[styles.icon, { backgroundColor: tone.soft }]}>
                  <Icon size={20} color={tone.ink} strokeWidth={2} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowHint}>{hint}</Text>
                </View>
                <ChevronRight size={18} color={c.textMuted} strokeWidth={2} />
              </Pressable>
            );
          })}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
    wrap: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: isDark ? c.overlay : 'rgba(20,20,30,0.35)' },
    sheet: {
      backgroundColor: isDark ? c.surface : c.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingHorizontal: 16,
      ...(isDark ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)', borderBottomWidth: 0 } : null),
    },
    grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 14 },
    title: { fontFamily: fontFamily.display, fontSize: 20, color: c.text, letterSpacing: -0.3, paddingHorizontal: 6, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16 },
    rowPressed: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
    icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    rowLabel: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
    rowHint: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
  });
};
