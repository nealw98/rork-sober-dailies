import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSobriety } from '@/hooks/use-sobriety-store';
import { BookOpen, Calendar } from 'lucide-react-native';
import { MOOD_COLORS, MOOD_EMOJIS } from '@/constants/achievements';
import { useState } from 'react';

export default function JournalScreen() {
  const { profile } = useSobriety();
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const groupedEntries = profile.dailyCheckIns.reduce((acc, entry) => {
    const date = new Date(entry.date).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof profile.dailyCheckIns>);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BookOpen size={28} color="#6B46C1" />
        <Text style={styles.headerTitle}>Your Journal</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedEntries).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📝</Text>
            <Text style={styles.emptyStateTitle}>No journal entries yet</Text>
            <Text style={styles.emptyStateText}>
              Complete your daily check-ins to start building your journal
            </Text>
          </View>
        ) : (
          Object.entries(groupedEntries).map(([month, entries]) => (
            <View key={month} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{month}</Text>
              
              {entries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.entryCard,
                    selectedEntry === entry.id && styles.entryCardExpanded
                  ]}
                  onPress={() => setSelectedEntry(
                    selectedEntry === entry.id ? null : entry.id
                  )}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryDateContainer}>
                      <Calendar size={16} color="#6B7280" />
                      <Text style={styles.entryDate}>
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.moodContainer}>
                      <Text style={styles.moodEmoji}>
                        {MOOD_EMOJIS[entry.mood]}
                      </Text>
                      <View 
                        style={[
                          styles.moodDot,
                          { backgroundColor: MOOD_COLORS[entry.mood] }
                        ]}
                      />
                    </View>
                  </View>

                  {selectedEntry === entry.id && (
                    <View style={styles.entryContent}>
                      {entry.reflection && (
                        <View style={styles.reflectionSection}>
                          <Text style={styles.sectionLabel}>Reflection</Text>
                          <Text style={styles.reflectionText}>{entry.reflection}</Text>
                        </View>
                      )}
                      
                      {entry.gratitude.length > 0 && (
                        <View style={styles.gratitudeSection}>
                          <Text style={styles.sectionLabel}>Grateful For</Text>
                          {entry.gratitude.map((item, index) => (
                            <View key={index} style={styles.gratitudeItem}>
                              <Text style={styles.gratitudeBullet}>•</Text>
                              <Text style={styles.gratitudeText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  monthSection: {
    marginBottom: 25,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B46C1',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  entryCardExpanded: {
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reflectionSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reflectionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  gratitudeSection: {
    marginTop: 12,
  },
  gratitudeItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gratitudeBullet: {
    fontSize: 14,
    color: '#6B46C1',
    marginRight: 8,
  },
  gratitudeText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
});