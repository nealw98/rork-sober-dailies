import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Pencil } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { formatStoredDateForDisplay, parseLocalDate } from '@/lib/dateUtils';
import { colors, fontFamily, fontSize, darkGlow, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

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

// 84px sobriety coin — teal sheen, inset ring, soft glow. The gradient is the
// same full-chroma teal in both modes (it's a "jewel" — Dark Mode Handoff);
// on dark the drop shadow becomes a luminous teal glow, strongest on OLED.
function Coin({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const router = useRouter();
  const { sobrietyDate, calculateDaysSober, isLoading } = useSobriety();
  const openDate = () => router.push('/(main)/sober-date');

  if (isLoading) return null;

  // ── No date — quiet affirmation + a way back in ──
  if (!sobrietyDate) {
    return (
      <Pressable style={styles.row} onPress={openDate}>
        <Coin>
          <SunriseGlyph size={38} />
        </Coin>
        <View style={styles.rowText}>
          <View style={styles.affirmationRow}>
            <Text style={styles.affirmationInline}>One day at a time.</Text>
            <Pencil size={13} color={c.textMuted} strokeWidth={2} />
          </View>
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
          <Text style={styles.breakdown}>{y} {y === 1 ? 'year' : 'years'} · {m} {m === 1 ? 'month' : 'months'} · {d} {d === 1 ? 'day' : 'days'}</Text>
          <Text style={styles.breakdown}>since {formatStoredDateForDisplay(sobrietyDate)}</Text>
        </View>
      </Pressable>
    );
  }
};

const makeStyles = (tk: Tokens) => {
  const { c, isDark, colors: tc } = tk;
  return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 4 },
  rowText: { flex: 1, minWidth: 0 },

  // coin
  coinWrap: {
    width: 84, height: 84, borderRadius: 42,
    ...(isDark
      ? darkGlow.coin
      : { shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }),
  },
  coin: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  coinRing: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 36, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.42)' },
  coinNumber: { fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'], maxWidth: 66, textAlign: 'center' },

  // medallion text
  daysSoberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysSober: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize.xl, color: tc.primary },
  // Tight leading so the three lines read as one visual block.
  breakdown: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 2, lineHeight: 16 },

  // affirmation (no-date)
  affirmationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  affirmationInline: { fontFamily: fontFamily.serifMediumItalic, fontSize: fontSize['2xl'], color: tc.primary, lineHeight: 26 },

  });
};

export default SobrietyCounter;
