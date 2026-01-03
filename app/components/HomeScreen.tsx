import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Calendar, MessageCircle, Library, Sun, Moon, Settings } from 'lucide-react-native';
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
        {/* Feature List */}
        <View style={styles.featureList}>
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/daily-reflections')}
            activeOpacity={0.7}
          >
            <Calendar color="#5A82AB" size={24} />
            <Text style={styles.featureItemText}>Daily Reflection</Text>
            <ChevronRight color="#999" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/(tabs)/chat')}
            activeOpacity={0.7}
          >
            <MessageCircle color="#5A82AB" size={24} />
            <Text style={styles.featureItemText}>AI Sponsor</Text>
            <ChevronRight color="#999" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureItem, styles.featureItemLast]}
            onPress={() => router.push('/(tabs)/literature')}
            activeOpacity={0.7}
          >
            <Library color="#5A82AB" size={24} />
            <Text style={styles.featureItemText}>AA Literature</Text>
            <ChevronRight color="#999" size={20} />
          </TouchableOpacity>
        </View>

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
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  featureList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  featureItemLast: {
    borderBottomWidth: 0,
  },
  featureItemText: {
    flex: 1,
    fontSize: 17,
    fontWeight: adjustFontWeight('500'),
    color: '#333',
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
