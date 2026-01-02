import React, { useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import SobrietyCounter from '@/components/SobrietyCounter';
import { formatDateDisplay } from '@/utils/dateUtils';
import Colors from '@/constants/colors';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

// Animated Card Component for micro-interactions
const AnimatedCard: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({ onPress, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const router = useRouter();


  const today = new Date();
  const formattedDate = formatDateDisplay(today);

  return (
    <LinearGradient
      colors={Colors.gradients.mainThreeColor}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sobriety Counter - Hero at top */}
        <View style={styles.sobrietyCounterContainer}>
          <SobrietyCounter />
        </View>

        {/* Daily Reflection Button */}
        <TouchableOpacity 
          style={styles.dailyReflectionButton}
          onPress={() => router.push('/daily-reflections')}
        >
          <Text style={styles.reflectionButtonTitle}>
            Daily Reflection{"\n"}for {formattedDate.replace(/^\w+, /, '').replace(/, \d{4}$/, '')}
          </Text>
        </TouchableOpacity>

        {/* Daily Practice Section */}
        <View style={styles.dailyPracticeHeader}>
        </View>

        {/* Morning Routine Section */}
        <View style={styles.sectionContainerMorning}>
        <Text style={styles.sectionTitle}>Morning Routine</Text>
        <Text style={styles.sectionSubtitle}>Start your day with intention and spiritual focus.</Text>
        
        <AnimatedCard onPress={() => router.push('/(tabs)/prayers?prayer=morning')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
            </View>
            <Text style={styles.cardTitle}>Morning Prayer</Text>
          </View>
          <Text style={styles.cardDescription}>Invite your higher power to help you through the day.</Text>
        </AnimatedCard>

        <AnimatedCard onPress={() => router.push('/(tabs)/gratitude')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <FontAwesome6 name="face-smile" size={20} color={Colors.light.tint} solid={true} />
            </View>
            <Text style={styles.cardTitle}>Daily Gratitude</Text>
          </View>
          <Text style={styles.cardDescription}>Start your day with gratitude and stay in the solution.</Text>
        </AnimatedCard>

        <AnimatedCard onPress={() => router.push('/(tabs)/literature')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <FontAwesome name="book" size={20} color={Colors.light.tint} />
            </View>
            <Text style={styles.cardTitle}>Literature</Text>
          </View>
          <Text style={styles.cardDescription}>Read something out of the literature every day.</Text>
        </AnimatedCard>

      </View>

        {/* Throughout the Day Section */}
        <View style={styles.sectionContainerDay}>
        <Text style={styles.sectionTitle}>Throughout the Day</Text>
        <Text style={styles.sectionSubtitle}>Stay connected and mindful during your daily activities.</Text>
        
        <AnimatedCard onPress={() => router.push('/(tabs)/chat')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <MaterialCommunityIcons name="human-greeting-variant" size={22} color={Colors.light.tint} />
            </View>
            <Text style={styles.cardTitle}>AI Sponsor</Text>
          </View>
          <Text style={styles.cardDescription}>Talk with an AI sponsor when you need guidance.</Text>
        </AnimatedCard>



        <AnimatedCard onPress={() => router.push('/(tabs)/prayers')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
            </View>
            <Text style={styles.cardTitle}>Prayers</Text>
          </View>
          <Text style={styles.cardDescription}>Connect with your Higher Power throughout the day.</Text>
        </AnimatedCard>
      </View>

        {/* Evening Routine Section */}
        <View style={styles.sectionContainerEvening}>
        <Text style={styles.sectionTitle}>Evening Routine</Text>
        <Text style={styles.sectionSubtitle}>Reflect and close your day with peace.</Text>
        
        <AnimatedCard onPress={() => router.push('/(tabs)/evening-review')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="moon" size={20} color={Colors.light.tint} />
            </View>
            <Text style={styles.cardTitle}>Nightly Review</Text>
          </View>
          <Text style={styles.cardDescription}>Reflect on your day and practice Step 10.</Text>
        </AnimatedCard>

        <AnimatedCard onPress={() => router.push('/(tabs)/prayers?prayer=evening')}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
            </View>
            <Text style={styles.cardTitle}>Evening Prayer</Text>
          </View>
          <Text style={styles.cardDescription}>End your day with gratitude and humility.</Text>
        </AnimatedCard>
        </View>

      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginTop: -24,
    marginBottom: -24,
    marginHorizontal: -16,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  heroSection: {
    paddingTop: 10,
    paddingBottom: 5,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    width: '100%',
  },
  sobrietyCounterContainer: {
    marginTop: 8,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 1,
    textAlign: 'center',
    maxWidth: '100%',
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  dailyReflectionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 0,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },
  reflectionButtonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  reflectionButtonSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  dailyPracticeHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  dailyPracticeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  dailyPracticeSubtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  sectionContainerMorning: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: '#FFFDF1', // Slightly softer pale yellow
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionContainerDay: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: '#E6F3FF', // Softer pale blue (matches paywall-feature)
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionContainerEvening: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: '#F8EEFF', // Slightly softer pale purple
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    // Level 1: Floating Elements (Highest depth)
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 0,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    marginBottom: 12,
  },
  cardButton: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
  sectionContainerTransparent: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: 'transparent',
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
});

export default HomeScreen;
