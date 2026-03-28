import { Achievement } from '@/types/sobriety';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: '24hours',
    title: 'First Day',
    description: 'You made it through your first 24 hours',
    days: 1,
    icon: '🌅',
    unlocked: false,
  },
  {
    id: 'week',
    title: 'One Week Strong',
    description: 'A full week of sobriety',
    days: 7,
    icon: '💪',
    unlocked: false,
  },
  {
    id: 'month',
    title: 'Monthly Milestone',
    description: '30 days of continuous sobriety',
    days: 30,
    icon: '🌟',
    unlocked: false,
  },
  {
    id: '90days',
    title: 'Quarter Year',
    description: '90 days - You\'re building new habits',
    days: 90,
    icon: '🏆',
    unlocked: false,
  },
  {
    id: '6months',
    title: 'Half Year Hero',
    description: '6 months of dedication',
    days: 180,
    icon: '🎯',
    unlocked: false,
  },
  {
    id: 'year',
    title: 'One Year Wonder',
    description: 'A full year of sobriety',
    days: 365,
    icon: '🎉',
    unlocked: false,
  },
];

export const DAILY_AFFIRMATIONS = [
  "One day at a time",
  "Progress, not perfection",
  "I am stronger than my struggles",
  "Today I choose recovery",
  "I am worthy of a sober life",
  "My recovery is a priority",
  "I am grateful for this new day",
  "I have the power to change",
  "Sobriety is my superpower",
  "I am becoming who I'm meant to be",
  "Every sober day is a victory",
  "I choose healing over habits",
];

export const MOOD_COLORS = {
  great: '#4CAF50',
  good: '#8BC34A',
  okay: '#FFC107',
  struggling: '#FF9800',
  difficult: '#F44336',
};

export const MOOD_EMOJIS = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  struggling: '😔',
  difficult: '😢',
};