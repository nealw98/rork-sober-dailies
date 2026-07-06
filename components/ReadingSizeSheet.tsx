// Shared "Aa" reading-size control. Used by every reader (Daily Reflection,
// Big Book, prayers) — a bottom sheet with the Apple-Body ladder rendered as
// growing "A" glyphs (the iOS convention). All instances write to the one
// shared reading size (see hooks/use-reading-size), so it's a single setting
// surfaced wherever you read. Only reading text changes; chrome is untouched.
import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useReadingSize, READING_SIZE_STEPS } from '@/hooks/use-reading-size';

export function ReadingSizeSheet({
  visible,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  bottomInset: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const { readingSize, setReadingSize } = useReadingSize();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: bottomInset + 28 }]}>
        <View style={styles.grabber} />
        <Text style={styles.label}>TEXT SIZE</Text>
        <View style={styles.row}>
          {READING_SIZE_STEPS.map((step, i) => {
            const on = step === readingSize;
            // The "A" grows across the row to preview the ladder (iOS-style),
            // independent of the actual reading pt it sets.
            const glyph = 13 + i * 3; // 13,16,19,22,25
            return (
              <Pressable
                key={step}
                onPress={() => setReadingSize(step)}
                style={[styles.btn, on ? { backgroundColor: colors.primary } : styles.btnOff]}
                accessibilityRole="button"
                accessibilityState={on ? { selected: true } : {}}
                accessibilityLabel={`Text size ${step === READING_SIZE_STEPS[0] ? 'smallest' : step === READING_SIZE_STEPS[READING_SIZE_STEPS.length - 1] ? 'largest' : `${step} point`}`}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.glyph, { fontSize: glyph, color: on ? (isDark ? '#0B0C0E' : '#fff') : c.textSecondary }]}
                >
                  A
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.done} onPress={onClose} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? c.overlay : 'rgba(26,26,46,0.32)' },
    // Top hairline + elevation (no negative-offset shadow — that doesn't render
    // on Android) so the sheet reads as raised on both platforms.
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: c.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderTopWidth: isDark ? 1 : 0, borderColor: 'rgba(255,255,255,0.10)',
      paddingHorizontal: 20, paddingTop: 14,
      ...shadows.lg,
    },
    grabber: { width: 40, height: 4, borderRadius: 999, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    label: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnOff: { borderWidth: 1, borderColor: c.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : c.background },
    glyph: { fontFamily: fontFamily.bold, letterSpacing: -0.2 },
    done: { marginTop: 22, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    doneText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
  });
};
