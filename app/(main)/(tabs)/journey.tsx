// Journey — the per-day timeline. Each day is a block: date header + "Day N", a
// "Dailies · X of Y done" summary, then that day's entries (Gratitude / Spot
// Check / Nightly / Journal). Today is live (dailies store + this session's
// saved entries); past days come from the stores' history. Tapping the summary
// opens the day detail (the checklist); tapping an entry opens it read-only.
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, PenLine, Sunrise, Heart, Moon, CircleCheck, NotebookPen, Check, ArrowRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useNotebook, type NotebookEntry, type NotebookType } from '@/hooks/use-notebook';
import { useDailies, type DailyItem } from '@/hooks/use-dailies-store';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { SPOT_PAIRS } from '@/constants/spotCheckPairs';
import { parseLocalDate } from '@/lib/dateUtils';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const TEAL = { ink: colors.primary, soft: colors.primarySoft, dark: colors.primaryDark };

type GlyphIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const J_TOOL: Record<NotebookType, { Icon: GlyphIcon; ink: string }> = {
  gratitude: { Icon: Heart, ink: colors.amber },
  nightly: { Icon: Moon, ink: colors.tertiary },
  spotcheck: { Icon: CircleCheck, ink: colors.coral },
  journal: { Icon: NotebookPen, ink: colors.secondary },
};
const TYPE_LABEL: Record<NotebookType, string> = {
  gratitude: 'Gratitude', nightly: 'Nightly Review', spotcheck: 'Spot Check', journal: 'Journal',
};

