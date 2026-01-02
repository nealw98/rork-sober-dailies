import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Moon, ChevronLeft } from 'lucide-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { adjustFontWeight } from '@/constants/fonts';

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Daily Tools</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Morning Section */}
        <View style={styles.routineSection}>
          <View style={styles.sectionHeader}>
            <Sun color="#1E3A5F" size={18} />
            <Text style={styles.sectionTitle}>Morning</Text>
          </View>
          <View style={styles.tilesRow}>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => handleNavigate('/(tabs)/prayers?prayer=morning')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="hands-praying" size={24} color="#5A82AB" solid />
              <Text style={styles.tileLabel}>Prayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => handleNavigate('/(tabs)/gratitude')}
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
              onPress={() => handleNavigate('/(tabs)/prayers?prayer=evening')}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="hands-praying" size={24} color="#5A82AB" solid />
              <Text style={styles.tileLabel}>Prayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => handleNavigate('/(tabs)/evening-review')}
              activeOpacity={0.7}
            >
              <Ionicons name="moon" size={24} color="#5A82AB" />
              <Text style={styles.tileLabel}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  routineSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
});
