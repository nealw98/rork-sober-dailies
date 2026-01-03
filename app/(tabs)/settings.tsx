import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Share, ScrollView, Modal } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Star, Share2, Heart, Info, Type } from 'lucide-react-native';
import { requestReviewNow } from '@/lib/reviewPrompt';
import ScreenContainer from '@/components/ScreenContainer';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import Colors from '@/constants/colors';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [showTextSettings, setShowTextSettings] = useState(false);
  const { fontSize, setFontSize, resetDefaults, minFontSize, maxFontSize, lineHeight } = useTextSettings();
  
  const step = 2;
  const increase = () => setFontSize(fontSize + step);
  const decrease = () => setFontSize(fontSize - step);

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
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>
      
      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setShowTextSettings(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemIcon}>
            <Type size={22} color="#1E3A5F" />
          </View>
          <View style={styles.menuItemText}>
            <Text style={styles.menuItemTitle}>Text Size</Text>
            <Text style={styles.menuItemDescription}>Adjust reading text size</Text>
          </View>
          <Text style={styles.menuItemValue}>{fontSize}</Text>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>

        {/* Support Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Support Sober Dailies</Text>
        
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
      
      {/* Text Size Modal */}
      <Modal visible={showTextSettings} transparent animationType="fade" onRequestClose={() => setShowTextSettings(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTextSettings(false)}>
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetDefaults} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Text Size</Text>
              <TouchableOpacity onPress={() => setShowTextSettings(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.resetText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text
                style={[
                  styles.previewText,
                  { fontSize, lineHeight, fontWeight: adjustFontWeight("500"), textAlign: "center" },
                ]}
              >
                "Daily progress one day at a time."
              </Text>
              <Text style={styles.previewMeta}>{`Size ${fontSize}`}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.circleButton, fontSize <= minFontSize && styles.circleButtonDisabled]}
                onPress={decrease}
                disabled={fontSize <= minFontSize}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.buttonLabel}>Smaller</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.circleButton, fontSize >= maxFontSize && styles.circleButtonDisabled]}
                onPress={increase}
                disabled={fontSize >= maxFontSize}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.buttonLabel}>Larger</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

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
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 32,
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
  menuItemValue: {
    fontSize: 15,
    color: '#666',
    marginRight: 4,
  },
  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("700"),
    color: Colors.light.text,
  },
  resetText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: adjustFontWeight("600"),
  },
  preview: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  previewLabel: {
    color: Colors.light.muted,
    fontSize: 12,
    fontWeight: adjustFontWeight("600"),
  },
  previewText: {
    color: Colors.light.text,
  },
  previewMeta: {
    fontSize: 12,
    color: Colors.light.muted,
    marginTop: 2,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  circleButtonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.text,
  },
});

