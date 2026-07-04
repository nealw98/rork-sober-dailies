// Daily Reflection — reading page (redesign 3.0). Per the design handoff
// (design_handoff_daily_reflection): photographic hero, the day's pull-quote
// (Lora italic) + reflection (Lora roman), a separate Meditation tile, a Done
// strip (shown only when today's reflection is read), and copyright. No audio,
// no in-reader "Mark as read" CTA (that's done from the Today checklist).
// Bookmarks were intentionally cut. Reflection text + date come from Supabase
// (constants/reflections.ts); the hero is a fixed bundled photo.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal, Share, Platform,
  AppState, AppStateStatus, PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, Share as ShareIcon } from 'lucide-react-native';

import BackButton from '@/components/BackButton';
import { getReflectionForDate } from '@/constants/reflections';
import { Reflection } from '@/types';
import { recordDailyReflectionDay } from '@/lib/reviewPrompt';
import { titleCase } from '@/lib/titleCase';
import { useDailies } from '@/hooks/use-dailies-store';
import { useTextSettings } from '@/hooks/use-text-settings';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const HERO = require('../assets/images/reflection_bg2.webp');
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SIZE_BUCKETS: { k: string; size: number }[] = [
  { k: 'S', size: 14 }, { k: 'M', size: 18 }, { k: 'L', size: 24 }, { k: 'XL', size: 30 },
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const heroDate = (d: Date) =>
  `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

interface DailyReflectionProps {
  fontSize?: number;
  lineHeight?: number;
  jumpToDate?: Date | null;
  onJumpApplied?: () => void;
}

export default function DailyReflection({ fontSize = 18, lineHeight, jumpToDate = null, onJumpApplied }: DailyReflectionProps) {
  const readSize = fontSize;
  const readLine = lineHeight ?? fontSize * 1.6;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dailies = useDailies();
  const { setFontSize } = useTextSettings();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sheet, setSheet] = useState<null | 'calendar' | 'display'>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const navigateDate = useCallback((dir: 'prev' | 'next') => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
      return d;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 50 && Math.abs(g.dy) < 20 && Math.abs(g.dx) > Math.abs(g.dy) * 3,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50) navigateDate('prev');
        else if (g.dx < -50) navigateDate('next');
      },
    }),
  ).current;

  // Reflection text for the selected day (Supabase, by day_of_year).
  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    getReflectionForDate(selectedDate)
      .then((r) => { if (alive) setReflection(r); })
      .catch((e) => console.error('Error updating reflection:', e))
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [selectedDate]);

  // Returning to the app on a new day snaps back to today.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && !isSameDay(selectedDate, new Date())) setSelectedDate(new Date());
    });
    return () => sub.remove();
  }, [selectedDate]);

  useEffect(() => {
    recordDailyReflectionDay(selectedDate).catch((e) => console.warn('[reviewPrompt] record failed', e));
  }, [selectedDate]);

  useEffect(() => {
    if (jumpToDate) { setSelectedDate(jumpToDate); onJumpApplied?.(); }
  }, [jumpToDate, onJumpApplied]);

  const shareReflection = useCallback(async () => {
    if (!reflection) return;
    const body = `${reflection.title}\n\n"${reflection.quote}"\n\n${reflection.source}\n\n${reflection.reflection}\n\nMeditation:\n${reflection.thought}`;
    try { await Share.share({ message: body, title: reflection.title }); }
    catch (e) { console.error('Error sharing reflection:', e); }
  }, [reflection]);

  const pickCalendarDay = (d: Date) => { setSelectedDate(d); setSheet(null); };

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

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        {...panResponder.panHandlers}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.62)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroInner}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>{reflection?.title ? titleCase(reflection.title) : ' '}</Text>
              <Text style={styles.heroDate}>{heroDate(selectedDate)}</Text>
            </View>
          </View>
        </View>

        {reflection && (
          <>
            {/* Pull-quote — start of the reading */}
            <View style={styles.quoteWrap}>
              <Text style={[styles.quote, { fontSize: readSize, lineHeight: readLine - readSize * 0.1 }]}>{reflection.quote}</Text>
              <Text style={styles.source}>— {reflection.source}</Text>
            </View>

            {/* Reflection body */}
            <View style={styles.bodyWrap}>
              {reflection.reflection.split('\n\n').map((p, i) => (
                <Text key={i} style={[styles.body, { fontSize: readSize, lineHeight: readLine, marginTop: i === 0 ? 0 : 14 }]}>{p}</Text>
              ))}
            </View>

            {/* Meditation tile (separate, app-added section) */}
            <View style={styles.medTile}>
              <View style={styles.medOrb} />
              <View style={styles.medLabelRow}>
                <Sparkles size={11} color={colors.primaryDark} strokeWidth={2} />
                <Text style={styles.medLabel}>MEDITATION</Text>
              </View>
              <Text style={styles.medText}>&ldquo;{reflection.thought}&rdquo;</Text>
            </View>

            <Text style={styles.copyright}>Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.</Text>
          </>
        )}
      </ScrollView>

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
      <DisplaySheet
        visible={sheet === 'display'}
        current={readSize}
        onSize={setFontSize}
        onClose={() => setSheet(null)}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

// ── Calendar picker sheet ──────────────────────────────────────────────
function CalendarSheet({ visible, month, selected, onMonth, onPick, onToday, onClose, bottomInset }: {
  visible: boolean; month: Date; selected: Date; onMonth: (d: 'prev' | 'next') => void;
  onPick: (d: Date) => void; onToday: () => void; onClose: () => void; bottomInset: number;
}) {
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

// ── Text size sheet ────────────────────────────────────────────────────
function DisplaySheet({ visible, current, onSize, onClose, bottomInset }: {
  visible: boolean; current: number; onSize: (n: number) => void; onClose: () => void; bottomInset: number;
}) {
  const selected = SIZE_BUCKETS.reduce((best, b) => (Math.abs(b.size - current) < Math.abs(best.size - current) ? b : best), SIZE_BUCKETS[0]).k;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.dispSheet, { paddingBottom: bottomInset + 28 }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetLabel}>TEXT SIZE</Text>
        <View style={styles.sizeRow}>
          <View style={styles.sizeBtns}>
            {SIZE_BUCKETS.map((b) => {
              const on = b.k === selected;
              return (
                <Pressable key={b.k} onPress={() => onSize(b.size)} style={[styles.sizeBtn, on ? styles.sizeBtnOn : styles.sizeBtnOff]}>
                  <Text style={[styles.sizeBtnText, { fontSize: b.k === 'S' ? 11 : b.k === 'M' ? 13 : b.k === 'L' ? 15 : 17, color: on ? '#fff' : c.textSecondary }]}>{b.k}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable style={styles.sheetCancel} onPress={onClose}><Text style={styles.sheetCancelText}>Done</Text></Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  hdrAa: { fontFamily: fontFamily.bold, fontSize: 13, color: c.textSecondary, letterSpacing: -0.2 },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 14 },
  dateChev: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  dateBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  pageTitle: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, paddingHorizontal: 22, paddingTop: 2, paddingBottom: 2 },

  hero: { height: 168, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primary },
  heroInner: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: 'flex-end' },
  heroTextBlock: { maxWidth: '66%' },   // title sits in the left 2/3 — weight to the left
  heroTitle: { fontFamily: fontFamily.serifMedium, fontSize: 22, color: '#fff', lineHeight: 28, letterSpacing: 0, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  heroDate: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.92)', marginTop: 6, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },

  quoteWrap: { marginTop: 32, paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: colors.primary },
  quote: { fontFamily: fontFamily.serifItalic, color: c.textSecondary, letterSpacing: -0.05 },
  source: { fontFamily: fontFamily.semiBold, fontSize: 11, color: c.textMuted, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },

  bodyWrap: { marginTop: 32 },
  body: { fontFamily: fontFamily.serif, color: c.textSecondary, letterSpacing: -0.05 },

  medTile: { marginTop: 24, padding: 18, backgroundColor: colors.primarySoft, borderRadius: 18, borderWidth: 1, borderColor: colors.primary + '28', overflow: 'hidden' },
  medOrb: { position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary + '14' },
  medLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.4, color: colors.primaryDark },
  medText: { fontFamily: fontFamily.serifItalic, fontSize: 18, color: c.textSecondary, marginTop: 8, lineHeight: 25, letterSpacing: -0.3 },


  copyright: { marginTop: 18, fontFamily: fontFamily.regular, fontSize: 10, color: c.textMuted, lineHeight: 15, textAlign: 'center' },

  // sheets
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,46,0.32)' },
  calSheet: { position: 'absolute', left: 12, right: 12, bottom: 18, backgroundColor: c.surface, borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 60, shadowOffset: { width: 0, height: 24 }, elevation: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNav: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontFamily: fontFamily.display, fontSize: 19, color: c.text, letterSpacing: -0.2 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fontFamily.semiBold, fontSize: 10, color: c.textMuted, marginBottom: 6 },
  calCell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDaySel: { backgroundColor: colors.primary },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary },
  calDayText: { fontFamily: fontFamily.medium, fontSize: 13, color: c.textSecondary },
  calDayTextSel: { color: '#fff', fontFamily: fontFamily.semiBold },
  calDayTextToday: { color: colors.primary, fontFamily: fontFamily.semiBold },
  calFoot: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.divider },
  calCancel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: c.textMuted, paddingHorizontal: 14, paddingVertical: 8 },
  calTodayBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary },
  calTodayText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: '#fff' },

  dispSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: -10 }, elevation: 12 },
  grabber: { width: 40, height: 4, borderRadius: 999, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
  sizeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  sizeBtns: { flex: 1, flexDirection: 'row', gap: 6 },
  sizeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sizeBtnOn: { backgroundColor: colors.primary },
  sizeBtnOff: { borderWidth: 1, borderColor: c.border },
  sizeBtnText: { fontFamily: fontFamily.semiBold },
  sheetCancel: { marginTop: 22, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  sheetCancelText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
});
