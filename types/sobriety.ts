export interface DailyCheckIn {
  id: string;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'struggling' | 'difficult';
  gratitude: string[];
  reflection: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  sobrietyDate: string;
  dailyCheckIns: DailyCheckIn[];
  emergencyContacts: EmergencyContact[];
  lastCheckIn?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  days: number;
  icon: string;
  unlocked: boolean;
}