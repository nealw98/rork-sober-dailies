import React, { useMemo, useState } from 'react';
import { Platform, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Bookmark } from 'lucide-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import TextSettingsButton from '@/components/TextSettingsButton';
import SavedReflectionsModal from '@/components/SavedReflectionsModal';
import { DailyReflectionBookmarksProvider } from '@/hooks/use-daily-reflection-bookmarks';

export default function DailyReflectionsPage() {
  const { fontSize, lineHeight, resetDefaults } = useTextSettings();
  const [showSaved, setShowSaved] = useState(false);
  const [jumpToDate, setJumpToDate] = useState<Date | null>(null);
  const parseDateKey = (id: string) => {
    const [y, m, d] = id.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      resetDefaults();
    })
    .runOnJS(true), [resetDefaults]);

  return (
    <DailyReflectionBookmarksProvider>
      <ScreenContainer noPadding>
        <Stack.Screen
          options={{
            title: 'Daily Reflections',
            headerRight: () => (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setShowSaved(true)}
                  style={styles.savedButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Bookmark size={18} color={Colors.light.tint} />
                  <Text style={styles.savedText}>Saved</Text>
                </TouchableOpacity>
                <TextSettingsButton compact />
              </View>
            ),
          }}
        />
        <GestureDetector gesture={doubleTapGesture}>
          <DailyReflection
            fontSize={fontSize}
            lineHeight={lineHeight}
            jumpToDate={jumpToDate}
            onJumpApplied={() => setJumpToDate(null)}
          />
        </GestureDetector>
        <SavedReflectionsModal
          visible={showSaved}
          onClose={() => setShowSaved(false)}
          onSelect={(id) => {
            setJumpToDate(parseDateKey(id));
          }}
        />
      </ScreenContainer>
    </DailyReflectionBookmarksProvider>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Platform.OS === 'android' ? 4 : 6,
    paddingHorizontal: 4,
  },
  savedText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight('600'),
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: Platform.OS === 'android' ? 12 : 16,
    paddingRight: 2,
    height: 44,
  },
  fontSizeButton: {
    padding: 4,
    minWidth: 28,
    height: 44,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '400',
    lineHeight: 16,
  },
});