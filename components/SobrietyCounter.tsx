import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Pencil } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { formatStoredDateForDisplay, parseLocalDate } from '@/lib/dateUtils';
import { colors, fontFamily, fontSize, radii, shadows, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');

// Brand sunrise glyph (matches the tab bar) — used in the no-date coin.
function SunriseGlyph({ size = 38, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.6v2.5" />
      <Path d="M5.9 6 7.7 7.8" />
      <Path d="M18.1 6 16.3 7.8" />
      <Path d="M7.4 14.5a4.6 4.6 0 0 1 9.2 0" />
      <Path d="M3.5 19q8.5-2.9 17 0" />
    </Svg>
  );
}

// 84px sobriety coin — teal sheen, inset ring, soft glow.
function Coin({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.coinWrap}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.coin}>
        <View style={styles.coinRing} pointerEvents="none" />
        {children}
      </LinearGradient>
    </View>
  );
}

const SobrietyCounter = () => {
  const router = useRouter();
  const { sobrietyDate, shouldShowPrompt, shouldShowAddButton, dismissPrompt, calculateDaysSober, isLoading } = useSobriety();
  const openDate = () => router.push('/(main)/sober-date');

  if (isLoading) return null;

  // ── No date, first invitation (soft, never a demand) ──
  if (shouldShowPrompt()) {
    return (
      <View style={styles.inviteCard}>
        <Text style={styles.affirmation}>One day at a time.</Text>
        <Text style={styles.inviteBody}>Counting days helps some people. Add your sober date whenever you’re ready — no pressure.</Text>
        <View style={styles.inviteButtons}>
          <Pressable style={styles.addPill} onPress={openDate}>
            <Text style={styles.addPillText}>Add date</Text>
          </Pressable>
          <Pressable style={styles.notNowPill} onPress={() => dismissPrompt()}>
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── No date, after "Not now" — quiet affirmation + a way back in ──
  if (shouldShowAddButton()) {
    return (
      <Pressable style={styles.row} onPress={openDate}>
        <Coin>
          <SunriseGlyph size={38} />
        </Coin>
        <View style={styles.rowText}>
          <Text style={styles.affirmationInline}>One day at a time.</Text>
          <Pencil size={13} color={c.textMuted} strokeWidth={2} />
        </View>
      </Pressable>
    );
  }

  // ── Date set — the MEDALLION ──
  if (sobrietyDate) {
    const totalDays = calculateDaysSober();
    const days = typeof totalDays === 'number' && !isNaN(totalDays) ? totalDays : 0;
    const start = parseLocalDate(sobrietyDate);
    const now = new Date();
    let y = now.getFullYear() - start.getFullYear();
    let m = now.getMonth() - start.getMonth();
    let d = now.getDate() - start.getDate();
    if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y -= 1; m += 12; }
    // Size to the rendered (comma'd) string; adjustsFontSizeToFit catches the rest.
    const display = days.toLocaleString();
    const coinFont = display.length <= 3 ? 30 : display.length <= 5 ? 22 : display.length === 6 ? 18 : 15;

    return (
      <Pressable style={styles.row} onPress={openDate}>
        <Coin>
          <Text style={[styles.coinNumber, { fontSize: coinFont }]} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
        </Coin>
        <View style={styles.rowText}>
          <View style={styles.daysSoberRow}>
            <Text style={styles.daysSober}>days sober</Text>
            <Pencil size={12} color={c.textMuted} strokeWidth={2} />
          </View>
          <Text style={styles.breakdown}>{y} years · {m} months · {d} days</Text>
          <Text style={styles.breakdown}>since {formatStoredDateForDisplay(sobrietyDate)}</Text>
        </View>
      </Pressable>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 4 },
  rowText: { flex: 1, minWidth: 0 },

  // coin
  coinWrap: { width: 84, height: 84, borderRadius: 42, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  coin: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  coinRing: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 36, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.42)' },
  coinNumber: { fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'], maxWidth: 66, textAlign: 'center' },

  // medallion text
  daysSoberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysSober: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize.xl, color: colors.primary },
  breakdown: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 5, lineHeight: 18 },

  // affirmation (no-date)
  affirmationInline: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize['3xl'], color: colors.primary, lineHeight: 28 },

  // invitation card
  inviteCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: 18, ...shadows.sm },
  affirmation: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize['3xl'], color: colors.primary, lineHeight: 28 },
  inviteBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textMuted, marginTop: 6, lineHeight: 20 },
  inviteButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  addPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.primary },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: '#fff' },
  notNowPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radii.full, borderWidth: 1.5, borderColor: c.border },
  notNowText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: c.textSecondary },
});

export default SobrietyCounter;
