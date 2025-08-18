import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Book, ChevronRight } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";

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
  }
];

export default function LiteratureScreen() {
  const handleOptionPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>AA Literature</Text>
        <Text style={styles.subtitle}>
          Access the foundational texts of Alcoholics Anonymous
        </Text>
        
        <View style={styles.optionsContainer}>
          {literatureOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option.route)}
              activeOpacity={0.7}
              testID={`literature-option-${option.id}`}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <Book size={24} color={Colors.light.tint} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <ChevronRight size={20} color={Colors.light.muted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.light.tint}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600', true),
    color: Colors.light.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
  },
});