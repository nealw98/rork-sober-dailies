// Journey — the per-day timeline. Each day is a block: date header + "Day N", a
// "Dailies · X of Y done" summary, then that day's entries. Tapping either the
// summary card OR an entry row grows it in place into a full read sheet (the
// Prayers-style shared-element morph): the row crossfades out, the sheet
// crossfades in, the feed fades behind, and the tab bar + FAB hide (immersive).
// ✕ reverse-morphs it back. The summary opens the day's dailies checklist; an
// entry opens its read-only detail.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import { ChevronRight, PenLine, Heart, Moon, CircleCheck, NotebookPen, Check, X } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useNotebook, type NotebookEntry, type NotebookType } from '@/hooks/use-notebook';
import { useDailies, type DailyItem } from '@/hooks/use-dailies-store';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useImmersive } from '@/hooks/use-immersive';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { SPOT_PAIRS } from '@/constants/spotCheckPairs';
import { parseLocalDate } from '@/lib/dateUtils';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const TEAL = { ink: colors.primary, soft: colors.primarySoft, dark: colors.primaryDark };
const SIDE = 14;
const DUR = 340;

type Rect = { x: number; y: number; w: number; h: number };
type Mode = 'list' | 'opening' | 'read' | 'closing';

type GlyphIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const J_TOOL: Record<NotebookType, { Icon: GlyphIcon; ink: string; soft: string; dark: string }> = {
  gratitude: { Icon: Heart, ink: colors.amber, soft: colors.amberSoft, dark: '#B07F38' },
  nightly: { Icon: Moon, ink: colors.tertiary, soft: colors.tertiarySoft, dark: colors.tertiaryDark },
  spotcheck: { Icon: CircleCheck, ink: colors.coral, soft: '#F6DDD3', dark: '#A8493A' },
  journal: { Icon: NotebookPen, ink: colors.secondary, soft: colors.secondarySoft, dark: colors.secondaryDark },
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

type DayBlockData = { key: string; label: string; dayN: number | null; done: number; total: number; isToday: boolean; entries: NotebookEntry[] };
type MorphTarget = { kind: 'entry'; entry: NotebookEntry } | { kind: 'day'; day: DayBlockData };

export default function JourneyScreen() {
  useScreenTimeTracking('Journey');
  const entries = useNotebook();
  const dailies = useDailies();
  const { sobrietyDate } = useSobriety();
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

  const overlayStyle = useAnimatedStyle(() => {
    const s = source ?? target;
    const p = source ? progress.value : 1;
    return {
      left: interpolate(p, [0, 1], [s.x, target.x]),
      top: interpolate(p, [0, 1], [s.y, target.y]),
      width: interpolate(p, [0, 1], [s.w, target.w]),
      height: interpolate(p, [0, 1], [s.h, target.h]),
      borderRadius: interpolate(p, [0, 1], [16, 22]),
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
            <Text style={styles.title}>Journey</Text>
            <Text style={styles.subtitle}>Your path of recovery</Text>
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
            {morph.kind === 'entry' ? <RowContent entry={morph.entry} /> : <SummaryContent day={morph.day} />}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, sheetFade]}>
            {morph.kind === 'entry' ? (
              <EntrySheet entry={morph.entry} onClose={closeMorph} scrollEnabled={mode === 'read'} />
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
  const t = J_TOOL[entry.type];
  return (
    <>
      <View style={[styles.entryMed, { backgroundColor: t.ink }]}><t.Icon size={19} color="#fff" strokeWidth={2} /></View>
      <View style={styles.flex}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryLabel}>{TYPE_LABEL[entry.type]}</Text>
          <Text style={styles.entryTime}>{timeLabel(entry.ts)}</Text>
        </View>
        {!!entry.preview && <Text style={styles.entryPreview} numberOfLines={2}>{entry.preview}</Text>}
      </View>
    </>
  );
}

function SummaryContent({ day }: { day: DayBlockData }) {
  return (
    <>
      <View style={styles.summaryMed}><SunriseGlyph size={20} /></View>
      <View style={styles.flex}>
        <Text style={styles.summaryTitle}>Dailies · <Text style={styles.summaryDone}>{day.done} of {day.total} done</Text></Text>
        <Text style={styles.summarySub}>{day.isToday ? 'Tap to see today’s list' : 'Tap to see the full day'}</Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </>
  );
}

function DayBlock({ day, onOpenDay, onOpenEntry }: { day: DayBlockData; onOpenDay: (rect: Rect | null) => void; onOpenEntry: (entry: NotebookEntry, rect: Rect | null) => void }) {
  const ref = useRef<View>(null);
  const press = () => {
    const node = ref.current;
    if (!node) { onOpenDay(null); return; }
    node.measureInWindow((x, y, w, h) => onOpenDay({ x, y, w, h }));
  };
  return (
    <View>
      <View style={styles.dayHead}>
        <Text style={styles.dayDate}>{day.label}</Text>
        {day.dayN != null && <Text style={styles.dayN}>Day {day.dayN}</Text>}
      </View>

      <Pressable ref={ref} style={[styles.summary, day.entries.length > 0 && { marginBottom: 12 }]} onPress={press}>
        <SummaryContent day={day} />
      </Pressable>

      {day.entries.map((e) => <EntryRow key={e.key} entry={e} onOpen={onOpenEntry} />)}
    </View>
  );
}

function EntryRow({ entry, onOpen }: { entry: NotebookEntry; onOpen: (entry: NotebookEntry, rect: Rect | null) => void }) {
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
    setEditing(false);
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
        <View style={[styles.sheetMed, { backgroundColor: colors.primary }]}><SunriseGlyph size={22} /></View>
        <View style={styles.flex}>
          <Text style={styles.sheetTitle}>Dailies</Text>
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
  const tone = resolveTone(item.color);
  const Glyph = resolveGlyph(item.icon);
  const Row: any = editable ? Pressable : View;
  return (
    <View>
      {!first && <View style={styles.hairline} />}
      <Row style={[styles.dRow, dim && { opacity: 0.5 }]} onPress={editable ? onToggle : undefined}>
        <View style={[styles.dMed, { backgroundColor: item.done ? tone.ink : '#C9C3B6' }]}><Glyph size={19} color="#fff" /></View>
        <Text style={styles.dLabel}>{item.label}</Text>
        <View style={[styles.dCheck, item.done ? { backgroundColor: tone.ink, borderColor: tone.ink } : { borderColor: c.border }]}>
          {item.done && <Check size={13} color="#fff" strokeWidth={3} />}
        </View>
      </Row>
    </View>
  );
}

// ── Entry sheet (read-only, "Option B" card content) ──────────────────
function EntrySheet({ entry, onClose, scrollEnabled = true }: { entry: NotebookEntry; onClose: () => void; scrollEnabled?: boolean }) {
  const t = J_TOOL[entry.type];
  return (
    <View style={styles.flexFill}>
      <View style={styles.sheetHead}>
        <View style={[styles.sheetMed, { backgroundColor: t.ink }]}><t.Icon size={22} color="#fff" strokeWidth={2} /></View>
        <View style={styles.flex}>
          <Text style={styles.sheetTitle}>{TYPE_LABEL[entry.type]}</Text>
          <Text style={styles.sheetTime}>{timeLabel(entry.ts)}</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
          <X size={18} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>
      <View style={styles.sheetDivider} />
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
        {entry.type === 'gratitude' && <GratitudeBody items={entry.gratitude ?? []} tool={t} />}
        {entry.type === 'journal' && <Text style={styles.journalProse}>{entry.journal}</Text>}
        {entry.type === 'nightly' && <NightlyBody pairs={entry.nightly ?? []} tool={t} />}
        {entry.type === 'spotcheck' && entry.spot && <SpotSheetBody spot={entry.spot} />}
      </ScrollView>
    </View>
  );
}

type Tool = { ink: string; soft: string; dark: string };

function GratitudeBody({ items, tool }: { items: string[]; tool: Tool }) {
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

function NightlyBody({ pairs, tool }: { pairs: { q: string; a: string }[]; tool: Tool }) {
  return (
    <View>
      {pairs.map((p, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.hairline} />}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1, minWidth: 0 },
  flexFill: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 30, letterSpacing: -0.5, color: c.text },
  subtitle: { fontFamily: fontFamily.serifItalic, fontSize: 15, color: c.textSecondary, marginTop: 2 },

  feed: { paddingHorizontal: 22, paddingBottom: 48, gap: 26 },

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
  entryPreview: { fontFamily: fontFamily.regularItalic, fontSize: 14.5, lineHeight: 21, color: c.textSecondary, marginTop: 5 },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 30, gap: 12 },
  emptyMedallion: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: 21, color: c.text },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textMuted, textAlign: 'center', maxWidth: 290 },

  // morph overlay + sheets (Option B)
  overlayCard: { position: 'absolute', backgroundColor: colors.white, overflow: 'hidden', ...shadows.md },
  overlayRow: { position: 'absolute', top: 0, left: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  sheetMed: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
  sheetTime: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
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

  spotHeading: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2, marginBottom: 9 },
  paperBox: { backgroundColor: '#F4F1EA', borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13 },
  paperText: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, color: c.textSecondary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.coral },
  chipText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: '#fff' },
  striveCard: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: 16, backgroundColor: TEAL.soft, borderWidth: 1, borderColor: TEAL.ink + '33' },
  striveHeadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  watchLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: '#A8493A', flex: 1 },
  striveLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: TEAL.dark, flex: 1, textAlign: 'right' },
  striveList: { gap: 11 },
  striveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  striveOff: { fontFamily: fontFamily.semiBold, fontSize: 15, color: '#A8493A', flex: 1 },
  striveOn: { fontFamily: fontFamily.semiBoldItalic, fontSize: 15, color: TEAL.dark, flex: 1, textAlign: 'right' },
});
