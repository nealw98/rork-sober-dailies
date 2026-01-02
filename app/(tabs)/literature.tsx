import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { BookOpen, FileText, ChevronRight, ChevronLeft } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { useReadingSession } from "@/hooks/useReadingSession";

interface LiteratureOption {
  id: string;
  title: string;
  description: string;
  route: string;
}

const literatureOptions: LiteratureOption[] = [
  {
    id: "bigbook",
    title: "Alcoholics Anonymous",
    description: "The basic textbook for the AA program.",
    route: "/bigbook"
  },
  {
    id: "twelve-and-twelve",
    title: "Twelve Steps and Twelve Traditions",
    description: "In-depth exploration of the Steps and Traditions",
    route: "/twelve-and-twelve"
  },
  {
    id: "meeting-pocket",
    title: "AA Meeting Readings",
    description: "Quick access to the core AA readings used in meetings.",
    route: "/meeting-pocket"
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
        colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
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
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.headerTitle}>AA Literature</Text>
      </LinearGradient>
      
      {/* Off-white content area */}
      <View style={styles.content}>
        {literatureOptions.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionItem,
              index === literatureOptions.length - 1 && styles.optionItemLast
            ]}
            onPress={() => handleOptionPress(option.route)}
            activeOpacity={0.7}
            testID={`literature-option-${option.id}`}
          >
            <View style={styles.optionIcon}>
              {option.id === "bigbook" || option.id === "twelve-and-twelve" ? (
                <BookOpen size={24} color="#1E3A5F" />
              ) : (
                <FileText size={24} color="#1E3A5F" />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </View>
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 16,
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 58, 95, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: adjustFontWeight('600', true),
    color: '#000',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});