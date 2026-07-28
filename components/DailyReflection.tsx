// Daily Reflection — reading page (redesign 3.0). Per the design handoff
// (design_handoff_daily_reflection 2 — "Title masthead"): a typographic
// masthead (seedling-photo chip + live date kicker, then the day's title in
// Lora 500), the day's pull-quote (reader serif italic) + reflection body,
// a separate Meditation tile, and copyright. (The handoff's Lora drop cap was
// dropped — a true floated drop cap isn't achievable cleanly in RN.) No audio,
// no in-reader "Mark as read" CTA (that's done from the Today checklist).
// Bookmarks were intentionally cut. Reflection text + date come from Supabase
// (constants/reflections.ts); the chip reuses the Today photo.
//
// Prev/next is a real page swipe: a horizontal paging FlatList over a fixed
// window of days, one reading page per day, so the neighbor page slides in
// under your finger instead of the content snapping in place.
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, Pressable, StyleSheet, Modal, Share, Platform,
  AppState, AppStateStatus, useWindowDimensions, type TextStyle,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, Share as ShareIcon } from 'lucide-react-native';

import BackButton from '@/components/BackButton';
import { getReflectionForDate } from '@/constants/reflections';
import { Reflection } from '@/types';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import { titleCase } from '@/lib/titleCase';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif, readerSerifItalic } from '@/constants/fonts';
import { useReadingSize } from '@/hooks/use-reading-size';
import { ReadingSizeSheet } from '@/components/ReadingSizeSheet';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Inline emphasis — the only markup the Supabase reflection text carries:
// *span* renders as emphasis. In the upright body that means italic; inside
// the already-italic quote and Meditation blocks it flips to upright (classic
// roman-in-italic emphasis). The span must start and end on non-space so
// stray asterisks ("2 * 3", a lone footnote star) render literally.
const EM_RE = /\*(\S(?:[^*\n]*\S)?)\*/g;
const EM_ITALIC: TextStyle = readerSerifItalic;
const EM_UPRIGHT: TextStyle = { fontFamily: readerSerif, fontStyle: 'normal' };
function withEmphasis(text: string, em: TextStyle): React.ReactNode {
  if (!text.includes('*')) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  EM_RE.lastIndex = 0;
  for (let m = EM_RE.exec(text); m; m = EM_RE.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Text key={k++} style={em}>{m[1]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
// Plain-text form for the share sheet.
const stripEmphasis = (t: string) => t.replace(EM_RE, '$1');

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const heroDate = (d: Date) =>
  `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// The pager is a fixed window of days around the mount date. ±420 days is far
// beyond any real browsing run, and a fixed window keeps the index ↔ date
// mapping trivial — no re-centering trick, so no content flash mid-swipe.
const PAGER_RANGE = 420;

interface DailyReflectionProps {
  jumpToDate?: Date | null;
  onJumpApplied?: () => void;
}

export default function DailyReflection({ jumpToDate = null, onJumpApplied }: DailyReflectionProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // The selected day's reflection, for the top-bar Share (pages fetch their own).
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [sheet, setSheet] = useState<null | 'calendar' | 'display'>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Fetch-once promise cache (per reader visit) so the pager's neighbor pages
  // are already rendered by the time they slide in, and Share reuses the
  // page's fetch instead of hitting Supabase twice.
  const cacheRef = useRef(new Map<string, Promise<Reflection>>());
  const fetchReflection = useCallback((d: Date) => {
    const k = dateKey(d);
    let p = cacheRef.current.get(k);
    if (!p) { p = getReflectionForDate(d); cacheRef.current.set(k, p); }
    return p;
  }, []);

  // Pager window: one page per day, anchored on the mount date.
  const anchor = useRef(startOfDay(new Date())).current;
  const dates = useMemo(
    () => Array.from({ length: PAGER_RANGE * 2 + 1 }, (_, i) => addDays(anchor, i - PAGER_RANGE)),
    [anchor],
  );
  const indexForDate = useCallback((d: Date) => {
    // Math.round absorbs the DST hour when diffing local midnights.
    const i = PAGER_RANGE + Math.round((startOfDay(d).getTime() - anchor.getTime()) / DAY_MS);
    return Math.max(0, Math.min(dates.length - 1, i));
  }, [anchor, dates.length]);

  const listRef = useRef<FlatList<Date>>(null);

  const goToDate = useCallback((d: Date, animated: boolean) => {
    setSelectedDate(d);
    listRef.current?.scrollToIndex({ index: indexForDate(d), animated });
  }, [indexForDate]);

  // Chevrons ride the same pager animation as a finger swipe. The date commits
  // immediately; the momentum-end handler then lands on the same index (no-op).
  const navigateDate = useCallback((dir: 'prev' | 'next') => {
    goToDate(addDays(selectedDate, dir === 'prev' ? -1 : 1), true);
  }, [selectedDate, goToDate]);

  const onPageSettled = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(dates.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    const d = dates[i];
    setSelectedDate((prev) => (isSameDay(prev, d) ? prev : d));
  }, [dates, width]);

  // Rotation/resize: page offsets are in the old width — re-snap to the page.
  const widthRef = useRef(width);
  useEffect(() => {
    if (widthRef.current === width) return;
    widthRef.current = width;
    listRef.current?.scrollToIndex({ index: indexForDate(selectedDate), animated: false });
  }, [width, indexForDate, selectedDate]);

  // Reflection text for the selected day (Supabase, by day_of_year) — Share needs it.
  useEffect(() => {
    let alive = true;
    fetchReflection(selectedDate)
      .then((r) => { if (alive) setReflection(r); })
      .catch((e) => console.error('Error updating reflection:', e));
    return () => { alive = false; };
  }, [selectedDate, fetchReflection]);

  // Returning to the app on a new day snaps back to today.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && !isSameDay(selectedDate, new Date())) goToDate(new Date(), false);
    });
    return () => sub.remove();
  }, [selectedDate, goToDate]);

  // Review trigger: viewing a Daily Reflection (the most-used feature). Gated
  // inside maybeAskForReview, so it no-ops unless the user is eligible.
  useEffect(() => {
    maybeAskForReview('dailyReflection').catch((e) => console.warn('[reviewPrompt] trigger failed', e));
  }, [selectedDate]);

  useEffect(() => {
    if (jumpToDate) { goToDate(jumpToDate, false); onJumpApplied?.(); }
  }, [jumpToDate, onJumpApplied, goToDate]);

  const shareReflection = useCallback(async () => {
    if (!reflection) return;
    const body = `${reflection.title}\n\n"${stripEmphasis(reflection.quote)}"\n\n${reflection.source}\n\n${stripEmphasis(reflection.reflection)}\n\nMeditation:\n${stripEmphasis(reflection.thought)}`;
    try { await Share.share({ message: body, title: reflection.title }); }
    catch (e) { console.error('Error sharing reflection:', e); }
  }, [reflection]);

  const pickCalendarDay = (d: Date) => { goToDate(d, false); setSheet(null); };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.topActions}>
          <Pressable onPress={() => setSheet('display')} accessibilityLabel="Text size" style={styles.hdrBtn}>
            <Text style={styles.hdrAa}>aA</Text>
          </Pressable>
          <Pressable onPress={shareReflection} accessibilityLabel="Share" style={styles.hdrBtn}>
            <ShareIcon size={16} color={c.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Page title */}
      <Text style={styles.pageTitle}>Daily Reflections</Text>

      {/* Date pill row */}
      <View style={styles.dateRow}>
        <Pressable hitSlop={8} onPress={() => navigateDate('prev')} style={styles.dateChev}>
          <ChevronLeft size={18} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.dateBtn} accessibilityLabel="Pick a date" onPress={() => { setCalendarMonth(new Date(selectedDate)); setSheet('calendar'); }}>
          <Calendar size={18} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => navigateDate('next')} style={styles.dateChev}>
          <ChevronRight size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Day pager — each day is its own reading page, so prev/next slides in
          under your finger (and from the chevrons) instead of swapping in place. */}
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={dateKey}
        renderItem={({ item }) => <ReflectionPage date={item} width={width} fetchReflection={fetchReflection} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={PAGER_RANGE}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={onPageSettled}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={5}
        style={styles.flex}
      />

      <CalendarSheet
        visible={sheet === 'calendar'}
        month={calendarMonth}
        selected={selectedDate}
        onMonth={(dir) => setCalendarMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1)); return d; })}
        onPick={pickCalendarDay}
        onToday={() => pickCalendarDay(new Date())}
        onClose={() => setSheet(null)}
        bottomInset={insets.bottom}
      />
      <ReadingSizeSheet visible={sheet === 'display'} onClose={() => setSheet(null)} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

// ── One day's reading page (a pager cell) ──────────────────────────────
// Fetches its own reflection through the shared cache, so a page is usually
// ready before it's swiped into view. Memoized: pages don't re-render when the
// parent's selectedDate changes — only when their own fetch lands.
const ReflectionPage = React.memo(function ReflectionPage({ date, width, fetchReflection }: {
  date: Date; width: number; fetchReflection: (d: Date) => Promise<Reflection>;
}) {
  // Reading text = the shared "Aa" size, layered on the OS text-size.
  const { readingSize: readSize, readingLineHeight: readLine } = useReadingSize();
  const styles = useThemedStyles(makeStyles);
  const { colors, isDark } = useTokens();
  const [reflection, setReflection] = useState<Reflection | null>(null);

  useEffect(() => {
    let alive = true;
    fetchReflection(date)
      .then((r) => { if (alive) setReflection(r); })
      .catch((e) => console.error('Error updating reflection:', e));
    return () => { alive = false; };
  }, [date, fetchReflection]);

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Masthead — kicker (seedling chip + live date) + Lora title + hairline.
          Replaces the photographic hero: the reader is now a distinct reading
          surface, tied to the Today card via the shared Lora face + the chip. */}
      <View style={styles.masthead}>
        <View style={styles.kicker}>
          <Text style={styles.kickerDate}>{heroDate(date)}</Text>
        </View>
        {/* Title in Lora 500 — same face as the Today hero title */}
        <Text style={styles.mastheadTitle}>{reflection?.title ? titleCase(reflection.title) : ' '}</Text>
        <View style={styles.hairline} />
      </View>

      {reflection && (
        <>
          {/* Reading surface — plain page on light; on dark the quote + body sit
              on a gently lit surface card so the serif text doesn't float on black. */}
          <View style={isDark ? styles.readingCard : undefined}>
            {/* Pull-quote — start of the reading */}
            <View style={styles.quoteWrap}>
              <Text style={[styles.quote, { fontSize: readSize, lineHeight: readLine - readSize * 0.1 }]}>{withEmphasis(reflection.quote, EM_UPRIGHT)}</Text>
              <Text style={styles.source}>— {reflection.source}</Text>
            </View>

            {/* Reflection body */}
            <View style={styles.bodyWrap}>
              {reflection.reflection.split('\n\n').map((p, i) => (
                <Text key={i} style={[styles.body, { fontSize: readSize, lineHeight: readLine, marginTop: i === 0 ? 0 : 14 }]}>{withEmphasis(p, EM_ITALIC)}</Text>
              ))}
            </View>
          </View>

          {/* Meditation tile (separate, app-added section) */}
          <View style={styles.medTile}>
            <View style={styles.medLabelRow}>
              <Sparkles size={11} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.medLabel}>MEDITATION</Text>
            </View>
            <Text style={[styles.medText, { fontSize: readSize, lineHeight: Math.round(readSize * 1.4) }]}>&ldquo;{withEmphasis(reflection.thought, EM_UPRIGHT)}&rdquo;</Text>
          </View>

          <Text style={styles.copyright}>Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.</Text>
        </>
      )}
    </ScrollView>
  );
});

// ── Calendar picker sheet ──────────────────────────────────────────────
function CalendarSheet({ visible, month, selected, onMonth, onPick, onToday, onClose, bottomInset }: {
  visible: boolean; month: Date; selected: Date; onMonth: (d: 'prev' | 'next') => void;
  onPick: (d: Date) => void; onToday: () => void; onClose: () => void; bottomInset: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const year = month.getFullYear();
  const m = month.getMonth();
  const lead = new Date(year, m, 1).getDay();
  const daysIn = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const today = new Date();
  const monthLabel = `${month.toLocaleDateString('en-US', { month: 'long' })} ${year}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.calSheet, { paddingBottom: bottomInset + 18 }]}>
        <View style={styles.calHead}>
          <Pressable style={styles.calNav} onPress={() => onMonth('prev')}><ChevronLeft size={16} color={colors.primary} /></Pressable>
          <Text style={styles.calMonth}>{monthLabel}</Text>
          <Pressable style={styles.calNav} onPress={() => onMonth('next')}><ChevronRight size={16} color={colors.primary} /></Pressable>
        </View>
        <View style={styles.calGrid}>
          {WEEKDAYS.map((d, i) => <Text key={`w${i}`} style={styles.calWeekday}>{d}</Text>)}
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.calCell} />;
            const date = new Date(year, m, d);
            const isSel = isSameDay(date, selected);
            const isTod = isSameDay(date, today);
            return (
              <Pressable key={i} style={styles.calCell} onPress={() => onPick(date)}>
                <View style={[styles.calDay, isSel && styles.calDaySel, isTod && !isSel && styles.calDayToday]}>
                  <Text style={[styles.calDayText, isSel && styles.calDayTextSel, isTod && !isSel && styles.calDayTextToday]}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.calFoot}>
          <Pressable onPress={onClose}><Text style={styles.calCancel}>Cancel</Text></Pressable>
          <Pressable style={styles.calTodayBtn} onPress={onToday}><Text style={styles.calTodayText}>Today</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Cheap dark card chrome — lit top hairline + hairline border (handoff).
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...darkCard },
  hdrAa: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 14 },
  dateChev: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  dateBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  pageTitle: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29, paddingHorizontal: 22, paddingTop: 2, paddingBottom: 2 },

  // Typographic masthead (replaces the photo hero)
  masthead: { paddingTop: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center' },
  kickerDate: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 1.6, color: colors.primary, textTransform: 'uppercase' },
  // Android clips glyphs to the line box, so Lora's descenders (g, y) need a
  // taller line there; iOS draws outside the box and keeps the tight 36.
  mastheadTitle: { fontFamily: fontFamily.serifMedium, fontSize: 32, lineHeight: Platform.select({ android: 42, default: 36 }), letterSpacing: -0.3, color: c.text, marginTop: 12 },
  hairline: { height: 1, backgroundColor: c.border, marginTop: 22 },

  // dark-only reading surface (quote + body)
  readingCard: { marginTop: 16, paddingHorizontal: 18, paddingTop: 0, paddingBottom: 26, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...darkCard },

  quoteWrap: { marginTop: 32, paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: colors.primary },
  // Reading text is the reader serif (Georgia on iOS, Gelasio on Android) to
  // match the Big Book reader's optical size — Lora at the same pt reads a step larger.
  quote: { ...readerSerifItalic, color: c.text, letterSpacing: -0.05 },
  source: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.textMuted, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },

  bodyWrap: { marginTop: 32 },
  body: { fontFamily: readerSerif, color: c.text, letterSpacing: -0.05 },

  medTile: { marginTop: 24, padding: 18, backgroundColor: colors.primarySoft, borderRadius: 18, borderWidth: 1, borderColor: colors.primary + '28' },
  medLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.4, color: colors.primaryDark },
  // fontSize/lineHeight follow the reading-size setting (set inline).
  medText: { ...readerSerifItalic, color: c.text, marginTop: 8, letterSpacing: -0.3 },


  copyright: { marginTop: 18, fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, lineHeight: 15, textAlign: 'center' },

  // sheets
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? c.overlay : 'rgba(26,26,46,0.32)' },
  calSheet: { position: 'absolute', left: 12, right: 12, bottom: 18, backgroundColor: c.surface, borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 60, shadowOffset: { width: 0, height: 24 }, elevation: 12, ...(isDark ? { borderWidth: 1, ...darkCard } : null) },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNav: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...darkCard },
  calMonth: { fontFamily: fontFamily.display, fontSize: 20, color: c.text, letterSpacing: -0.3 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fontFamily.semiBold, fontSize: 10, color: c.textMuted, marginBottom: 6 },
  calCell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDaySel: { backgroundColor: colors.primary },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary },
  calDayText: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textSecondary },
  calDayTextSel: { color: isDark ? '#0B0C0E' : '#fff', fontFamily: fontFamily.semiBold },
  calDayTextToday: { color: colors.primary, fontFamily: fontFamily.semiBold },
  calFoot: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.divider },
  calCancel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: c.textMuted, paddingHorizontal: 14, paddingVertical: 8 },
  calTodayBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary },
  calTodayText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: isDark ? '#0B0C0E' : '#fff' },
  });
};
