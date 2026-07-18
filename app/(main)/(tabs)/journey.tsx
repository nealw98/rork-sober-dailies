// Journey — the per-day timeline. Each day is a block: date header + "Day N", a
// "Dailies · X of Y done" summary, then that day's entries. Tapping either the
// summary card OR an entry row grows it in place into a full read sheet (the
// Prayers-style shared-element morph): the row crossfades out, the sheet
// crossfades in, the feed fades behind, and the tab bar + FAB hide (immersive).
// ✕ reverse-morphs it back. The summary opens the day's dailies checklist; an
// entry opens its read-only detail.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, BackHandler, useWindowDimensions, TextInput, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import { ChevronRight, PenLine, Heart, Moon, CircleCheck, NotebookPen, Check, X, Plus, Trash2, BarChart3, Share as ShareIcon } from 'lucide-react-native';
import { FlowerLotus } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useNotebook, type NotebookEntry, type NotebookType } from '@/hooks/use-notebook';
import { useMeditationLog } from '@/hooks/use-meditation-log';
import { useDailies, type DailyItem } from '@/hooks/use-dailies-store';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import { useJournal } from '@/hooks/use-journal-store';
import { useImmersive } from '@/hooks/use-immersive';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { SPOT_PAIRS } from '@/constants/spotCheckPairs';
import { NIGHTLY_QUESTIONS } from '@/constants/nightlyQuestions';
import { parseLocalDate } from '@/lib/dateUtils';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import SettingsGear from '@/components/navigation/SettingsGear';
import PassItOnGift from '@/components/navigation/PassItOnGift';
import { fontFamily, getColors, shadows, type ColorMode, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const SIDE = 14;
const DUR = 340;

type Rect = { x: number; y: number; w: number; h: number };
type Mode = 'list' | 'opening' | 'read' | 'closing';

type GlyphIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
// Collapsed to the brand palette (June 2026), token-driven: gratitude → teal,
// nightly → periwinkle, spot check / journal → cyan. Family tones route through
// the mode-aware color set so they brighten on dark.
const jToolFor = (cs: ReturnType<typeof getColors>): Record<NotebookType, { Icon: GlyphIcon; ink: string; soft: string; dark: string }> => ({
  gratitude: { Icon: Heart, ink: cs.accent, soft: cs.accentSoft, dark: cs.accentDark },             // terracotta
  nightly: { Icon: Moon, ink: cs.tertiary, soft: cs.tertiarySoft, dark: cs.tertiaryDark },          // periwinkle
  spotcheck: { Icon: CircleCheck, ink: cs.accent, soft: cs.accentSoft, dark: cs.accentDark },       // terracotta
  journal: { Icon: NotebookPen, ink: cs.primary, soft: cs.primarySoft, dark: cs.primaryDark },      // teal
});
const J_TOOL_BY_MODE: Record<ColorMode, ReturnType<typeof jToolFor>> = {
  light: jToolFor(getColors('light')),
  dark: jToolFor(getColors('dark')),
};
const TYPE_LABEL: Record<NotebookType, string> = {
  gratitude: 'Gratitude', nightly: 'Nightly Review', spotcheck: 'Spot Check', journal: 'Journal',
};

// Brand sunrise glyph (matches the Today tab + sobriety coin) — the Dailies mark.
function SunriseGlyph({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
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
function fmtMeditated(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m} min ${rs} sec` : `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} hr ${rm} min` : `${h} hr`;
}

// Build shareable plain text for a journey entry (Share sheet body).
function buildShareText(entry: NotebookEntry): string {
  const dateStr = new Date(entry.ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const header = `${TYPE_LABEL[entry.type]} · ${dateStr}`;
  let body = '';
  switch (entry.type) {
    case 'gratitude':
      body = (entry.gratitude ?? []).map((g, i) => `${i + 1}. ${g}`).join('\n');
      break;
    case 'journal':
      body = entry.journal ?? '';
      break;
    case 'nightly': {
      const parts: string[] = [];
      if (entry.checks?.length) parts.push(entry.checks.map((label) => `✓ ${label}`).join('\n'));
      parts.push(...(entry.nightly ?? []).map((p) => `${p.q}\n${p.a}`));
      body = parts.join('\n\n');
      break;
    }
    case 'spotcheck': {
      const chosen = SPOT_PAIRS.filter((p) => entry.spot?.selected.includes(p.id));
      const parts: string[] = [];
      if (entry.spot?.situation) parts.push(`What was disturbing me?\n${entry.spot.situation}`);
      if (chosen.length > 0) parts.push(`Where I was off the beam:\n${chosen.map((p) => `• ${p.off} → ${p.on}`).join('\n')}`);
      body = parts.join('\n\n');
      break;
    }
  }
  return body ? `${header}\n\n${body}` : header;
}

type DayBlockData = { key: string; label: string; dayN: number | null; done: number; total: number; isToday: boolean; isYesterday: boolean; entries: NotebookEntry[]; medSeconds: number };
type MorphTarget = { kind: 'entry'; entry: NotebookEntry } | { kind: 'day'; day: DayBlockData };

export default function JourneyScreen() {
  useScreenTimeTracking('Journey');
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { entries, updateSpotRecord, deleteSpotRecord } = useNotebook();
  const dailies = useDailies();
  const { sobrietyDate } = useSobriety();
  const { byDate: medByDate } = useMeditationLog();
  const { setImmersive } = useImmersive();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [morph, setMorph] = useState<MorphTarget | null>(null);
  const [source, setSource] = useState<Rect | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const progress = useSharedValue(0);

  const todayKey = dailies.dayKey;
  const completion = dailies.completion ?? {};

  const target = useMemo<Rect>(() => ({
    x: SIDE,
    y: insets.top + 6,
    w: screenW - SIDE * 2,
    h: screenH - (insets.top + 6) - (insets.bottom + 8),
  }), [screenW, screenH, insets.top, insets.bottom]);

  const finishClose = () => { setMode('list'); setMorph(null); setSource(null); setImmersive(false); };

  const openMorph = useCallback((t: MorphTarget, rect: Rect | null) => {
    setMorph(t);
    setSource(rect);
    setMode('opening');
    setImmersive(true);
    progress.value = 0;
    progress.value = withTiming(1, { duration: DUR, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(setMode)('read');
    });
  }, []);

  const closeMorph = useCallback(() => {
    setMode('closing');
    progress.value = withTiming(0, { duration: DUR, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (morph && mode !== 'closing') { closeMorph(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [morph, mode, closeMorph]);

  useEffect(() => () => setImmersive(false), []);

  const feed = useMemo<DayBlockData[]>(() => {
    const byDay = new Map<string, NotebookEntry[]>();
    entries.forEach((e) => {
      const k = dayKeyOf(e.ts);
      const arr = byDay.get(k) ?? [];
      arr.push(e);
      byDay.set(k, arr);
    });
    const yd = keyToDate(todayKey);
    yd.setDate(yd.getDate() - 1);
    const yesterdayKey = dayKeyOf(yd.getTime());
    const keys = new Set<string>([todayKey, ...byDay.keys(), ...Object.keys(completion), ...Object.keys(medByDate)]);
    return [...keys]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((k) => {
        const comp = completion[k];
        const isToday = k === todayKey;
        // Count a past day on the SAME basis as the detail sheet (DaySheet),
        // which reconstructs the checklist from the CURRENT program + the
        // reflection hero. Counting comp.done raw would include completions for
        // dailies since removed from the program — inflating the tally past the
        // total (the "11 of 10" bug) and disagreeing with what the opened day
        // shows. So the total is the current program size and done only counts
        // completions whose ids are still in the program.
        // Legacy v2 days don't get a day card — the v2 Nightly Review shows as
        // ONE notebook entry (checklist included), the shape it had in v2. The
        // backfilled record still exists underneath so Trends bridges streaks;
        // it just doesn't count here.
        const card = comp?.v2 ? undefined : comp;
        const total = isToday ? dailies.totalCount : dailies.program.length + 1;
        const done = isToday
          ? dailies.doneCount
          : (card?.reflection ? 1 : 0) + (card ? dailies.program.filter((p) => card.done.includes(p.id)).length : 0);
        return { key: k, label: dateLabel(k, todayKey), dayN: dayNFor(k, sobrietyDate ?? null), done, total, isToday, isYesterday: k === yesterdayKey, entries: byDay.get(k) ?? [], medSeconds: medByDate[k] ?? 0 };
      })
      .filter((d) => d.isToday || d.isYesterday || d.entries.length > 0 || d.done > 0 || d.medSeconds > 0);
  }, [entries, completion, todayKey, dailies.doneCount, dailies.totalCount, dailies.program, sobrietyDate, medByDate]);

  const hasAny = feed.some((d) => d.entries.length > 0 || d.done > 0 || d.medSeconds > 0);

  const overlayStyle = useAnimatedStyle(() => {
    const s = source ?? target;
    const p = source ? progress.value : 1;
    return {
      left: interpolate(p, [0, 1], [s.x, target.x]),
      top: interpolate(p, [0, 1], [s.y, target.y]),
      width: interpolate(p, [0, 1], [s.w, target.w]),
      height: interpolate(p, [0, 1], [s.h, target.h]),
      borderRadius: interpolate(p, [0, 1], [14, 22]),
    };
  });
  const rowFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP) }));
  const sheetFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.1, 0.65], [0, 1], Extrapolation.CLAMP) }));
  const baseFade = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.85], [1, 0], Extrapolation.CLAMP) }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.flexFill, baseFade]} pointerEvents={mode === 'list' ? 'auto' : 'none'}>
        <SafeAreaView style={styles.screen} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.flexFill}>
              <Text style={styles.title}>Journey</Text>
              <Text style={styles.subtitle}>Your path of recovery</Text>
            </View>
            <Pressable style={styles.trendsBtn} onPress={() => router.push('/(main)/trends' as never)} accessibilityRole="button" accessibilityLabel="Trends">
              <BarChart3 size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.trendsBtnText}>Trends</Text>
            </Pressable>
            <PassItOnGift style={styles.gear} />
            <SettingsGear style={styles.gear} />
          </View>
          <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
            {!hasAny ? (
              <JourneyEmpty />
            ) : (
              feed.map((d) => (
                <DayBlock
                  key={d.key}
                  day={d}
                  onOpenDay={(rect) => openMorph({ kind: 'day', day: d }, rect)}
                  onOpenEntry={(entry, rect) => openMorph({ kind: 'entry', entry }, rect)}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {morph && (
        <Animated.View style={[styles.overlayCard, overlayStyle]}>
          <Animated.View style={[styles.overlayRow, { width: source?.w ?? target.w }, rowFade]} pointerEvents="none">
            {morph.kind === 'entry' ? (
              <>
                <RowContent entry={morph.entry} />
                <ChevronRight size={14} color={c.textMuted} />
              </>
            ) : (
              <SummaryContent day={morph.day} />
            )}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, sheetFade]}>
            {morph.kind === 'entry' ? (
              <EntrySheet entry={morph.entry} onClose={closeMorph} scrollEnabled={mode === 'read'} updateSpotRecord={updateSpotRecord} deleteSpotRecord={deleteSpotRecord} />
            ) : (
              <DaySheet day={morph.day} program={dailies.program} completion={completion[morph.day.key]} onClose={closeMorph} onSave={(rec) => dailies.setDayCompletion(morph.day.key, rec)} scrollEnabled={mode === 'read'} />
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function RowContent({ entry }: { entry: NotebookEntry }) {
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const t = J_TOOL_BY_MODE[mode][entry.type];
  return (
    <>
      <View style={[styles.med, { backgroundColor: t.soft }]}><t.Icon size={20} color={t.ink} strokeWidth={2} /></View>
      <View style={styles.flex}>
        <View style={styles.entryTitleRow}>
          <Text style={[styles.entryLabel, { color: t.ink }]}>{TYPE_LABEL[entry.type]}</Text>
          <Text style={styles.entryTime}>{timeLabel(entry.ts)}</Text>
        </View>
        {!!entry.preview && <Text style={styles.entryPreview} numberOfLines={2}>{entry.preview}</Text>}
      </View>
    </>
  );
}

function SummaryContent({ day }: { day: DayBlockData }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  return (
    <>
      <View style={[styles.med, { backgroundColor: colors.primarySoft }]}><SunriseGlyph size={20} color={colors.primary} /></View>
      <View style={styles.flex}>
        <Text style={styles.summaryTitle}>Dailies · {day.done} of {day.total} done</Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </>
  );
}

function DayBlock({ day, onOpenDay, onOpenEntry }: { day: DayBlockData; onOpenDay: (rect: Rect | null) => void; onOpenEntry: (entry: NotebookEntry, rect: Rect | null) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const ref = useRef<View>(null);
  const press = () => {
    const node = ref.current;
    if (!node) { onOpenDay(null); return; }
    node.measureInWindow((x, y, w, h) => onOpenDay({ x, y, w, h }));
  };
  return (
    <View style={styles.dayBlock}>
      {/* Continuous timeline line — a dark node per day sits on it */}
      <View style={styles.railLine} />
      <View style={styles.dayHead}>
        <View style={styles.dayNode} />
        <Text style={styles.dayDate}>{day.label}</Text>
        {day.dayN != null && <Text style={styles.dayN}>Day {day.dayN}</Text>}
      </View>
      <View style={styles.cards}>
        {/* Past days with nothing recorded don't get a "0 of N done" card — a
            missing record means nothing was tracked, not that the user failed
            that day's program. Today and yesterday always show: today is live,
            yesterday stays editable ("forgot to check off last night"). */}
        {(day.isToday || day.isYesterday || day.done > 0) && (
          <Pressable ref={ref} style={[styles.summary, (day.entries.length > 0 || day.medSeconds > 0) && { marginBottom: 12 }]} onPress={press}>
            <SummaryContent day={day} />
          </Pressable>
        )}
        {day.entries.map((e) => <EntryRow key={e.key} entry={e} onOpen={onOpenEntry} />)}
        {day.medSeconds > 0 && (
          // Read-only stat (not tappable, no chevron) — actual sat time that day.
          <View style={styles.entryRow}>
            <View style={[styles.med, { backgroundColor: colors.tertiarySoft }]}>
              <FlowerLotus size={22} color={colors.tertiary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.entryLabel, { color: colors.tertiary }]}>Meditation</Text>
              <Text style={styles.entryPreview}>Meditated {fmtMeditated(day.medSeconds)}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function EntryRow({ entry, onOpen }: { entry: NotebookEntry; onOpen: (entry: NotebookEntry, rect: Rect | null) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const ref = useRef<View>(null);
  const press = () => {
    const node = ref.current;
    if (!node) { onOpen(entry, null); return; }
    node.measureInWindow((x, y, w, h) => onOpen(entry, { x, y, w, h }));
  };
  return (
    <Pressable ref={ref} style={styles.entryRow} onPress={press}>
      <RowContent entry={entry} />
      <ChevronRight size={14} color={c.textMuted} />
    </Pressable>
  );
}

function JourneyEmpty() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMedallion}><PenLine size={28} color="#fff" strokeWidth={2} /></View>
      <Text style={styles.emptyTitle}>Your journey starts today</Text>
      <Text style={styles.emptyBody}>The dailies you complete and the entries you write will gather here, one day at a time.</Text>
    </View>
  );
}

// ── Day sheet (read-only checklist, "Option B" card) ──────────────────
const REFLECTION_ITEM = { id: '__reflection', label: 'Daily Reflection', icon: 'book', color: 'teal' };

function DaySheet({ day, program, completion, onClose, onSave, scrollEnabled = true }: {
  day: DayBlockData; program: DailyItem[]; completion?: { done: string[]; reflection: boolean };
  onClose: () => void; onSave: (rec: { done: string[]; reflection: boolean }) => void; scrollEnabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const [editing, setEditing] = useState(false);
  const [draftDone, setDraftDone] = useState<Set<string>>(new Set());
  const [draftReflection, setDraftReflection] = useState(false);

  const beginEdit = () => {
    setDraftDone(new Set(completion?.done ?? []));
    setDraftReflection(!!completion?.reflection);
    setEditing(true);
  };
  const save = () => {
    onSave({ done: [...draftDone], reflection: draftReflection });
    // Saving dismisses the whole day sheet back to the Journey list (not just
    // the editor) — same close path as the X button.
    onClose();
  };
  const toggle = (id: string) => {
    if (id === REFLECTION_ITEM.id) { setDraftReflection((v) => !v); return; }
    setDraftDone((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const all = [
    { id: REFLECTION_ITEM.id, label: REFLECTION_ITEM.label, icon: REFLECTION_ITEM.icon, color: REFLECTION_ITEM.color },
    ...program.map((p) => ({ id: p.id, label: p.label, icon: p.icon, color: p.color })),
  ];
  const isDone = (id: string) =>
    editing
      ? id === REFLECTION_ITEM.id ? draftReflection : draftDone.has(id)
      : id === REFLECTION_ITEM.id ? !!completion?.reflection : (completion?.done ?? []).includes(id);

  const rows = all.map((it) => ({ ...it, done: isDone(it.id) }));
  const done = rows.filter((i) => i.done);
  const notDone = rows.filter((i) => !i.done);

  return (
    <View style={styles.flexFill}>
      <View style={styles.sheetHead}>
        <View style={[styles.sheetMed, { backgroundColor: colors.primarySoft }]}><SunriseGlyph size={22} color={colors.primary} /></View>
        <View style={styles.flex}>
          <Text style={[styles.sheetTitle, { color: colors.primary }]}>Dailies</Text>
          <Text style={styles.sheetTime}>{day.label}</Text>
        </View>
        {editing ? (
          <>
            <Pressable onPress={() => setEditing(false)} hitSlop={8} style={styles.headTextBtn}><Text style={styles.headCancel}>Cancel</Text></Pressable>
            <Pressable onPress={save} hitSlop={8} style={styles.headTextBtn}><Text style={styles.headSave}>Save</Text></Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={beginEdit} hitSlop={8} style={styles.headTextBtn} accessibilityRole="button" accessibilityLabel="Edit dailies"><Text style={styles.headEdit}>Edit</Text></Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={18} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
          </>
        )}
      </View>
      <View style={styles.sheetDivider} />
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
        {editing ? (
          rows.map((it, i) => <DailyCheckRow key={it.id} item={it} first={i === 0} editable onToggle={() => toggle(it.id)} />)
        ) : (
          <>
            {done.map((it, i) => <DailyCheckRow key={it.id} item={it} first={i === 0} />)}
            {notDone.length > 0 && <Text style={styles.notDoneLabel}>NOT DONE</Text>}
            {notDone.map((it, i) => <DailyCheckRow key={it.id} item={it} first={i === 0} dim />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DailyCheckRow({ item, first, dim, editable, onToggle }: {
  item: { label: string; icon: string; color: string; done: boolean };
  first: boolean; dim?: boolean; editable?: boolean; onToggle?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, mode } = useTokens();
  const tone = resolveTone(item.color, mode);
  const Glyph = resolveGlyph(item.icon);
  const Row: any = editable ? Pressable : View;
  return (
    <View>
      {!first && <View style={styles.hairline} />}
      <Row style={[styles.dRow, dim && { opacity: 0.5 }]} onPress={editable ? onToggle : undefined}>
        <View style={[styles.dMed, { backgroundColor: tone.soft }]}><Glyph size={19} color={tone.ink} /></View>
        <Text style={styles.dLabel}>{item.label}</Text>
        <View style={[styles.dCheck, item.done ? { backgroundColor: tone.ink, borderColor: tone.ink } : { borderColor: c.border }]}>
          {item.done && <Check size={13} color="#fff" strokeWidth={3} />}
        </View>
      </Row>
    </View>
  );
}

// ── Entry sheet (read + edit, "Option B" card content) ─────────────────
function EntrySheet({ entry, onClose, scrollEnabled = true, updateSpotRecord, deleteSpotRecord }: {
  entry: NotebookEntry; onClose: () => void; scrollEnabled?: boolean;
  updateSpotRecord: (id: string, next: { situation: string; selected: string[] }) => void;
  deleteSpotRecord: (id: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, mode } = useTokens();
  const t = J_TOOL_BY_MODE[mode][entry.type];
  const gratitudeStore = useGratitudeStore();
  const eveningStore = useEveningReviewStore();
  const journal = useJournal();

  // `view` mirrors the saved content so the sheet stays correct after a save
  // (the parent's morph.entry snapshot doesn't update until reopen).
  const [view, setView] = useState<NotebookEntry>(entry);
  const [editing, setEditing] = useState(false);

  const [draftJournal, setDraftJournal] = useState('');
  const [draftGratitude, setDraftGratitude] = useState<string[]>([]);
  const [draftNightly, setDraftNightly] = useState<Record<string, string>>({});
  const [draftSituation, setDraftSituation] = useState('');
  const [draftSelected, setDraftSelected] = useState<Set<string>>(new Set());
  const [showAllDefects, setShowAllDefects] = useState(false);

  const beginEdit = () => {
    if (view.type === 'journal') setDraftJournal(view.journal ?? '');
    if (view.type === 'gratitude') setDraftGratitude([...(view.gratitude ?? [])]);
    if (view.type === 'nightly') {
      const data = view.date ? eveningStore.getSavedEntry(view.date)?.data : undefined;
      const seed: Record<string, string> = {};
      NIGHTLY_QUESTIONS.forEach((q) => { seed[q.key] = String((data as any)?.[q.key] ?? '').trim(); });
      setDraftNightly(seed);
    }
    if (view.type === 'spotcheck') {
      setDraftSituation(view.spot?.situation ?? '');
      setDraftSelected(new Set(view.spot?.selected ?? []));
      setShowAllDefects(false);
    }
    setEditing(true);
  };

  const save = () => {
    if (view.type === 'journal' && view.id) {
      const text = draftJournal.trim();
      journal.updateEntry(view.id, text);
      setView((v) => ({ ...v, journal: text, preview: text.replace(/\s+/g, ' ').trim() }));
    } else if (view.type === 'gratitude' && view.date) {
      const items = draftGratitude.map((s) => s.trim()).filter(Boolean);
      gratitudeStore.editSavedEntry(view.date, items);
      setView((v) => ({ ...v, gratitude: items, preview: items[0] ?? '', count: `${items.length} ${items.length === 1 ? 'item' : 'items'}` }));
    } else if (view.type === 'nightly' && view.date) {
      const patch: Record<string, string> = {};
      NIGHTLY_QUESTIONS.forEach((q) => { patch[q.key] = (draftNightly[q.key] ?? '').trim(); });
      eveningStore.editSavedEntry(view.date, patch);
      const pairs = NIGHTLY_QUESTIONS.map((q) => ({ q: q.q, a: patch[q.key] })).filter((p) => p.a);
      setView((v) => ({ ...v, nightly: pairs, preview: pairs[0]?.a ?? '' }));
    } else if (view.type === 'spotcheck' && view.id) {
      const situation = draftSituation.trim();
      const selected = [...draftSelected];
      updateSpotRecord(view.id, { situation, selected });
      setView((v) => ({ ...v, spot: { situation, selected }, preview: situation }));
    }
    setEditing(false);
  };

  const shareEntry = async () => {
    try { await Share.share({ message: buildShareText(view) }); }
    catch (e) { console.warn('[journey] share failed', e); }
  };

  // Delete the entry from its backing store, then close the sheet. (Legacy v2
  // checklist days live in dailies_completion, not here — deleting a Nightly
  // Review never touches them.)
  const performDelete = () => {
    if (view.type === 'journal' && view.id) journal.removeEntry(view.id);
    else if (view.type === 'gratitude' && view.date) gratitudeStore.deleteSavedEntry(view.date);
    else if (view.type === 'spotcheck' && view.id) deleteSpotRecord(view.id);
    else if (view.type === 'nightly' && view.date) eveningStore.deleteSavedEntry(view.date);
    onClose();
  };

  const confirmDelete = () => {
    Alert.alert(`Delete this ${TYPE_LABEL[view.type]}?`, 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: performDelete },
    ]);
  };

  return (
    <View style={styles.flexFill}>
      <View style={styles.sheetHead}>
        <View style={[styles.sheetMed, { backgroundColor: t.soft }]}><t.Icon size={22} color={t.ink} strokeWidth={2} /></View>
        <View style={styles.flex}>
          <Text style={[styles.sheetTitle, { color: t.ink }]}>{TYPE_LABEL[view.type]}</Text>
          <Text style={styles.sheetTime}>{timeLabel(view.ts)}</Text>
        </View>
        {editing ? (
          <>
            <Pressable onPress={() => setEditing(false)} hitSlop={8} style={styles.headTextBtn}><Text style={styles.headCancel}>Cancel</Text></Pressable>
            <Pressable onPress={save} hitSlop={8} style={styles.headTextBtn}><Text style={styles.headSave}>Save</Text></Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={beginEdit} hitSlop={8} style={styles.headTextBtn} accessibilityRole="button" accessibilityLabel={`Edit ${TYPE_LABEL[view.type]}`}><Text style={styles.headEdit}>Edit</Text></Pressable>
            <Pressable style={styles.iconHeadBtn} onPress={shareEntry} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Share ${TYPE_LABEL[view.type]}`}>
              <ShareIcon size={16} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable style={styles.iconHeadBtn} onPress={confirmDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${TYPE_LABEL[view.type]}`}>
              <Trash2 size={16} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <X size={18} color={c.textSecondary} strokeWidth={2} />
            </Pressable>
          </>
        )}
      </View>
      <View style={styles.sheetDivider} />
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {editing ? (
          <>
            {view.type === 'gratitude' && <GratitudeEdit items={draftGratitude} setItems={setDraftGratitude} tool={t} />}
            {view.type === 'journal' && (
              <TextInput value={draftJournal} onChangeText={setDraftJournal} multiline placeholder="Write…" placeholderTextColor={c.textMuted} style={styles.journalInput} autoFocus />
            )}
            {view.type === 'nightly' && <NightlyEdit answers={draftNightly} setAnswers={setDraftNightly} tool={t} />}
            {view.type === 'spotcheck' && (
              <SpotEdit
                situation={draftSituation} setSituation={setDraftSituation}
                selected={draftSelected} setSelected={setDraftSelected}
                showAll={showAllDefects} setShowAll={setShowAllDefects}
              />
            )}
          </>
        ) : (
          <>
            {view.type === 'gratitude' && <GratitudeBody items={view.gratitude ?? []} tool={t} />}
            {view.type === 'journal' && <Text style={styles.journalProse}>{view.journal}</Text>}
            {view.type === 'nightly' && <NightlyBody pairs={view.nightly ?? []} checks={view.checks} tool={t} />}
            {view.type === 'spotcheck' && view.spot && <SpotSheetBody spot={view.spot} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Editable bodies ────────────────────────────────────────────────────
function GratitudeEdit({ items, setItems, tool }: { items: string[]; setItems: (v: string[]) => void; tool: Tool }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const setAt = (i: number, val: string) => setItems(items.map((it, idx) => (idx === i ? val : it)));
  const removeAt = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, '']);
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={styles.gEditRow}>
          <View style={[styles.gNum, { backgroundColor: tool.soft }]}><Text style={[styles.gNumText, { color: tool.dark }]}>{i + 1}</Text></View>
          <TextInput value={it} onChangeText={(tx) => setAt(i, tx)} multiline placeholder="I'm grateful for…" placeholderTextColor={c.textMuted} style={styles.gInput} />
          <Pressable onPress={() => removeAt(i)} hitSlop={8} style={styles.gDelete} accessibilityRole="button" accessibilityLabel="Remove item">
            <Trash2 size={17} color={c.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={add} style={styles.addRow} accessibilityRole="button">
        <Plus size={17} color={tool.dark} strokeWidth={2.5} />
        <Text style={[styles.addText, { color: tool.dark }]}>Add item</Text>
      </Pressable>
    </View>
  );
}

function NightlyEdit({ answers, setAnswers, tool }: { answers: Record<string, string>; setAnswers: (v: Record<string, string>) => void; tool: Tool }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  return (
    <View>
      {NIGHTLY_QUESTIONS.map((q, i) => (
        <View key={q.key}>
          {i > 0 && <View style={styles.hairline} />}
          <View style={styles.nBlock}>
            <Text style={[styles.nQ, { color: tool.dark }]}>{q.q}</Text>
            <TextInput
              value={answers[q.key] ?? ''}
              onChangeText={(tx) => setAnswers({ ...answers, [q.key]: tx })}
              multiline placeholder="Your reflection…" placeholderTextColor={c.textMuted}
              style={styles.nInput}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function SpotEdit({ situation, setSituation, selected, setSelected, showAll, setShowAll }: {
  situation: string; setSituation: (v: string) => void;
  selected: Set<string>; setSelected: (v: Set<string>) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };
  const visible = showAll ? SPOT_PAIRS : SPOT_PAIRS.filter((p) => p.core || selected.has(p.id));
  return (
    <View>
      <Text style={styles.spotHeading}>What was disturbing me?</Text>
      <TextInput value={situation} onChangeText={setSituation} multiline placeholder="Name the situation." placeholderTextColor={c.textMuted} style={styles.situationInput} />
      <Text style={[styles.spotHeading, { marginTop: 22 }]}>Where I was off the beam</Text>
      <View style={[styles.chipsRow, { marginTop: 10 }]}>
        {visible.map((p) => {
          const on = selected.has(p.id);
          return (
            <Pressable key={p.id} onPress={() => toggle(p.id)} style={[styles.editChip, on ? styles.editChipOn : styles.editChipOff]}>
              <Text style={[styles.editChipText, { color: on ? '#fff' : c.textSecondary }]}>{p.off}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setShowAll(!showAll)} style={[styles.editChip, styles.chipShowAll]}>
          <Text style={[styles.editChipText, { color: c.textMuted }]}>{showAll ? 'Show fewer' : 'Show all 18'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Tool = { ink: string; soft: string; dark: string };

function GratitudeBody({ items, tool }: { items: string[]; tool: Tool }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      {items.map((it, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.hairline} />}
          <View style={styles.gRow}>
            <View style={[styles.gNum, { backgroundColor: tool.soft }]}><Text style={[styles.gNumText, { color: tool.dark }]}>{i + 1}</Text></View>
            <Text style={styles.gText}>{it}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function NightlyBody({ pairs, checks, tool }: { pairs: { q: string; a: string }[]; checks?: string[]; tool: Tool }) {
  const styles = useThemedStyles(makeStyles);
  const hasChecks = !!checks && checks.length > 0;
  return (
    <View>
      {/* v2 "Daily Actions" checklist — part of the same entry, as it was in v2 */}
      {hasChecks && (
        <View style={styles.nBlock}>
          {checks!.map((label) => (
            <View key={label} style={styles.nCheckRow}>
              <Check size={14} color={tool.dark} strokeWidth={2.6} />
              <Text style={styles.nCheckLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      {pairs.map((p, i) => (
        <View key={i}>
          {(i > 0 || hasChecks) && <View style={styles.hairline} />}
          <View style={styles.nBlock}>
            <Text style={[styles.nQ, { color: tool.dark }]}>{p.q}</Text>
            <Text style={styles.nA}>{p.a}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SpotSheetBody({ spot }: { spot: { situation: string; selected: string[] } }) {
  const styles = useThemedStyles(makeStyles);
  const chosen = SPOT_PAIRS.filter((p) => spot.selected.includes(p.id));
  return (
    <View>
      {!!spot.situation && (
        <>
          <Text style={styles.spotHeading}>What was disturbing me?</Text>
          <View style={styles.paperBox}><Text style={styles.paperText}>{spot.situation}</Text></View>
        </>
      )}
      {chosen.length > 0 && (
        <>
          <Text style={[styles.spotHeading, { marginTop: 22 }]}>Where I was off the beam</Text>
          <View style={styles.chipsRow}>
            {chosen.map((p) => <View key={p.id} style={styles.chip}><Text style={styles.chipText}>{p.off}</Text></View>)}
          </View>
          <View style={styles.striveCard}>
            <View style={styles.striveHeadRow}>
              <Text style={styles.watchLabel}>WATCH FOR</Text>
              <Text style={styles.striveLabel}>STRIVE FOR</Text>
            </View>
            <View style={styles.striveList}>
              {chosen.map((p) => (
                <View key={p.id} style={styles.striveRow}>
                  <Text style={styles.striveOff}>{p.off}</Text>
                  <Text style={styles.striveOn}>{p.on}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Cheap dark card chrome (lit top hairline) for the many small tiles; the
  // WATCH FOR terracotta ink brightens on dark for contrast.
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  const watchInk = isDark ? '#E6A184' : '#A8493A';
  const paperFill = isDark ? 'rgba(255,255,255,0.06)' : '#F4F1EA';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1, minWidth: 0 },
    flexFill: { flex: 1 },
    // Tab header: title row starts at paddingTop 54 — the y where back-button
    // screens' titles land — with the actions inline, and a roomy paddingBottom.
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 54, paddingBottom: 28 },
    gear: { marginLeft: 14 },
    trendsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, ...shadows.sm, ...darkCard },
    trendsBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.text },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    subtitle: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 2 },

    feed: { paddingHorizontal: 22, paddingBottom: 48 },

    // Each day block carries a continuous left timeline line (paddingBottom bridges
    // to the next day's node, so the line reads as one); a dark node sits on it.
    dayBlock: { position: 'relative', paddingBottom: 24 },
    railLine: { position: 'absolute', left: 6, top: 10, bottom: 0, width: 2, backgroundColor: c.border },
    dayHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    dayNode: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primaryDark, marginRight: 12 },
    dayDate: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
    dayN: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, marginLeft: 'auto' },

    cards: { paddingLeft: 28 },
    // icon tile — light tone tint fill, icon in the tool color
    med: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

    // surface tiles (summary + entries)
    summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, ...shadows.sm, ...darkCard },
    summaryTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: colors.primary },

    entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, ...shadows.sm, ...darkCard },
    entryTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    entryLabel: { fontFamily: fontFamily.semiBold, fontSize: 15 },
    entryTime: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },
    entryPreview: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 20, color: c.textSecondary, marginTop: 3 },

    empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 30, gap: 12 },
    emptyMedallion: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontFamily: fontFamily.display, fontSize: 21, color: c.text },
    emptyBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textMuted, textAlign: 'center', maxWidth: 290 },

    // morph overlay + sheets (Option B)
    overlayCard: { position: 'absolute', backgroundColor: isDark ? c.surface : colors.white, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...shadows.md, ...darkCard },
    overlayRow: { position: 'absolute', top: 0, left: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
    sheetMed: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: fontFamily.display, fontSize: 22, letterSpacing: -0.4, color: c.text },
    sheetTime: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 1 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    iconHeadBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: isDark ? c.surfaceRaised : c.surface, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    headTextBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    headEdit: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.primary },
    headCancel: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textMuted },
    headSave: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.primary },
    sheetDivider: { height: 1, backgroundColor: c.divider, marginHorizontal: 18 },
    sheetBody: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 32 },

    // day checklist
    notDoneLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginTop: 20, marginBottom: 4 },
    dRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
    dMed: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    dLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
    dCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

    // entry bodies
    hairline: { height: 1, backgroundColor: c.divider },
    gRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
    gNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    gNumText: { fontFamily: fontFamily.bold, fontSize: 12 },
    gText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 24, color: c.text },

    journalProse: { fontFamily: fontFamily.regular, fontSize: 16.5, lineHeight: 25, color: c.text },

    nBlock: { paddingVertical: 16 },
    nQ: { fontFamily: fontFamily.semiBold, fontSize: 15.5, lineHeight: 21, letterSpacing: -0.2, marginBottom: 7 },
    nA: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: c.text },
    nCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 },
    nCheckLabel: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21, color: c.text },

    spotHeading: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2, marginBottom: 9 },
    paperBox: { backgroundColor: paperFill, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13 },
    paperText: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.text },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.accent },
    chipText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: '#fff' },
    striveCard: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: 16, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '33' },
    striveHeadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    watchLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: watchInk, flex: 1 },
    striveLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: colors.primaryDark, flex: 1, textAlign: 'right' },
    striveList: { gap: 11 },
    striveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    striveOff: { fontFamily: fontFamily.semiBold, fontSize: 15, color: watchInk, flex: 1 },
    striveOn: { fontFamily: fontFamily.semiBoldItalic, fontSize: 15, color: colors.primaryDark, flex: 1, textAlign: 'right' },

    // editable bodies
    journalInput: { fontFamily: fontFamily.regular, fontSize: 16.5, lineHeight: 25, color: c.text, minHeight: 200, textAlignVertical: 'top' },
    gEditRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
    gInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 24, color: c.text, paddingVertical: 2, paddingHorizontal: 12, backgroundColor: paperFill, borderRadius: 10, minHeight: 40 },
    gDelete: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 2, marginTop: 4 },
    addText: { fontFamily: fontFamily.semiBold, fontSize: 15 },
    nInput: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.text, marginTop: 2, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: paperFill, borderRadius: 10, minHeight: 56, textAlignVertical: 'top' },
    situationInput: { marginTop: 7, backgroundColor: paperFill, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, minHeight: 70, fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.text, textAlignVertical: 'top' },
    editChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5 },
    editChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    editChipOff: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.white, borderColor: c.border },
    editChipText: { fontFamily: fontFamily.semiBold, fontSize: 14 },
    chipShowAll: { backgroundColor: 'transparent', borderColor: c.textMuted + '66', borderStyle: 'dashed' },
  });
};
