import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { adjustFontWeight } from '@/constants/fonts';

export default function WelcomeScreen() {
  const [isAgreed, setIsAgreed] = useState<boolean>(false);
  const { completeOnboarding } = useOnboarding();

  const handleTermsPress = () => {
    router.push('/terms');
  };

  const handlePrivacyPress = () => {
    router.push('/privacy');
  };

  const handleContinue = () => {
    if (isAgreed) {
      completeOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to Sober Dailies</Text>
            
            <Text style={styles.description}>
              This app supports daily recovery practices through tools like reflections, 
              gratitude tracking, and sponsor-style AI chat.
            </Text>

            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerTitle}>Please note:</Text>
              
              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  This app is not a substitute for therapy, medical advice, or emergency support.
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  The AI sponsor chat offers encouragement, but it is not human and cannot 
                  provide crisis support or clinical help.
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  If you&apos;re in immediate danger or emotional distress, please contact 
                  emergency services or a crisis hotline.
                </Text>
              </View>
            </View>

            <Text style={styles.agreementText}>
              By continuing, you agree to our{' '}
              <Text style={styles.link} onPress={handleTermsPress}>
                Terms of Use
              </Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={handlePrivacyPress}>
                Privacy Policy
              </Text>
              .
            </Text>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsAgreed(!isAgreed)}
              testID="agreement-checkbox"
            >
              <View style={[styles.checkbox, isAgreed && styles.checkboxChecked]}>
                {isAgreed && <Check size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxText}>
                I have read and agree to the Terms of Use and Privacy Policy.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, !isAgreed && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!isAgreed}
              testID="continue-button"
            >
              <Text style={[styles.continueButtonText, !isAgreed && styles.continueButtonTextDisabled]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: adjustFontWeight('700', true),
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.9,
  },
  disclaimerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: '#fff',
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.9,
  },
  agreementText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.9,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: adjustFontWeight('600', true),
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 25,
    minWidth: 200,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  continueButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});