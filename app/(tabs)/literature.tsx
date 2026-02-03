import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { useCallback } from "react";
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from "@/components/ScreenContainer";
import { useTheme } from "@/hooks/useTheme";
import { adjustFontWeight } from "@/constants/fonts";
import { useReadingSession } from "@/hooks/useReadingSession";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";

interface LiteratureOption {
  id: string;
  title: string;
  description: string;
  route: string;
  emoji: string;
}

const literatureOptions: LiteratureOption[] = [
  { id: "bigbook", title: "Alcoholics Anonymous", description: "", route: "/bigbook", emoji: "📖" },
  { id: "twelve-and-twelve", title: "Twelve Steps and Twelve Traditions", description: "", route: "/twelve-and-twelve", emoji: "📚" },
  { id: "meeting-pocket", title: "AA Meeting Readings", description: "", route: "/meeting-pocket", emoji: "📄" },
];

export default function LiteratureScreen() {
  const posthog = usePostHog();
  const { palette } = useTheme();
  useReadingSession('literature');
  useScreenTimeTracking('Literature');
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Literature');
    }, [posthog])
  );

  const handleOptionPress = (route: string, literatureId: string) => {
    // Map literature ID to section name
    const sectionMap: Record<string, string> = {
      'bigbook': 'Big Book',
      'twelve-and-twelve': '12 Steps & 12 Traditions',
      'meeting-pocket': 'Meeting Guide'
    };
    
    posthog?.capture('literature_selected', { 
      $screen_name: 'Literature',
      literature_id: literatureId,
      literature_section: sectionMap[literatureId] || literatureId
    });
    router.push(route as any);
  };

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: palette.background }]} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={palette.gradients.header as [string, string, ...string[]]}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top row with back button */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={palette.headerText} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={[styles.headerTitle, { color: palette.headerText }]}>AA Literature</Text>
      </LinearGradient>
      
      {/* Off-white content area */}
      <View style={styles.content}>
        {literatureOptions.map((option) => {
          // Get the right color for each literature option
          const tileColors = option.id === 'bigbook' 
            ? palette.literatureTiles.bigbook 
            : option.id === 'twelve-and-twelve'
              ? palette.literatureTiles.twelveAndTwelve
              : palette.literatureTiles.meetingPocket;
          
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.route, option.id)}
              activeOpacity={0.8}
              testID={`literature-option-${option.id}`}
            >
              <LinearGradient
                colors={tileColors as [string, string, ...string[]]}
                style={styles.tile}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <Text style={styles.tileEmoji}>{option.emoji}</Text>
                <Text style={[styles.tileTitle, { color: palette.heroTileText }]}>{option.title}</Text>
                {option.description ? <Text style={[styles.tileDescription, { color: palette.heroTileText }]}>{option.description}</Text> : null}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  tile: {
    borderRadius: 16,
    padding: 20,
  },
  tileEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 22,
    fontWeight: adjustFontWeight('600'),
    marginBottom: 4,
  },
  tileDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
