import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

const AboutScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Teal Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>About Sober Dailies</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.aboutText}>
            Hi friends,{"\n\n"}
            I built Sober Dailies because I know what it takes to stay consistent with daily recovery practices. After over two decades of morning readings, inventories, and nightly reviews, I wanted to bring all those tools together in one simple app.{"\n\n"}
            Over the years, I've met so many different personalities in the rooms—sponsors who all carry the same message but deliver it in their own unique style. Some are tough love, some are gentle, some make you laugh. I wanted to capture that experience with the AI Sponsors. The program doesn't change, but the voice delivering it can match your style.{"\n\n"}
            Right now, all features are free. Voluntary contributions help cover operating costs—especially the AI—and keep it that way.{"\n\n"}
            Thanks for being here.{"\n\n"}
            — Neal
          </Text>
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3D8B8B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  aboutText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
  },
});

export default AboutScreen;
