import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { fontFamily, fontSize, shadows, getSemanticColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';

/**
 * Sober-date screen (prototype `ObvSoberDate`). A full screen — typed mm/dd/yyyy
 * entry with a live day-count preview, sized for the shippable RN text-field +
 * numeric keypad. Reused by the Today/Settings editor AND the onboarding step;
 * callers decide what Save does and whether to show Remove (editor) or Skip
 * (onboarding).
 */

// The date field sits on a white pill inside the teal card in BOTH modes, so its
// ink/placeholder stay the light-mode values.
const lightC = getSemanticColors('light');

function formatDateInput(text: string) {
  const n = text.replace(/\D/g, '');
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4, 8)}`;
}

function parseValid(s: string): Date | null {
  if (!s || s.length < 10 || !/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null;
  const [m, d, y] = s.split('/').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return date <= end ? date : null;
}

function ymdLabel(date: Date): string {
  const now = new Date();
  let y = now.getFullYear() - date.getFullYear();
  let m = now.getMonth() - date.getMonth();
  let d = now.getDate() - date.getDate();
  if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y -= 1; m += 12; }
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
  parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
  return parts.join(' · ');
}

export interface SoberDateEditorProps {
  current: Date | null;
  onSave: (date: Date) => void;
  // Optional: the first-run setup steps come AFTER the purchase, so there is
  // nowhere to go back to from there.
  onBack?: () => void;
  onRemove?: () => void;
  onSkip?: () => void;
  primaryLabel?: string;
  skipLabel?: string;
  // First-run only: frames the screen as setting up the subscription the user
  // has just started, rather than as a gate in front of it.
  overline?: string;
}

export default function SoberDateEditor({ current, onSave, onBack, onRemove, onSkip, primaryLabel = 'Save date', skipLabel, overline }: SoberDateEditorProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const initial = current
    ? `${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')}/${current.getFullYear()}`
    : '';
  const [value, setValue] = useState(initial);
  const parsed = parseValid(value);
  const valid = parsed !== null;
  const badDate = value.length === 10 && !valid;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          {onBack && <BackButton onPress={onBack} />}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!overline && <Text style={styles.overline}>{overline}</Text>}
          <Text style={styles.affirmation}>One day at a time.</Text>
          <Text style={styles.heading}>What&apos;s your{'\n'}sobriety date?</Text>
          <Text style={styles.body}>
            Counting days helps some people stay grounded. There&apos;s no pressure — add it now or anytime later, and change it whenever you need.
          </Text>

          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.cardLabel}>SOBRIETY DATE</Text>
            <TextInput
              style={[styles.input, badDate && styles.inputBad]}
              value={value}
              onChangeText={(t) => setValue(formatDateInput(t))}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={lightC.textMuted}
              keyboardType="numeric"
              maxLength={10}
            />
            <View style={styles.preview}>
              {valid && <Text style={styles.previewText}>{ymdLabel(parsed)}</Text>}
              {badDate && <Text style={styles.previewBad}>That&apos;s not a valid date</Text>}
            </View>
          </LinearGradient>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !valid && styles.saveBtnDisabled]}
            onPress={() => parsed && onSave(parsed)}
            disabled={!valid}
          >
            <Text style={styles.saveText}>{primaryLabel}</Text>
            <ArrowRight size={18} color="#fff" />
          </Pressable>
          {onRemove ? (
            <Pressable style={styles.ghost} onPress={onRemove}>
              <Text style={styles.ghostText}>Remove sober date</Text>
            </Pressable>
          ) : onSkip ? (
            <Pressable style={styles.ghost} onPress={onSkip}>
              <Text style={styles.ghostText}>{skipLabel ?? 'Skip for now'}</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    topBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },

    scroll: { paddingHorizontal: 26, paddingTop: 10, paddingBottom: 24 },
    overline: { fontFamily: fontFamily.semiBold, fontSize: 12, letterSpacing: 1.2, color: c.textMuted, marginBottom: 10 },
    affirmation: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize['3xl'], color: colors.primary, lineHeight: 28 },
    heading: { fontFamily: fontFamily.displayBold, fontSize: 29, color: c.text, letterSpacing: -0.6, lineHeight: 33, marginTop: 10 },
    body: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 22, marginTop: 12 },

    card: { borderRadius: 20, padding: 18, marginTop: 22, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
    cardLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 10 },
    // The input pill stays white with light ink in both modes (sits on the teal jewel).
    input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: 'transparent', paddingVertical: 14, paddingHorizontal: 16, fontFamily: fontFamily.medium, fontSize: 19, color: lightC.text, textAlign: 'center' },
    inputBad: { borderColor: '#E66A52' },
    preview: { minHeight: 34, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    previewText: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: '#fff' },
    previewBad: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: '#FFE3DB' },

    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
    saveBtnDisabled: { backgroundColor: isDark ? '#3A3D42' : '#C7C9C4', shadowOpacity: 0 },
    saveText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff' },
    ghost: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    ghostText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.textSecondary },
  });
};
