import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { adjustFontWeight } from '@/constants/fonts';

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/gratitude')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="face-smile" size={22} color="#5A82AB" solid />
          <Text style={styles.menuItemText}>Gratitude List</Text>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/prayers')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="hands-praying" size={22} color="#5A82AB" solid />
          <Text style={styles.menuItemText}>Prayers</Text>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/evening-review')}
          activeOpacity={0.7}
        >
          <Ionicons name="moon" size={22} color="#5A82AB" />
          <Text style={styles.menuItemText}>Nightly Review</Text>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
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
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    gap: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 17,
    fontWeight: adjustFontWeight('500'),
    color: '#333',
  },
});
