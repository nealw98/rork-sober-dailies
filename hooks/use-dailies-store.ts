import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type DailySection = 'Morning' | 'Anytime' | 'Evening';
export type DailyTone = 'teal' | 'amber' | 'blue' | 'lavender' | 'coral' | 'gray';
export type DailyAction =
  | 'prayer'
  | 'prayerMorning'
  | 'gratitude'
  | 'meeting'
  | 'lit'
  | 'spotcheck'
  | 'nightly'
  | 'prayerEvening'
  | 'speaker'
  | 'journal'
  | 'meditation'
  | 'call'
  | 'custom'
  | 'quick';

export interface DailyItem {
  id: string;
  label: string;
  section: DailySection;
  action: DailyAction;
  route?: string;
  subtitle?: string;
  icon: string;
  tone: DailyTone;
  custom?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddDailyTemplate {
  label: string;
  action: DailyAction;
  route?: string;
  subtitle?: string;
  icon: string;
  tone: DailyTone;
  custom?: boolean;
  category?: 'tool' | 'quick';
}

const DAILIES_STORAGE_KEY = 'sober_dailies_my_dailies_v2';
const COMPLETIONS_STORAGE_KEY = 'sober_dailies_daily_completions_v1';

const SECTIONS: DailySection[] = ['Morning', 'Anytime', 'Evening'];

const STARTER_DAILIES: Omit<DailyItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'prayerM',
    label: 'Say my Morning Prayer',
    section: 'Morning',
    action: 'prayerMorning',
    route: '/(main)/prayers?prayer=morning',
    icon: 'pray',
    tone: 'amber',
    order: 10,
  },
  {
    id: 'grat',
    label: 'Write my Gratitude List',
    section: 'Morning',
    action: 'gratitude',
    route: '/(main)/gratitude',
    icon: 'heart',
    tone: 'amber',
    order: 20,
  },
  {
    id: 'attend-meeting',
    label: 'Attend a meeting',
    section: 'Anytime',
    action: 'meeting',
    route: '/(main)/meeting-pocket',
    icon: 'users',
    tone: 'lavender',
    order: 10,
  },
  {
    id: 'lit',
    label: 'Read the literature',
    section: 'Anytime',
    action: 'lit',
    route: '/(main)/literature',
    icon: 'library',
    tone: 'teal',
    order: 20,
  },
  {
    id: 'nightly',
    label: 'Nightly Review',
    section: 'Evening',
    action: 'nightly',
    route: '/(main)/evening-review',
    icon: 'moon',
    tone: 'lavender',
    order: 10,
  },
  {
    id: 'prayerE',
    label: 'Say my Evening Prayer',
    section: 'Evening',
    action: 'prayerEvening',
    route: '/(main)/prayers?prayer=evening',
    icon: 'pray',
    tone: 'amber',
    order: 20,
  },
];

export const ADD_DAILY_TEMPLATES: AddDailyTemplate[] = [
  {
    label: 'Say a prayer',
    action: 'prayer',
    route: '/(main)/prayers',
    icon: 'pray',
    tone: 'amber',
    category: 'tool',
  },
  {
    label: 'Write my Gratitude List',
    action: 'gratitude',
    route: '/(main)/gratitude',
    icon: 'heart',
    tone: 'amber',
    category: 'tool',
  },
  {
    label: 'Read the literature',
    action: 'lit',
    route: '/(main)/literature',
    icon: 'library',
    tone: 'teal',
    category: 'tool',
  },
  {
    label: 'Nightly Review',
    action: 'nightly',
    route: '/(main)/evening-review',
    icon: 'moon',
    tone: 'lavender',
    category: 'tool',
  },
  {
    label: 'Listen to a speaker tape',
    action: 'speaker',
    route: '/(main)/speakers',
    icon: 'play',
    tone: 'lavender',
    category: 'tool',
  },
  {
    label: 'Attend a meeting',
    action: 'meeting',
    route: '/(main)/meeting-pocket',
    icon: 'users',
    tone: 'lavender',
    category: 'tool',
  },
  {
    label: 'Write in my journal',
    action: 'journal',
    icon: 'journal',
    tone: 'teal',
    category: 'tool',
  },
  {
    label: 'Spot Check Inventory',
    action: 'spotcheck',
    route: '/(main)/inventory',
    icon: 'check',
    tone: 'coral',
    category: 'tool',
  },
  {
    label: 'Meditation',
    action: 'meditation',
    icon: 'lotus',
    tone: 'teal',
    category: 'tool',
  },
  {
    label: 'Call another alcoholic',
    action: 'call',
    icon: 'phone',
    tone: 'blue',
    category: 'tool',
  },
  {
    label: 'Make my bed',
    action: 'quick',
    icon: 'home',
    tone: 'gray',
    category: 'quick',
  },
  {
    label: 'Get some exercise',
    action: 'quick',
    icon: 'heart',
    tone: 'coral',
    category: 'quick',
  },
  {
    label: 'Do some service',
    action: 'quick',
    icon: 'users',
    tone: 'teal',
    category: 'quick',
  },
];

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function withTimestamps(items: Omit<DailyItem, 'createdAt' | 'updatedAt'>[]): DailyItem[] {
  const now = new Date().toISOString();
  return items.map(item => ({
    ...item,
    createdAt: now,
    updatedAt: now,
  }));
}

