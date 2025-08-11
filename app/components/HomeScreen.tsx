import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter } from 'expo-router';
import SunIcon from '@/components/SunIcon';
import SobrietyCounter from '@/components/SobrietyCounter';
import { formatDateDisplay } from '@/utils/dateUtils';
import Colors from '@/constants/colors';


const HomeScreen = () => {
  const router = useRouter();


  const today = new Date();
  const formattedDate = formatDateDisplay(today);



  return (
    <LinearGradient
      colors={['rgba(74, 144, 226, 0.3)', 'rgba(78, 205, 196, 0.2)', 'rgba(92, 184, 92, 0.1)']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <SunIcon size={120} />
          <Text style={styles.heroTitle}>Sober Dailies</Text>
          <Text style={styles.heroSubtitle}>
            This app helps you practice your dailies — the daily habits that maintain your sobriety. Doing these things consistently will support your continued sobriety and spiritual growth.
          </Text>
          
        </View>

        {/* Sobriety Counter - centered between subtitle and daily reflection */}
        <View style={styles.sobrietyCounterContainer}>
          <SobrietyCounter />
        </View>

        {/* Daily Reflection Button */}
        <TouchableOpacity 
          style={styles.dailyReflectionButton}
          onPress={() => router.push('/(tabs)/daily-reflections')}
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
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/prayers?prayer=morning')}>
          <Text style={styles.cardTitle}>Morning Prayer</Text>
          <Text style={styles.cardDescription}>Invite your higher power to help you through the day.</Text>
          <Text style={styles.cardButton}>Go to Morning Prayer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/gratitude')}>
          <Text style={styles.cardTitle}>Daily Gratitude</Text>
          <Text style={styles.cardDescription}>Start your day with gratitude and stay in the solution.</Text>
          <Text style={styles.cardButton}>Go to Gratitude</Text>
        </TouchableOpacity>

        


      </View>

        {/* Throughout the Day Section */}
        <View style={styles.sectionContainerDay}>
        <Text style={styles.sectionTitle}>Throughout the Day</Text>
        <Text style={styles.sectionSubtitle}>Stay connected and mindful during your daily activities.</Text>
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/chat')}>
          <Text style={styles.cardTitle}>AI Sponsor</Text>
          <Text style={styles.cardDescription}>Talk with an AI sponsor voice when you need support.</Text>
          <Text style={styles.cardButton}>Go to Chat</Text>
        </TouchableOpacity>



        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/literature')}>
          <Text style={styles.cardTitle}>Literature</Text>
          <Text style={styles.cardDescription}>Read something out of the literature every day.</Text>
          <Text style={styles.cardButton}>Go to Literature</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/inventory')}>
          <Text style={styles.cardTitle}>Spot Check Inventory</Text>
          <Text style={styles.cardDescription}>When we're upset, there's something wrong with us — are you “On the Beam”?</Text>
          <Text style={styles.cardButton}>Go to Spot Check Inventory</Text>
        </TouchableOpacity>
      </View>

        {/* Evening Routine Section */}
        <View style={styles.sectionContainerEvening}>
        <Text style={styles.sectionTitle}>Evening Routine</Text>
        <Text style={styles.sectionSubtitle}>Reflect and close your day with peace.</Text>
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/evening-review')}>
          <Text style={styles.cardTitle}>Evening Review</Text>
          <Text style={styles.cardDescription}>Reflect on your day and practice Step 10.</Text>
          <Text style={styles.cardButton}>Go to Evening Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/prayers?prayer=evening')}>
          <Text style={styles.cardTitle}>Evening Prayer</Text>
          <Text style={styles.cardDescription}>End your day with gratitude and humility.</Text>
          <Text style={styles.cardButton}>Go to Evening Prayer</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    width: '100%',
  },
  sobrietyCounterContainer: {
    marginTop: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 15,
    marginTop: 20,
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
    backgroundColor: 'rgba(255, 248, 220, 0.8)', // Soft yellow with transparency
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionContainerDay: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: 'rgba(135, 206, 235, 0.7)', // Soft blue with stronger opacity
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionContainerEvening: {
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: 'rgba(147, 51, 234, 0.3)', // Soft purple
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
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
});

export default HomeScreen;
