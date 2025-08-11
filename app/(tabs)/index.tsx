import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/use-sobriety-store';
import { Calendar, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DAILY_AFFIRMATIONS, ACHIEVEMENTS } from '@/constants/achievements';
import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, getDaysSober, getTodaysCheckIn, resetSobriety, isLoading } = useSobriety();
  
  const daysSober = getDaysSober();
  const todaysCheckIn = getTodaysCheckIn();
  
  const todaysAffirmation = useMemo(() => {
    const index = new Date().getDate() % DAILY_AFFIRMATIONS.length;
    return DAILY_AFFIRMATIONS[index];
  }, []);

  const currentAchievement = useMemo(() => {
    const achieved = ACHIEVEMENTS.filter(a => daysSober >= a.days);
    return achieved[achieved.length - 1];
  }, [daysSober]);

  const nextAchievement = useMemo(() => {
    return ACHIEVEMENTS.find(a => daysSober < a.days);
  }, [daysSober]);

  const handleCheckIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/check-in');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Sobriety Date',
      'Are you sure you want to reset your sobriety date? This will start your counter over.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetSobriety();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          }
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#6B46C1', '#9333EA', '#A855F7']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Sober Dailies</Text>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <RefreshCw size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Days Counter */}
          <View style={styles.counterCard}>
            <Text style={styles.daysNumber}>{daysSober}</Text>
            <Text style={styles.daysLabel}>Days Sober</Text>
            
            {currentAchievement && (
              <View style={styles.achievementBadge}>
                <Text style={styles.achievementEmoji}>{currentAchievement.icon}</Text>
                <Text style={styles.achievementText}>{currentAchievement.title}</Text>
              </View>
            )}
          </View>

          {/* Daily Affirmation */}
          <View style={styles.affirmationCard}>
            <Text style={styles.affirmationLabel}>Today&apos;s Affirmation</Text>
            <Text style={styles.affirmationText}>&ldquo;{todaysAffirmation}&rdquo;</Text>
          </View>

          {/* Check-in Button */}
          {!todaysCheckIn ? (
            <TouchableOpacity 
              style={styles.checkInButton}
              onPress={handleCheckIn}
              activeOpacity={0.8}
            >
              <CheckCircle size={24} color="#FFFFFF" />
              <Text style={styles.checkInButtonText}>Complete Daily Check-In</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.checkedInCard}>
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.checkedInText}>Today&apos;s check-in complete!</Text>
            </View>
          )}

          {/* Next Milestone */}
          {nextAchievement && (
            <View style={styles.nextMilestoneCard}>
              <Text style={styles.nextMilestoneLabel}>Next Milestone</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneEmoji}>{nextAchievement.icon}</Text>
                <View style={styles.milestoneTextContainer}>
                  <Text style={styles.milestoneTitle}>{nextAchievement.title}</Text>
                  <Text style={styles.milestoneDays}>
                    {nextAchievement.days - daysSober} days to go
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(daysSober / nextAchievement.days) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Sobriety Date */}
          <View style={styles.sobrietyDateCard}>
            <Calendar size={20} color="#6B46C1" />
            <Text style={styles.sobrietyDateText}>
              Sober since {new Date(profile.sobrietyDate).toLocaleDateString()}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B46C1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resetButton: {
    padding: 8,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  daysNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  daysLabel: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 5,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  achievementEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  affirmationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  affirmationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  affirmationText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#1F2937',
    textAlign: 'center',
  },
  checkInButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  checkedInCard: {
    backgroundColor: '#D1FAE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
  },
  checkedInText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  nextMilestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  nextMilestoneLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  milestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  milestoneEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  milestoneTextContainer: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  milestoneDays: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B46C1',
    borderRadius: 4,
  },
  sobrietyDateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  sobrietyDateText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
});