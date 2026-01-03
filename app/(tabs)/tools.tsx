import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { adjustFontWeight } from '@/constants/fonts';

interface ToolOption {
  id: string;
  title: string;
  description: string;
  route: string;
  emoji: string;
  backgroundColor: string;
}

const toolOptions: ToolOption[] = [
  {
    id: "gratitude",
    title: "Gratitude List",
    description: "Count your blessings and cultivate thankfulness.",
    route: "/(tabs)/gratitude",
    emoji: "😊",
    backgroundColor: "#a8d8a8",
  },
  {
    id: "prayers",
    title: "Prayers",
    description: "Essential prayers for recovery and reflection.",
    route: "/(tabs)/prayers",
    emoji: "🙏",
    backgroundColor: "#f5b8cc",
  },
  {
    id: "evening-review",
    title: "Nightly Review",
    description: "Reflect on your day with a 10th Step inventory.",
    route: "/(tabs)/evening-review",
    emoji: "🌙",
    backgroundColor: "#d8b8e8",
  }
];

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
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
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Daily Tools</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {toolOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.tile, { backgroundColor: option.backgroundColor }]}
            onPress={() => router.push(option.route as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.tileEmoji}>{option.emoji}</Text>
            <Text style={styles.tileTitle}>{option.title}</Text>
            <Text style={styles.tileDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  tile: {
    borderRadius: 16,
    padding: 20,
  },
  tileEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#000',
    marginBottom: 4,
  },
  tileDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