// ── date helpers ──────────────────────────────────────────────────────
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function keyToDate(key: string): Date { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
function dayKeyOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateLabel(key: string, todayKey: string): string {
  const d = keyToDate(key);
  const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const diff = Math.round((startOfDay(keyToDate(todayKey)).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diff === 0) return `Today, ${md}`;
  if (diff === 1) return `Yesterday, ${md}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${md}`;
}
function dayNFor(key: string, sobrietyDate: string | null): number | null {
  if (!sobrietyDate) return null;
  const diff = Math.floor((startOfDay(keyToDate(key)).getTime() - startOfDay(parseLocalDate(sobrietyDate)).getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}
function timeLabel(ts: number): string { return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

type DayBlockData = { key: string; label: string; dayN: number | null; done: number; total: number; isToday: boolean; entries: NotebookEntry[] };

export default function JourneyScreen() {
  useScreenTimeTracking('Journey');
  const entries = useNotebook();
  const dailies = useDailies();
  const { sobrietyDate } = useSobriety();
  const [entry, setEntry] = useState<NotebookEntry | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (entry) { setEntry(null); return true; }
      if (dayKey) { setDayKey(null); return true; }
      return false;
    });
    return () => sub.remove();
  }, [entry, dayKey]);

  const todayKey = dailies.dayKey;
  const completion = dailies.completion ?? {};

  const feed = useMemo<DayBlockData[]>(() => {
    const byDay = new Map<string, NotebookEntry[]>();
    entries.forEach((e) => {
      const k = dayKeyOf(e.ts);
      const arr = byDay.get(k) ?? [];
      arr.push(e);
      byDay.set(k, arr);
    });
    const keys = new Set<string>([todayKey, ...byDay.keys(), ...Object.keys(completion)]);
    return [...keys]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((k) => {
        const comp = completion[k];
        const isToday = k === todayKey;
        const done = isToday ? dailies.doneCount : (comp?.done.length ?? 0) + (comp?.reflection ? 1 : 0);
        return { key: k, label: dateLabel(k, todayKey), dayN: dayNFor(k, sobrietyDate ?? null), done, total: dailies.totalCount, isToday, entries: byDay.get(k) ?? [] };
      })
      .filter((d) => d.isToday || d.entries.length > 0 || d.done > 0);
  }, [entries, completion, todayKey, dailies.doneCount, dailies.totalCount, sobrietyDate]);

  const hasAny = feed.some((d) => d.entries.length > 0 || d.done > 0);

  if (entry) return <EntryDetail entry={entry} onBack={() => setEntry(null)} />;
  if (dayKey) {
    const block = feed.find((d) => d.key === dayKey);
    if (block) return <DayDetail block={block} program={dailies.program} completion={completion[dayKey]} onBack={() => setDayKey(null)} onEntry={setEntry} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journey</Text>
        <Text style={styles.subtitle}>Your path of recovery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
        {!hasAny ? (
          <JourneyEmpty />
        ) : (
          feed.map((d) => (
            <DayBlock key={d.key} day={d} onOpenDay={() => setDayKey(d.key)} onOpenEntry={setEntry} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DayBlock({ day, onOpenDay, onOpenEntry }: { day: DayBlockData; onOpenDay: () => void; onOpenEntry: (e: NotebookEntry) => void }) {
  return (
    <View style={styles.dayBlock}>
      <View style={styles.dayHead}>
        <Text style={styles.dayDate}>{day.label}</Text>
        {day.dayN != null && <Text style={styles.dayN}>Day {day.dayN}</Text>}
      </View>

      <Pressable style={[styles.summary, day.entries.length > 0 && { marginBottom: 12 }]} onPress={onOpenDay}>
        <View style={styles.summaryMed}><Sunrise size={19} color="#fff" strokeWidth={2} /></View>
        <View style={styles.flex}>
          <Text style={styles.summaryTitle}>Dailies · <Text style={styles.summaryDone}>{day.done} of {day.total} done</Text></Text>
          <Text style={styles.summarySub}>{day.isToday ? 'Tap to see today’s list' : 'Tap to see the full day'}</Text>
        </View>
        <ChevronRight size={16} color={c.textMuted} />
      </Pressable>

      {day.entries.map((e) => (
        <EntryRow key={e.key} entry={e} onPress={() => onOpenEntry(e)} />
      ))}
    </View>
  );
}

function EntryRow({ entry, onPress }: { entry: NotebookEntry; onPress: () => void }) {
  const t = J_TOOL[entry.type];
  return (
    <Pressable style={styles.entryRow} onPress={onPress}>
      <View style={[styles.entryMed, { backgroundColor: t.ink, shadowColor: t.ink }]}>
        <t.Icon size={19} color="#fff" strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryLabel}>{TYPE_LABEL[entry.type]}</Text>
          <Text style={styles.entryTime}>{timeLabel(entry.ts)}</Text>
        </View>
        {!!entry.preview && <Text style={styles.entryPreview} numberOfLines={2}>{entry.preview}</Text>}
      </View>
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

function JourneyEmpty() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMedallion}><PenLine size={28} color="#fff" strokeWidth={2} /></View>
      <Text style={styles.emptyTitle}>Your journey starts today</Text>
      <Text style={styles.emptyBody}>The dailies you complete and the entries you write will gather here, one day at a time.</Text>
    </View>
  );
}

// ── Day detail — the day's checklist + its entries ─────────────────────
const REFLECTION_ITEM = { id: '__reflection', label: 'Daily Reflection', icon: 'book', color: 'teal' };

function DayDetail({ block, program, completion, onBack, onEntry }: {
  block: DayBlockData; program: DailyItem[]; completion?: { done: string[]; reflection: boolean }; onBack: () => void; onEntry: (e: NotebookEntry) => void;
}) {
  const doneSet = new Set(completion?.done ?? []);
  const items: { id: string; label: string; icon: string; color: string; done: boolean }[] = [
    { ...REFLECTION_ITEM, done: !!completion?.reflection },
    ...program.map((p) => ({ id: p.id, label: p.label, icon: p.icon, color: p.color, done: doneSet.has(p.id) })),
  ];
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.detailBar}><BackButton onPress={onBack} /></View>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.dayHead}>
          <Text style={styles.detailTitle}>{block.label}</Text>
          {block.dayN != null && <Text style={styles.dayN}>Day {block.dayN}</Text>}
        </View>
        <Text style={styles.detailDate}>{block.done} of {block.total} dailies done</Text>
        <View style={styles.detailDivider} />

        {items.map((it) => {
          const tone = resolveTone(it.color);
          const Glyph = resolveGlyph(it.icon);
          return (
            <View key={it.id} style={[styles.checkRow, !it.done && styles.checkRowDim]}>
              <View style={[styles.checkMed, { backgroundColor: it.done ? tone.ink : '#B7B1A3' }]}>
                <Glyph size={18} color="#fff" />
              </View>
              <Text style={styles.checkLabel}>{it.label}</Text>
              <View style={[styles.checkBox, it.done ? { backgroundColor: tone.ink, borderColor: tone.ink } : { borderColor: c.border }]}>
                {it.done && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
            </View>
          );
        })}

        {block.entries.length > 0 && (
          <>
            <Text style={styles.detailSection}>Entries</Text>
            {block.entries.map((e) => (
              <EntryRow key={e.key} entry={e} onPress={() => onEntry(e)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Entry detail (read-only) ──────────────────────────────────────────
function EntryDetail({ entry, onBack }: { entry: NotebookEntry; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.detailBar}><BackButton onPress={onBack} /></View>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.detailTitle}>{TYPE_LABEL[entry.type]}</Text>
        <Text style={styles.detailDate}>{dateLabel(dayKeyOf(entry.ts), dayKeyOf(Date.now()))} · {timeLabel(entry.ts)}</Text>
        <View style={styles.detailDivider} />

        {entry.type === 'gratitude' && (entry.gratitude ?? []).map((it, i) => (
          <View key={i} style={styles.itemCard}><Text style={styles.itemText}>{it}</Text></View>
        ))}
        {entry.type === 'journal' && (
          <View style={styles.journalCard}><Text style={styles.journalText}>{entry.journal}</Text></View>
        )}
        {entry.type === 'nightly' && (entry.nightly ?? []).map((p, i) => (
          <View key={i} style={styles.qaBlock}>
            <Text style={styles.qaQuestion}>{p.q}</Text>
            <View style={styles.qaCard}><Text style={styles.qaAnswer}>{p.a}</Text></View>
          </View>
        ))}
        {entry.type === 'spotcheck' && entry.spot && <SpotBody spot={entry.spot} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function SpotBody({ spot }: { spot: { situation: string; selected: string[] } }) {
  const chosen = SPOT_PAIRS.filter((p) => spot.selected.includes(p.id));
  return (
    <View>
      {!!spot.situation && (
        <>
          <Text style={styles.spotHeading}>What was disturbing me?</Text>
          <View style={styles.itemCard}><Text style={styles.itemText}>{spot.situation}</Text></View>
        </>
      )}
      {chosen.length > 0 && (
        <View style={styles.striveCard}>
          <View style={styles.striveHeadRow}>
            <Text style={styles.watchLabel}>WATCH FOR</Text>
            <Text style={styles.striveLabel}>STRIVE FOR</Text>
          </View>
          <View style={styles.striveList}>
            {chosen.map((p) => (
              <View key={p.id} style={styles.striveRow}>
                <Text style={styles.striveOff}>{p.off}</Text>
                <ArrowRight size={15} color={c.textMuted} strokeWidth={2} />
                <Text style={styles.striveOn}>{p.on}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5, color: c.text },
  subtitle: { fontFamily: fontFamily.serifItalic, fontSize: 15, color: c.textSecondary, marginTop: 2 },

  feed: { paddingHorizontal: 22, paddingBottom: 48, gap: 26 },

  dayBlock: {},
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  dayDate: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
  dayN: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },

  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, ...shadows.sm },
  summaryMed: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  summaryDone: { color: c.textSecondary },
  summarySub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 3 },

  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 12, ...shadows.sm },
  entryMed: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  entryLabel: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  entryTime: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },
  entryPreview: { fontFamily: fontFamily.serifItalic, fontSize: 14.5, lineHeight: 21, color: c.textSecondary, marginTop: 5 },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 30, gap: 12 },
  emptyMedallion: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: 21, color: c.text },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textMuted, textAlign: 'center', maxWidth: 290 },

  // detail (shared)
  detailBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  detailScroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 4 },
  detailTitle: { fontFamily: fontFamily.display, fontSize: 24, letterSpacing: -0.4, color: c.text },
  detailDate: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },
  detailDivider: { height: 1, backgroundColor: c.divider, marginTop: 14, marginBottom: 18 },
  detailSection: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginTop: 18, marginBottom: 12 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  checkRowDim: { opacity: 0.6 },
  checkMed: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  itemCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 10 },
  itemText: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.text },
  journalCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  journalText: { fontFamily: fontFamily.regular, fontSize: 16.5, lineHeight: 25, color: c.text },
  qaBlock: { marginBottom: 18 },
  qaQuestion: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, color: c.text, letterSpacing: -0.2, marginBottom: 9 },
  qaCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13 },
  qaAnswer: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.text },
  spotHeading: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2, marginBottom: 9 },
  striveCard: { marginTop: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: 16, backgroundColor: TEAL.soft, borderWidth: 1, borderColor: TEAL.ink + '33' },
  striveHeadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  watchLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: '#A8493A', flex: 1 },
  striveLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: TEAL.dark, flex: 1, textAlign: 'right' },
  striveList: { gap: 11 },
  striveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  striveOff: { fontFamily: fontFamily.semiBold, fontSize: 15, color: '#A8493A', flex: 1 },
  striveOn: { fontFamily: fontFamily.semiBoldItalic, fontSize: 15, color: TEAL.dark, flex: 1, textAlign: 'right' },
});
