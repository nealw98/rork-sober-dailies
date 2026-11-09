import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Check, PenLine } from 'lucide-react-native';

import { fontFamily, radii, type Tokens } from '@/constants/designTokens';
import { useThemedStyles, useTokens } from '@/hooks/useTokens';

// The Daily Reflection's action row — Mark done (filled once done) and
// Journal about this. Shared by the Today reading pane (wide layouts) and the
// pushed reader. Completion stays manual, same rule as the Today list.
export default function ReflectionActions({ done, onToggleDone }: { done: boolean; onToggleDone: () => void }) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onToggleDone}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        style={[styles.doneBtn, done ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.primary }]}
      >
        {done && <Check size={14} color="#fff" strokeWidth={3} />}
        <Text style={[styles.doneBtnText, { color: done ? '#fff' : colors.primaryDark }]}>
          {done ? 'Done' : 'Mark done'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/(main)/journal' as Href)}
        accessibilityRole="button"
        style={styles.journalBtn}
      >
        <PenLine size={14} color={colors.primaryDark} strokeWidth={2} />
        <Text style={styles.journalText}>Journal about this</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 26 },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    doneBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14 },
    journalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radii.full,
      borderWidth: 1.5,
      borderColor: isDark ? c.border : colors.primaryDark + '55',
    },
    journalText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primaryDark },
  });
};
