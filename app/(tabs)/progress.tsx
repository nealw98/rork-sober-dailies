import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/use-sobriety-store';
import { TrendingUp, Award } from 'lucide-react-native';
import { ACHIEVEMENTS, MOOD_COLORS, MOOD_EMOJIS } from '@/constants/achievements';
import { useMemo } from 'react';

export default function ProgressScreen() {
  const { profile, getDaysSober } = useSobriety();
  const daysSober = getDaysSober();

  const moodStats = useMemo(() => {
    const stats = {
      great: 0,
      good: 0,
      okay: 0,
      struggling: 0,
      difficult: 0,
    };
    
    profile.dailyCheckIns.forEach(checkIn => {
      stats[checkIn.mood]++;
    });
    
    return stats;
  }, [profile.dailyCheckIns]);

  const totalCheckIns = profile.dailyCheckIns.length;
  const checkInStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasCheckIn = profile.dailyCheckIns.some(
        c => new Date(c.date).toDateString() === checkDate.toDateString()
      );
      
      if (hasCheckIn) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }, [profile.dailyCheckIns]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={28} color="#6B46C1" />
        <Text style={styles.headerTitle}>Your Progress</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{daysSober}</Text>
            <Text style={styles.statLabel}>Days Sober</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{checkInStreak}</Text>
            <Text style={styles.statLabel}>Check-in Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalCheckIns}</Text>
            <Text style={styles.statLabel}>Total Check-ins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {totalCheckIns > 0 
                ? Math.round((checkInStreak / daysSober) * 100) 
                : 0}%
            </Text>
            <Text style={styles.statLabel}>Consistency</Text>
          </View>
        </View>

        {/* Mood Tracker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Trends</Text>
          <View style={styles.moodChart}>
            {Object.entries(moodStats).map(([mood, count]) => {
              const percentage = totalCheckIns > 0 ? (count / totalCheckIns) * 100 : 0;
              return (
                <View key={mood} style={styles.moodRow}>
                  <View style={styles.moodLabel}>
                    <Text style={styles.moodEmoji}>
                      {MOOD_EMOJIS[mood as keyof typeof MOOD_EMOJIS]}
                    </Text>
                    <Text style={styles.moodName}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.moodBarContainer}>
                    <View 
                      style={[
                        styles.moodBar,
                        { 
                          width: `${percentage}%`,
                          backgroundColor: MOOD_COLORS[mood as keyof typeof MOOD_COLORS]
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.moodCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#6B46C1" />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = daysSober >= achievement.days;
              return (
                <View 
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    isUnlocked && styles.achievementUnlocked
                  ]}
                >
                  <Text style={[
                    styles.achievementEmoji,
                    !isUnlocked && styles.achievementLocked
                  ]}>
                    {isUnlocked ? achievement.icon : '🔒'}
                  </Text>
                  <Text style={[
                    styles.achievementTitle,
                    !isUnlocked && styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementDays,
                    !isUnlocked && styles.achievementDaysLocked
                  ]}>
                    {achievement.days} days
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Motivational Stats */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationTitle}>Keep Going!</Text>
          <Text style={styles.motivationText}>
            You&apos;ve been sober for {daysSober} days. That&apos;s {daysSober * 24} hours of strength and determination!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 30,
  },
  statCard: {
    width: '50%',
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B46C1',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  moodChart: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  moodName: {
    fontSize: 12,
    color: '#4B5563',
  },
  moodBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  moodBar: {
    height: '100%',
    borderRadius: 10,
  },
  moodCount: {
    fontSize: 12,
    color: '#6B7280',
    width: 20,
    textAlign: 'right',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  achievementCard: {
    width: '33.333%',
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  achievementUnlocked: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: '#9CA3AF',
  },
  achievementDays: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  achievementDaysLocked: {
    color: '#D1D5DB',
  },
  motivationCard: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    padding: 24,
    marginTop: 10,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B46C1',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});