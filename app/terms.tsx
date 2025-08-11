import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Terms of Use',
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTitleStyle: {
            fontWeight: adjustFontWeight('600', true),
          },
        }} 
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.effectiveDate}>
          Effective Date: July 29, 2025{'\n'}
          Last Updated: July 29, 2025
        </Text>

        <Text style={styles.paragraph}>
          Welcome to Sober Dailies ("the App"), a mobile and web application designed to support individuals in recovery by offering daily tools such as reflections, gratitude lists, nightly reviews, and chat-based sponsor-style guidance.
        </Text>

        <Text style={styles.paragraph}>
          By using the App, you ("User") agree to the following Terms of Use. If you do not agree, do not access or use the App.
        </Text>

        <Text style={styles.sectionTitle}>1. Purpose of the App</Text>
        <Text style={styles.paragraph}>
          Sober Dailies is intended to support personal recovery through structured tools inspired by 12-step recovery principles. The App includes an AI-powered sponsor-style chat, spiritual reflections, emotional review tools, and other features that encourage regular recovery habits.
        </Text>
        <Text style={styles.important}>
          The App is not a substitute for therapy, medical treatment, crisis intervention, or professional advice.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years old to use Sober Dailies. By using the App, you affirm that you are of legal age and capable of entering into this agreement.
        </Text>

        <Text style={styles.sectionTitle}>3. AI Sponsor Chat Disclaimer</Text>
        <Text style={styles.paragraph}>
          The AI sponsor chat personas (e.g., "Salty Sam," "Steady Eddie," "Gentle Grace") offer supportive responses based on recovery principles and user input. However:
        </Text>
        <Text style={styles.bulletPoint}>• The AI is not human and not a real sponsor.</Text>
        <Text style={styles.bulletPoint}>• The AI cannot provide medical, psychiatric, legal, or clinical advice.</Text>
        <Text style={styles.bulletPoint}>• Do not rely on the AI during a crisis. If you are in danger, call emergency services or a crisis hotline.</Text>
        <Text style={styles.bulletPoint}>• Use of the AI chat is at your own risk. The developers of Sober Dailies are not responsible for actions taken based on chat responses.</Text>

        <Text style={styles.sectionTitle}>4. Privacy</Text>
        <Text style={styles.paragraph}>
          Your data is stored locally on your device unless otherwise specified. We do not sell or share personal information. Please see our Privacy Policy for full details.
        </Text>

        <Text style={styles.sectionTitle}>5. Content and User Input</Text>
        <Text style={styles.paragraph}>
          You are responsible for any content you submit within the app, including journal entries, reflections, and chat inputs. Do not enter harmful, illegal, or abusive content.
        </Text>
        <Text style={styles.paragraph}>
          We reserve the right to remove or restrict access to features if there is evidence of misuse.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the fullest extent permitted by law:
        </Text>
        <Text style={styles.bulletPoint}>• The App is provided "as is" without warranties of any kind.</Text>
        <Text style={styles.bulletPoint}>• We are not liable for any damages arising from your use of the App or reliance on its content, including the AI chat.</Text>
        <Text style={styles.bulletPoint}>• Use of the App does not create any therapist-client, doctor-patient, or sponsor-sponsee relationship.</Text>

        <Text style={styles.sectionTitle}>7. Modifications</Text>
        <Text style={styles.paragraph}>
          We may update these Terms at any time. Continued use of the App after changes means you accept the updated Terms. The current version will always be available in-app and at soberdailies.com.
        </Text>

        <Text style={styles.sectionTitle}>8. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of the State of Utah, United States, without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms, contact us at:{'\n'}
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
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  important: {
    fontSize: 16,
    lineHeight: 24,
    color: '#d32f2f',
    marginBottom: 16,
    fontWeight: adjustFontWeight('600', true),
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
    marginLeft: 16,
  },
});