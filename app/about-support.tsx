import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { adjustFontWeight } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Coffee, Heart, Croissant } from 'lucide-react-native';

const AboutSupportScreen = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCoffeeSupportPress = (amount: number, description: string) => {
    setIsProcessing(true);
    
    // Simulate purchase processing
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Thank You!',
        'Thank you — your support helps me keep this app alive and growing.',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const handlePrivacyPress = () => {
    // Open privacy policy in browser
    Linking.openURL('https://soberdailies.com/privacy');
  };

  const handleTermsPress = () => {
    // Open terms of use in browser
    Linking.openURL('https://soberdailies.com/terms');
  };

  const handleSupportPress = () => {
    // Open support in browser
    Linking.openURL('https://soberdailies.com/support');
  };

    return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Bar */}
          <View style={styles.headerBar} />
          
          {/* Profile Photo */}
          <View style={styles.photoContainer}>
            <Image
              source={require('@/assets/images/about_neal.png')}
              style={styles.profilePhoto}
            />
          </View>

          {/* Introduction Text */}
          <View style={styles.introContainer}>
            <Text style={styles.introText}>
              I'm Neal, and I created this app to help me stay sober one day at a time. I'm grateful that it's now part of your journey too.
            </Text>
          </View>

          {/* Support Buttons */}
          <View style={styles.supportContainer}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(1.99, 'Drip Coffee')}
              disabled={isProcessing}
            >
              <Coffee size={20} color="#333" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Buy a Drip Coffee — $1.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(4.99, 'Mocha Latte')}
              disabled={isProcessing}
            >
              <Coffee size={20} color="#333" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Buy a Mocha Latte — $4.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => handleCoffeeSupportPress(7.99, 'Cinnamon Roll')}
              disabled={isProcessing}
            >
              <Croissant size={20} color="#333" style={styles.buttonIcon} />
              <Text style={styles.supportButtonText}>Throw in a Cinnamon Roll — $7.99</Text>
            </TouchableOpacity>

            <Text style={styles.supportNote}>
              Tips are optional and don't unlock features.
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Footer Links - Fixed at bottom */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity onPress={handlePrivacyPress}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerSeparator}>·</Text>
        
        <TouchableOpacity onPress={handleTermsPress}>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerSeparator}>·</Text>
        
        <TouchableOpacity onPress={handleSupportPress}>
          <Text style={styles.footerLink}>Support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBar: {
    height: 140,
    backgroundColor: '#4A94AF',
    width: '100%',
  },
  photoContainer: {
    alignItems: 'center',
    marginTop: -105,
    marginBottom: 20,
  },
  profilePhoto: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  introContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  introText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
    textAlign: 'center',
  },
  supportContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  supportButton: {
    backgroundColor: '#E8F4F8',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1E7ED',
  },
  buttonIcon: {
    marginRight: 12,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#333',
  },
  supportNote: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  footerLink: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: adjustFontWeight('400'),
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 13,
    color: '#6c757d',
    marginHorizontal: 16,
    fontWeight: adjustFontWeight('400'),
  },

});

export default AboutSupportScreen;
