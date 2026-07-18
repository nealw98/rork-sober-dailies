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
import { V2_DAILIES } from '@/hooks/use-dailies-store';

export type NotebookType = 'gratitude' | 'nightly' | 'spotcheck' | 'journal';

export type NotebookEntry = {
  key: string;
  type: NotebookType;
  ts: number; // ms epoch
  preview: string;
  count: string; // small right-aligned label
  date?: string;  // 'YYYY-MM-DD' — gratitude/nightly write-back identity
  id?: string;    // journal/spotcheck record id — write-back identity
  gratitude?: string[];
  nightly?: { q: string; a: string }[];
  checks?: string[]; // v2 Nightly Review "Daily Actions" labels — the checklist rides with the entry
  spot?: { situation: string; selected: string[] };
  journal?: string;
};

type SpotRecord = { id: string; ts: string; situation: string; selections: Record<string, string> };

const SPOT_KEY = 'spot_check_inventories';

export type NotebookApi = {
  entries: NotebookEntry[];
  // Edit a spot-check record in place (situation + chosen defects), keeping its
  // id + ts. Persists to AsyncStorage and refreshes the in-memory feed.
  updateSpotRecord: (id: string, next: { situation: string; selected: string[] }) => void;
  deleteSpotRecord: (id: string) => void;
};

export function useNotebook(): NotebookApi {
  const gratitude = useGratitudeStore();
  const evening = useEveningReviewStore();
  const journal = useJournal();
  const [spot, setSpot] = useState<SpotRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem(SPOT_KEY)
        .then((s) => { if (alive && s) setSpot(JSON.parse(s)); })
        .catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  const updateSpotRecord = useCallback((id: string, next: { situation: string; selected: string[] }) => {
    setSpot((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== id) return r;
        const selections: Record<string, 'lookFor'> = {};
        next.selected.forEach((sid) => { selections[sid] = 'lookFor'; });
        return { ...r, situation: next.situation, selections };
      });
      AsyncStorage.setItem(SPOT_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const deleteSpotRecord = useCallback((id: string) => {
    setSpot((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(SPOT_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const gratitudeEntries = gratitude?.savedEntries;
  const eveningEntries = evening?.savedEntries;
  const journalEntries = journal?.entries;

  const entries = useMemo(() => {
    const out: NotebookEntry[] = [];

    (gratitudeEntries ?? []).forEach((e: any) => {
      const items: string[] = e.items ?? [];
      out.push({
        key: `g-${e.timestamp ?? e.date}`,
        type: 'gratitude',
        ts: e.timestamp ?? (Date.parse(e.date) || 0),
        date: e.date,
        preview: items[0] ?? '',
        count: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
        gratitude: items,
      });
    });

    (eveningEntries ?? []).forEach((e: any) => {
      const data = e.data ?? {};
      const pairs = NIGHTLY_QUESTIONS.map((q) => ({ q: q.q, a: String(data[q.key] ?? '').trim() }));
      const firstAnswered = pairs.find((p) => p.a);
      // A v2 review is ONE entry, the shape it had in v2: its "Daily Actions"
      // checklist rides with the card, so checklist-only reviews render too.
      const checks = V2_DAILIES.filter((it) => !!data[it.id]).map((it) => it.label);
      if (!firstAnswered && checks.length === 0) return;
      out.push({
        key: `n-${e.timestamp ?? e.date}`,
        type: 'nightly',
        ts: e.timestamp ?? (Date.parse(e.date) || 0),
        date: e.date,
        preview: firstAnswered?.a ?? `Daily actions: ${checks.length} of ${V2_DAILIES.length}`,
        count: '10th Step',
        nightly: pairs.filter((p) => p.a),
        checks: checks.length > 0 ? checks : undefined,
      });
    });

    (journalEntries ?? []).forEach((e) => {
      out.push({
        key: `j-${e.id}`,
        type: 'journal',
        ts: e.ts,
        id: e.id,
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
        id: r.id,
        preview: (r.situation ?? '').trim(),
        count: 'Off the beam',
        spot: { situation: r.situation ?? '', selected },
      });
    });

    return out.sort((a, b) => b.ts - a.ts);
  }, [gratitudeEntries, eveningEntries, journalEntries, spot]);

  return { entries, updateSpotRecord, deleteSpotRecord };
}
