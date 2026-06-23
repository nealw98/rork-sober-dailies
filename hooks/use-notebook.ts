// Notebook feed — merges saved entries from all four writing stores (Gratitude,
// Nightly Review, Spot Check, Journal) into one timeline for the Journey tab.
// Three are context stores; Spot Check lives in raw AsyncStorage, so it's
// reloaded on focus. Read-only aggregation — no new storage.
import { useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useEveningReviewStore } from '@/hooks/use-evening-review-store';
import { useJournal } from '@/hooks/use-journal-store';
import { NIGHTLY_QUESTIONS } from '@/constants/nightlyQuestions';

export type NotebookType = 'gratitude' | 'nightly' | 'spotcheck' | 'journal';

export type NotebookEntry = {
  key: string;
  type: NotebookType;
  ts: number; // ms epoch
  preview: string;
  count: string; // small right-aligned label
  gratitude?: string[];
  nightly?: { q: string; a: string }[];
  spot?: { situation: string; selected: string[] };
  journal?: string;
};

type SpotRecord = { id: string; ts: string; situation: string; selections: Record<string, string> };

export function useNotebook(): NotebookEntry[] {
  const gratitude = useGratitudeStore();
  const evening = useEveningReviewStore();
  const journal = useJournal();
  const [spot, setSpot] = useState<SpotRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem('spot_check_inventories')
        .then((s) => { if (alive && s) setSpot(JSON.parse(s)); })
        .catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  const gratitudeEntries = gratitude?.savedEntries;
  const eveningEntries = evening?.savedEntries;
  const journalEntries = journal?.entries;

  return useMemo(() => {
    const out: NotebookEntry[] = [];

    (gratitudeEntries ?? []).forEach((e: any) => {
      const items: string[] = e.items ?? [];
      out.push({
        key: `g-${e.timestamp ?? e.date}`,
        type: 'gratitude',
        ts: e.timestamp ?? (Date.parse(e.date) || 0),
        preview: items[0] ?? '',
        count: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
        gratitude: items,
      });
    });

    (eveningEntries ?? []).forEach((e: any) => {
      const data = e.data ?? {};
      const pairs = NIGHTLY_QUESTIONS.map((q) => ({ q: q.q, a: String(data[q.key] ?? '').trim() }));
      const firstAnswered = pairs.find((p) => p.a);
      out.push({
        key: `n-${e.timestamp ?? e.date}`,
        type: 'nightly',
        ts: e.timestamp ?? (Date.parse(e.date) || 0),
        preview: firstAnswered?.a ?? '',
        count: '10th Step',
        nightly: pairs.filter((p) => p.a),
      });
    });

    (journalEntries ?? []).forEach((e) => {
      out.push({
        key: `j-${e.id}`,
        type: 'journal',
        ts: e.ts,
        preview: e.text.replace(/\s+/g, ' ').trim(),
        count: '',
        journal: e.text,
      });
    });

    spot.forEach((r) => {
      const selected = Object.entries(r.selections ?? {})
        .filter(([, v]) => v && v !== 'none')
        .map(([id]) => id);
      out.push({
        key: `s-${r.id}`,
        type: 'spotcheck',
        ts: Date.parse(r.ts) || 0,
        preview: (r.situation ?? '').trim(),
        count: 'Off the beam',
        spot: { situation: r.situation ?? '', selected },
      });
    });

    return out.sort((a, b) => b.ts - a.ts);
  }, [gratitudeEntries, eveningEntries, journalEntries, spot]);
}
