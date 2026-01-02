import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Share, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Star, Share2, Heart, Info } from 'lucide-react-native';
import { requestReviewNow } from '@/lib/reviewPrompt';
import ScreenContainer from '@/components/ScreenContainer';
import { adjustFontWeight } from '@/constants/fonts';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const handleRateAppPress = async () => {
    try {
      try {
        const didShowNativePrompt = await requestReviewNow();
        if (didShowNativePrompt) {
          console.log('[settings] Successfully showed native review prompt');
          return;
        }
        console.log('[settings] Native review prompt not available, falling back to store URL');
      } catch (error) {
        console.warn('[settings] Native review prompt failed, falling back to store URL', error);
      }

      if (Platform.OS === 'ios') {
        const appStoreId = '6749869819';
        const url = `itms-apps://itunes.apple.com/app/id${appStoreId}?action=write-review`;
        await Linking.openURL(url);
      } else {
        const packageName = 'com.nealwagner.soberdailies';
        const url = `market://details?id=${packageName}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening store for rating:', error);
    }
  };

  const handleSharePress = async () => {
    try {
      const appStoreUrl =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/sober-dailies/id6738032000'
          : 'https://play.google.com/store/apps/details?id=com.nealwagner.soberdailies';

      await Share.share({
        message: 'Sober Dailies helps me stay sober one day at a time. Check it out: ' + appStoreUrl,
      });
    } catch {
      // no-op
    }
  };

  return (
    <ScreenContainer style={styles.container} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
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
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>
      
      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support Sober Dailies</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleRateAppPress}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemIcon}>
            <Star size={22} color="#1E3A5F" />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>Rate & Review</Text>
            <Text style={styles.menuItemDescription}>Leave a review in the App Store or Play Store</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleSharePress}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemIcon}>
            <Share2 size={22} color="#1E3A5F" />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>Share the App</Text>
            <Text style={styles.menuItemDescription}>Invite a friend by sharing Sober Dailies</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/about-support')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemIcon}>
            <Heart size={22} color="#1E3A5F" />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>Support the Developer</Text>
            <Text style={styles.menuItemDescription}>Make a difference with a one-time contribution</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>About</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => router.push('/about-support')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemIcon}>
            <Info size={22} color="#1E3A5F" />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>About Sober Dailies</Text>
            <Text style={styles.menuItemDescription}>Version info and acknowledgments</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: adjustFontWeight('600'),
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#666',
  },
});

