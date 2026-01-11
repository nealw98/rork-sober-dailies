import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from "@/components/ScreenContainer";
import { adjustFontWeight } from "@/constants/fonts";
import { useReadingSession } from "@/hooks/useReadingSession";

interface LiteratureOption {
  id: string;
  title: string;
  description: string;
  route: string;
  emoji: string;
  backgroundColor: string;
}

const literatureOptions: LiteratureOption[] = [
  {
    id: "bigbook",
    title: "Alcoholics Anonymous",
    description: "",
    route: "/bigbook",
    emoji: "📖",
    backgroundColor: "#A87852", // Pete's brown
  },
  {
    id: "twelve-and-twelve",
    title: "Twelve Steps and Twelve Traditions",
    description: "",
    route: "/twelve-and-twelve",
    emoji: "📚",
    backgroundColor: "#E8884A", // Orange
  },
  {
    id: "meeting-pocket",
    title: "AA Meeting Readings",
    description: "",
    route: "/meeting-pocket",
    emoji: "📄",
    backgroundColor: "#8A65B5", // Purple
  }
];

export default function LiteratureScreen() {
  useReadingSession('literature');
  const insets = useSafeAreaInsets();

  const handleOptionPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScreenContainer style={styles.container} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header block */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
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
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>AA Literature</Text>
      </LinearGradient>
      
      {/* Off-white content area */}
      <View style={styles.content}>
        {literatureOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.tile, { backgroundColor: option.backgroundColor }]}
            onPress={() => handleOptionPress(option.route)}
            activeOpacity={0.8}
            testID={`literature-option-${option.id}`}
          >
            <Text style={styles.tileEmoji}>{option.emoji}</Text>
            <Text style={styles.tileTitle}>{option.title}</Text>
            {option.description ? <Text style={styles.tileDescription}>{option.description}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#fff',
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
    color: '#fff',
    marginBottom: 4,
  },
  tileDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});
