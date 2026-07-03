import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen } from 'lucide-react-native';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { useDailies } from '@/hooks/use-dailies-store';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { computeStreaks, computeInsights, monthHeatmap, monthLabel, monthShort, type StreakRow } from '@/lib/trends-analytics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const c = getSemanticColors('light');
const WEEK_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HEAT_FILL = ['#FFFFFF', colors.primarySoft, colors.primary, colors.primaryDark]; // level 0..3

function heatLevel(done: number, intensity: number): number {
  if (done === 0) return 0;
  if (intensity <= 0.34) return 1;
  if (intensity <= 0.67) return 2;
  return 3;
}

function StreakRowView({ row, last }: { row: StreakRow; last?: boolean }) {
  const tone = resolveTone(row.color ?? 'gray');
  const Glyph = row.id === '__reflection' ? BookOpen : resolveGlyph(row.icon ?? '');
  return (
    <View style={[styles.streakRow, !last && styles.rowBorder]}>
      <View style={[styles.streakIcon, { backgroundColor: tone.soft }]}>
        <Glyph size={15} color={tone.ink} strokeWidth={2} />
      </View>
      <Text style={styles.streakLabel} numberOfLines={1}>{row.label}</Text>
      <Text style={styles.streakDays}>
        <Text style={styles.streakNum}>{row.streak}</Text> {row.streak === 1 ? 'day' : 'days'}
      </Text>
    </View>
  );
}

function InsightRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.insightRow, !last && styles.rowBorder]}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

export default function TrendsScreen() {
  useScreenTimeTracking('Trends');
  const router = useRouter();
  const { program, completion } = useDailies();

  const streaks = useMemo(() => computeStreaks(program, completion), [program, completion]);
  const insights = useMemo(() => computeInsights(program, completion), [program, completion]);

  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const heat = useMemo(() => monthHeatmap(ym.year, ym.month, program, completion), [ym, program, completion]);
  const isCurrentMonth = ym.year === now.getFullYear() && ym.month === now.getMonth();

  const [expanded, setExpanded] = useState(false);
  const toggleStreaks = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const prevMonth = () => setYm(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const nextMonth = () => {
    if (isCurrentMonth) return;
    setYm(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  };
  const prevLbl = monthShort(ym.month === 0 ? 11 : ym.month - 1);
  const nextLbl = monthShort(ym.month === 11 ? 0 : ym.month + 1);
  const activeStreaks = useMemo(() => streaks.filter((s) => s.streak >= 1), [streaks]);
  const shown = expanded ? activeStreaks : activeStreaks.slice(0, 3);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityLabel="Back">
            <ChevronLeft size={22} color={c.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Trends</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Active streaks */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.accent, { backgroundColor: colors.primary }]} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Active streaks</Text>
              <Text style={styles.cardSub}>Days in a row, as of today</Text>
            </View>
          </View>
          {shown.length === 0 ? (
            <Text style={styles.emptyStreak}>No active streaks yet. Do a daily today and it starts here.</Text>
          ) : (
            shown.map((r, i) => <StreakRowView key={r.id} row={r} last={i === shown.length - 1} />)
          )}
          {activeStreaks.length > 3 && (
            <Pressable onPress={toggleStreaks} style={styles.seeAll}>
              <Text style={styles.seeAllText}>{expanded ? 'Less' : 'More'}</Text>
              {expanded ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
            </Pressable>
          )}
        </View>

        {/* Daily progress */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.accent, { backgroundColor: colors.primary }]} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Daily progress</Text>
              <Text style={styles.cardSub}>{heat.daysWithProgress} of {heat.daysInMonth} days with progress this month</Text>
            </View>
          </View>

          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} style={styles.monthBtn} hitSlop={8}>
              <ChevronLeft size={16} color={c.textSecondary} />
              <Text style={styles.monthBtnText}>{prevLbl}</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(ym.year, ym.month)}</Text>
            <Pressable onPress={nextMonth} style={styles.monthBtn} hitSlop={8} disabled={isCurrentMonth}>
              <Text style={[styles.monthBtnText, isCurrentMonth && { color: c.border }]}>{nextLbl}</Text>
              <ChevronRight size={16} color={isCurrentMonth ? c.border : c.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEK_HEADERS.map((h, i) => <Text key={i} style={styles.weekHeaderText}>{h}</Text>)}
          </View>
          <View style={styles.grid}>
            {heat.cells.map((cell, i) => (
              <View key={i} style={styles.cellWrap}>
                {cell ? (
                  (() => {
                    const lvl = heatLevel(cell.done, cell.intensity);
                    return <View style={[styles.cell, { backgroundColor: HEAT_FILL[lvl], borderColor: lvl === 0 ? c.border : 'transparent' }]} />;
                  })()
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <Text style={styles.legendText}>Less</Text>
            {HEAT_FILL.map((col, i) => (
              <View key={i} style={[styles.legendSwatch, { backgroundColor: col, borderColor: i === 0 ? c.border : 'transparent' }]} />
            ))}
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.accent, { backgroundColor: colors.tertiary }]} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Insights</Text>
              <Text style={styles.cardSub}>Patterns from your whole journey</Text>
            </View>
          </View>
          <InsightRow label="Strongest day of the week" value={insights.strongestWeekday ?? '—'} />
          <InsightRow label="Strongest section" value={insights.strongestSection ?? '—'} />
          <InsightRow label="Most active month" value={insights.mostActiveMonth ?? '—'} />
          <InsightRow label="Longest streak ever" value={insights.longest.days > 0 ? `${insights.longest.label} · ${insights.longest.days} days` : '—'} />
          <InsightRow label="Average Dailies per day" value={`${insights.avgDailies} of ${insights.totalCount}`} last />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 6 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.displayBold, fontSize: 24, color: c.text },

  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  accent: { width: 3, height: 15, borderRadius: 2, marginRight: 9, marginTop: 3 },
  cardTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
  cardSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 2 },

  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  streakIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  streakLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  streakDays: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted },
  streakNum: { fontFamily: fontFamily.bold, fontSize: 17, color: colors.primary },

  emptyStreak: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textMuted, paddingVertical: 10 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10, paddingBottom: 1 },
  seeAllText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  monthBtnText: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: c.textSecondary },
  monthTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },

  weekHeader: { flexDirection: 'row', marginBottom: 3 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontFamily: fontFamily.semiBold, fontSize: 10.5, color: c.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, height: 34, padding: 2.5 },
  cell: { flex: 1, borderRadius: 6, borderWidth: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  legendText: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },

  insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  insightLabel: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14.5, color: c.textSecondary },
  insightValue: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: c.text, textAlign: 'right' },
});
