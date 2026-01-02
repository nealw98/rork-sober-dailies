import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, BookOpen, MessageCircle, Library, Sun, Moon, Settings } from 'lucide-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';

import SobrietyCounter from '@/components/SobrietyCounter';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();


  return (
    <View style={styles.container}>
      {/* Gradient Header with Sobriety Counter */}
      <LinearGradient
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.sobrietyCounterContainer}>
          <SobrietyCounter />
        </View>
      </LinearGradient>

      {/* Off-white Content Area */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Feature 1: Daily Reflection */}
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.push('/daily-reflections')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
            style={styles.heroButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BookOpen color="#fff" size={28} />
            <View style={styles.heroButtonText}>
              <Text style={styles.heroButtonTitle}>Daily Reflection</Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.7)" size={24} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Hero Feature 2: AI Sponsor */}
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.push('/(tabs)/chat')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
            style={styles.heroButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MessageCircle color="#fff" size={28} />
            <View style={styles.heroButtonText}>
              <Text style={styles.heroButtonTitle}>AI Sponsor</Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.7)" size={24} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Hero Feature 3: Literature */}
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.push('/(tabs)/literature')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
            style={styles.heroButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Library color="#fff" size={28} />
            <View style={styles.heroButtonText}>
              <Text style={styles.heroButtonTitle}>AA Literature</Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.7)" size={24} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Morning Section */}
        <View style={styles.routineSection}>
          <View style={styles.sectionHeader}>
            <Sun color="#1E3A5F" size={18} />
            <Text style={styles.sectionTitle}>Morning</Text>
          </View>
          <View style={styles.tilesRow}>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => router.push('/(tabs)/prayers?prayer=morning')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="hands-praying" size={24} color="#5A82AB" solid />
              <Text style={styles.tileLabel}>Prayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => router.push('/(tabs)/gratitude')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="face-smile" size={24} color="#5A82AB" solid />
              <Text style={styles.tileLabel}>Gratitude</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Evening Section */}
        <View style={styles.routineSection}>
          <View style={styles.sectionHeader}>
            <Moon color="#1E3A5F" size={18} />
            <Text style={styles.sectionTitle}>Evening</Text>
          </View>
          <View style={styles.tilesRow}>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => router.push('/(tabs)/prayers?prayer=evening')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="hands-praying" size={24} color="#5A82AB" solid />
              <Text style={styles.tileLabel}>Prayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => router.push('/(tabs)/evening-review')}
              activeOpacity={0.7}
            >
              <Ionicons name="moon" size={24} color="#5A82AB" />
              <Text style={styles.tileLabel}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
        >
          <Settings color="#666" size={20} />
          <Text style={styles.settingsText}>Settings</Text>
          <ChevronRight color="#999" size={20} />
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerGradient: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  sobrietyCounterContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  heroButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  heroButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  heroButtonTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  routineSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#1E3A5F',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: '#333',
    marginTop: 8,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;
