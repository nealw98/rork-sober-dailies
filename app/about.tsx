import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

const AboutScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
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
            <View style={{ width: 60 }} />
          </View>
          <Text style={styles.headerTitle}>About Sober Dailies</Text>
        </LinearGradient>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.aboutText}>
            Hi friends,{"\n\n"}
            I created Sober Dailies because I wanted a simple way to stay consistent with my recovery practices. I needed something that would guide me through my daily habits and bring all the tools I used into one app. I'm grateful to share it with anyone who finds it helpful.{"\n\n"}
            Your contribution is completely voluntary, but it truly helps. It goes toward covering my development costs, keeping the app running smoothly, and funding future updates and improvements. My goal is to keep the core features free for anyone who wants to use them.{"\n\n"}
            Whether or not you contribute, I'm just glad you're here and that the app supports your journey.{"\n\n"}
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
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
