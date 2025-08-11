import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface WeeklyProgressDay {
  date: string;
  dayName?: string;
  completed: boolean;
  isFuture?: boolean;
}

interface WeeklyProgressCardProps {
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  data: WeeklyProgressDay[];
}

const styles = StyleSheet.create({
  progressCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  progressStats: {
    fontSize: 14,
    color: Colors.light.muted,
    marginTop: 8
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.light.muted,
    fontWeight: adjustFontWeight('500', true)
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2
  },
  dayCircleCompleted: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent
  },
  dayCircleIncomplete: {
    backgroundColor: 'transparent',
    borderColor: Colors.light.divider
  },
  completedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white'
  }
});

export default function WeeklyProgressCard({ title, icon: IconComponent, data }: WeeklyProgressCardProps) {
  const completedDays = data.filter(day => day.completed && !day.isFuture).length;
  
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitle}>
          <IconComponent size={20} color={Colors.light.tint} />
          <Text style={styles.progressTitle}>{title}</Text>
        </View>
      </View>
      
      <View style={styles.weekContainer}>
        {data.map((day, index) => {
          const dayName = day.dayName ? day.dayName.slice(0, 3) : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
          const isFuture = day.isFuture !== undefined ? day.isFuture : new Date(day.date) > new Date();
          
          return (
            <View key={day.date || index} style={styles.dayContainer}>
              <Text style={styles.dayLabel}>{dayName}</Text>
              <View style={[
                styles.dayCircle,
                (day.completed && !isFuture) ? styles.dayCircleCompleted : styles.dayCircleIncomplete
              ]}>
                {(day.completed && !isFuture) && (
                  <View style={styles.completedDot} />
                )}
              </View>
            </View>
          );
        })}
      </View>
      
      {completedDays > 0 && (
        <Text style={styles.progressStats}>
          Great job! You completed {completedDays} day{completedDays !== 1 ? 's' : ''} this week.
        </Text>
      )}
    </View>
  );
}