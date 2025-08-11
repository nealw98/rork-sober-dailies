import React from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Privacy Policy',
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: adjustFontWeight('600', true),
          },
        }} 
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy for Sober Dailies</Text>
        
        <Text style={styles.effectiveDate}>
          Effective Date: July 20, 2025
        </Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to Sober Dailies. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we handle your data when you use our application.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        
        <Text style={styles.subSectionTitle}>User-Provided Information</Text>
        <Text style={styles.bulletPoint}>• Chat Messages: Messages you send to the AI sponsors within the app</Text>
        <Text style={styles.bulletPoint}>• Bookmarks: Sections of the Big Book you bookmark</Text>
        <Text style={styles.bulletPoint}>• Favorites: Daily reflections you mark as favorites</Text>
        <Text style={styles.bulletPoint}>• Recently Viewed: Big Book sections you&apos;ve recently accessed</Text>

        <Text style={styles.subSectionTitle}>Automatically Collected Information</Text>
        <Text style={styles.bulletPoint}>• Usage Data: How you interact with the app</Text>
        <Text style={styles.bulletPoint}>• Device Information: Basic information about your device</Text>

        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
        <Text style={styles.bulletPoint}>• Save your preferences and settings</Text>
        <Text style={styles.bulletPoint}>• Enhance your experience with personalized content</Text>

        <Text style={styles.sectionTitle}>Data Storage</Text>
        <Text style={styles.paragraph}>
          All user data is stored locally on your device using secure storage methods. We do not transmit or store your personal data on external servers except when:
        </Text>
        <Text style={styles.bulletPoint}>1. Processing AI chat responses (messages are sent to our AI service provider)</Text>
        <Text style={styles.bulletPoint}>2. Opening external links to AA literature (standard web browsing)</Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our app uses the following third-party services:
        </Text>
        <Text style={styles.bulletPoint}>• AI text generation for sponsor chats</Text>
        <Text style={styles.bulletPoint}>• Links to official AA literature hosted on aa.org</Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal data</Text>
        <Text style={styles.bulletPoint}>• Delete your data (using the clear chat/history functions in the app)</Text>
        <Text style={styles.bulletPoint}>• Restrict processing</Text>

        <Text style={styles.sectionTitle}>Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Our app is not intended for children under 13 years of age.
        </Text>

        <Text style={styles.sectionTitle}>Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:{'\n'}
          support@soberdailies.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: adjustFontWeight('700', true),
    color: '#333',
    marginBottom: 16,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontWeight: adjustFontWeight('500', true),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600', true),
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
    marginLeft: 16,
  },
});