function sortDailies(items: DailyItem[]) {
  return [...items].sort((a, b) => {
    const sectionDiff = SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section);
    if (sectionDiff !== 0) return sectionDiff;
    return a.order - b.order;
  });
}

export const [DailiesProvider, useDailiesStore] = createContextHook(() => {
  const [items, setItems] = useState<DailyItem[]>([]);
  const [completedByDate, setCompletedByDate] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [storedItems, storedCompletions] = await Promise.all([
          AsyncStorage.getItem(DAILIES_STORAGE_KEY),
          AsyncStorage.getItem(COMPLETIONS_STORAGE_KEY),
        ]);

        if (!mounted) return;

        if (storedItems) {
          const parsedItems = JSON.parse(storedItems);
          setItems(Array.isArray(parsedItems) ? sortDailies(parsedItems) : withTimestamps(STARTER_DAILIES));
        } else {
          const seeded = withTimestamps(STARTER_DAILIES);
          setItems(seeded);
          await AsyncStorage.setItem(DAILIES_STORAGE_KEY, JSON.stringify(seeded));
        }

        if (storedCompletions) {
          const parsedCompletions = JSON.parse(storedCompletions);
          setCompletedByDate(parsedCompletions && typeof parsedCompletions === 'object' ? parsedCompletions : {});
        }
      } catch (error) {
        console.error('[Dailies] Failed to load store', error);
        if (mounted) setItems(withTimestamps(STARTER_DAILIES));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveItems = useCallback(async (nextItems: DailyItem[]) => {
    const sorted = sortDailies(nextItems);
    setItems(sorted);
    await AsyncStorage.setItem(DAILIES_STORAGE_KEY, JSON.stringify(sorted));
  }, []);

  const saveCompletions = useCallback(async (nextCompletions: Record<string, string[]>) => {
    setCompletedByDate(nextCompletions);
    await AsyncStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(nextCompletions));
  }, []);

  const todaysCompletedIds = useMemo(() => completedByDate[todayKey()] || [], [completedByDate]);

  const isDoneToday = useCallback((id: string) => todaysCompletedIds.includes(id), [todaysCompletedIds]);

  const setDoneForDate = useCallback(async (id: string, done: boolean, date = todayKey()) => {
    const current = completedByDate[date] || [];
    const nextIds = done
      ? Array.from(new Set([...current, id]))
      : current.filter(completedId => completedId !== id);
    await saveCompletions({
      ...completedByDate,
      [date]: nextIds,
    });
  }, [completedByDate, saveCompletions]);

  const toggleDoneToday = useCallback(async (id: string) => {
    await setDoneForDate(id, !isDoneToday(id));
  }, [isDoneToday, setDoneForDate]);

  const addDaily = useCallback(async (template: AddDailyTemplate, section: DailySection) => {
    const now = new Date().toISOString();
    const sectionItems = items.filter(item => item.section === section);
    const nextOrder = sectionItems.length
      ? Math.max(...sectionItems.map(item => item.order)) + 10
      : 10;
    const newItem: DailyItem = {
      id: `daily-${Date.now()}`,
      label: template.label,
      section,
      action: template.action,
      route: template.route,
      subtitle: template.subtitle,
      icon: template.icon,
      tone: template.tone,
      custom: template.custom,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
    await saveItems([...items, newItem]);
    return newItem;
  }, [items, saveItems]);

  const updateDaily = useCallback(async (id: string, updates: Partial<Pick<DailyItem, 'label' | 'section' | 'subtitle'>>) => {
    const now = new Date().toISOString();
    const nextItems = items.map(item => {
      if (item.id !== id) return item;
      const movedToNewSection = updates.section && updates.section !== item.section;
      const sectionItems = items.filter(candidate => candidate.section === updates.section);
      const nextOrder = movedToNewSection && updates.section
        ? (sectionItems.length ? Math.max(...sectionItems.map(candidate => candidate.order)) + 10 : 10)
        : item.order;
      return {
        ...item,
        ...updates,
        order: nextOrder,
        updatedAt: now,
      };
    });
    await saveItems(nextItems);
  }, [items, saveItems]);

  const removeDaily = useCallback(async (id: string) => {
    await saveItems(items.filter(item => item.id !== id));
    const nextCompletions = Object.fromEntries(
      Object.entries(completedByDate).map(([date, ids]) => [date, ids.filter(completedId => completedId !== id)]),
    );
    await saveCompletions(nextCompletions);
  }, [completedByDate, items, saveCompletions, saveItems]);

  const sectionItems = useCallback((section: DailySection) => {
    return sortDailies(items.filter(item => item.section === section));
  }, [items]);

  const getSectionProgress = useCallback((section: DailySection) => {
    const dailies = sectionItems(section);
    const doneCount = dailies.filter(item => isDoneToday(item.id)).length;
    return { doneCount, totalCount: dailies.length };
  }, [isDoneToday, sectionItems]);

  return useMemo(() => ({
    items,
    isLoading,
    todaysCompletedIds,
    todayKey,
    sectionItems,
    getSectionProgress,
    isDoneToday,
    toggleDoneToday,
    setDoneForDate,
    addDaily,
    updateDaily,
    removeDaily,
  }), [
    addDaily,
    getSectionProgress,
    isDoneToday,
    isLoading,
    items,
    removeDaily,
    sectionItems,
    setDoneForDate,
    todaysCompletedIds,
    toggleDoneToday,
    updateDaily,
  ]);
});
