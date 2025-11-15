import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import SobrietyCounter from '@/components/SobrietyCounter';
import { formatDateDisplay } from '@/utils/dateUtils';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const HomeScreen = () => {
  const router = useRouter();
  
  // State for collapsible sections
  const [morningExpanded, setMorningExpanded] = useState(true);
  const [dayExpanded, setDayExpanded] = useState(true);
  const [eveningExpanded, setEveningExpanded] = useState(true);


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
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Sober Dailies</Text>
          <Text style={styles.heroSubtitle}>
            Do these daily. Stay sober.
          </Text>
          
        </View>

        {/* Sobriety Counter - centered between subtitle and daily reflection */}
        <View style={styles.sobrietyCounterContainer}>
          <SobrietyCounter />
        </View>

        {/* Daily Reflection Button */}
        <View style={styles.dailyReflectionWrapper}>
          <TouchableOpacity 
            onPress={() => router.push('/daily-reflections')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1B8FA3', '#147C72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.dailyReflectionGradient}
            >
              <View style={styles.reflectionInfo}>
                <Text style={styles.reflectionButtonTitle}>Daily Reflection</Text>
                <Text style={styles.reflectionButtonSubtitle}>
                  for {formattedDate.replace(/^\w+, /, '').replace(/, \d{4}$/, '')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Morning Routine Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeaderWrapper}
            onPress={() => setMorningExpanded(!morningExpanded)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1B8FA3', '#147C72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Morning Routine</Text>
                <Text style={styles.sectionDescription}>Start your day with intention and spiritual focus.</Text>
              </View>
              {morningExpanded ? (
                <ChevronDown size={20} color="#E6FFFA" />
              ) : (
                <ChevronRight size={20} color="#E6FFFA" />
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {morningExpanded && (
            <View style={styles.itemsContainer}>
              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/prayers?prayer=morning')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
                  </View>
                  <Text style={styles.cardTitle}>Morning Prayer</Text>
                </View>
                <Text style={styles.cardDescription}>Invite your higher power to help you through the day.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/gratitude')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FontAwesome6 name="face-smile" size={20} color={Colors.light.tint} solid={true} />
                  </View>
                  <Text style={styles.cardTitle}>Daily Gratitude</Text>
                </View>
                <Text style={styles.cardDescription}>Start your day with gratitude and stay in the solution.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/literature')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FontAwesome name="book" size={20} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.cardTitle}>Literature</Text>
                </View>
                <Text style={styles.cardDescription}>Read something out of the literature every day.</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Throughout the Day Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeaderWrapper}
            onPress={() => setDayExpanded(!dayExpanded)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1B8FA3', '#147C72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Throughout the Day</Text>
                <Text style={styles.sectionDescription}>Stay connected and mindful during your daily activities.</Text>
              </View>
              {dayExpanded ? (
                <ChevronDown size={20} color="#E6FFFA" />
              ) : (
                <ChevronRight size={20} color="#E6FFFA" />
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {dayExpanded && (
            <View style={styles.itemsContainer}>
              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/chat')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <MaterialCommunityIcons name="human-greeting-variant" size={22} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.cardTitle}>AI Sponsor</Text>
                </View>
                <Text style={styles.cardDescription}>Talk with an AI sponsor when you need guidance.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/prayers')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
                  </View>
                  <Text style={styles.cardTitle}>Prayers</Text>
                </View>
                <Text style={styles.cardDescription}>Connect with your Higher Power throughout the day.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/inventory')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <MaterialCommunityIcons name="emoticon-angry" size={24} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.cardTitle}>Spot Check Inventory</Text>
                </View>
                <Text style={styles.cardDescription}>When disturbed ask yourself: Are you on the beam or off the beam?</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Evening Routine Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeaderWrapper}
            onPress={() => setEveningExpanded(!eveningExpanded)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1B8FA3', '#147C72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Evening Routine</Text>
                <Text style={styles.sectionDescription}>Reflect and close your day with peace.</Text>
              </View>
              {eveningExpanded ? (
                <ChevronDown size={20} color="#E6FFFA" />
              ) : (
                <ChevronRight size={20} color="#E6FFFA" />
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {eveningExpanded && (
            <View style={styles.itemsContainer}>
              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/evening-review')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <Ionicons name="moon" size={20} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.cardTitle}>Nightly Review</Text>
                </View>
                <Text style={styles.cardDescription}>Reflect on your day and practice Step 10.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/(tabs)/prayers?prayer=evening')}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FontAwesome6 name="hands-praying" size={20} color={Colors.light.tint} solid={true} />
                  </View>
                  <Text style={styles.cardTitle}>Evening Prayer</Text>
                </View>
                <Text style={styles.cardDescription}>End your day with gratitude and humility.</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Support the Developer Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrapper}>
            <LinearGradient
              colors={['#1B8FA3', '#147C72']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>Enjoying Sober Dailies?</Text>
              </View>
            </LinearGradient>
          </View>
          
          <View style={styles.itemsContainer}>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/about-support')}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrapper}>
                  <FontAwesome name="heart" size={20} color={Colors.light.tint} />
                </View>
                <Text style={styles.cardTitle}>Support the Developer</Text>
              </View>
              <Text style={styles.cardDescription}>Make a difference with a one-time contribution</Text>
            </TouchableOpacity>
          </View>
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
    marginTop: 24,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B8FA3',
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
  dailyReflectionWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#03202B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 16,
  },
  dailyReflectionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
  },
  reflectionInfo: {
    flex: 1,
  },
  reflectionButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E6FFFA',
    marginBottom: 4,
  },
  reflectionButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(214, 245, 239, 0.9)',
  },
  sectionContainer: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeaderWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#03202B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 16,
  },
  sectionHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
  },
  sectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: '#E6FFFA',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(214, 245, 239, 0.9)',
  },
  itemsContainer: {
    marginTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  itemCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 8,
    shadowColor: '#041A25',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 10 : 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.32 : 0,
    shadowRadius: Platform.OS === 'ios' ? 20 : 0,
    ...Platform.select({
      android: {
        elevation: 12,
      },
    }),
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F0F4FF',
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
    marginBottom: 0,
  },
});

export default HomeScreen;
