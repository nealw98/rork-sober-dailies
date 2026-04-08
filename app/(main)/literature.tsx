import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { BookOpen } from "lucide-react-native";
import ScreenContainer from "@/components/ScreenContainer";
import { useReadingSession } from "@/hooks/useReadingSession";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";
import TopLevelHeader from "@/components/navigation/TopLevelHeader";
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
} from "@/constants/designTokens";

const sem = semanticColors.light;

interface LiteratureOption {
  id: string;
  title: string;
  description: string;
  route: string;
  emoji: string;
  color?: string;
}

const literatureOptions: LiteratureOption[] = [
  { id: "bigbook", title: "Alcoholics Anonymous", description: "The Big Book — the foundation of the program", route: "/bigbook", emoji: "📖", color: colors.secondary },
  { id: "twelve-and-twelve", title: "Twelve Steps and Twelve Traditions", description: "A deeper look at the principles of recovery", route: "/twelve-and-twelve", emoji: "📚", color: colors.tertiary },
  { id: "meeting-pocket", title: "AA Meeting Readings", description: "Common readings used in meetings", route: "/meeting-pocket", emoji: "📄", color: undefined },
];

export default function LiteratureScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('Literature');

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: sem.background }]}>
        <TopLevelHeader title="" />

        {/* Page intro */}
        <View style={styles.pageIntro}>
          <View style={styles.introLabelRow}>
            <BookOpen size={14} color={sem.textMuted} />
            <Text style={styles.introLabel}>LIBRARY</Text>
          </View>
          <Text style={styles.introTitle}>AA Literature</Text>
        </View>

        {/* Literature cards */}
        <View style={styles.content}>
          {literatureOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => router.push(option.route as any)}
              activeOpacity={0.85}
              style={[styles.card, option.color ? { backgroundColor: option.color } : {}]}
            >
              <Text style={styles.cardEmoji}>{option.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, option.color ? { color: colors.white } : {}]}>{option.title}</Text>
                <Text style={[styles.cardDescription, option.color ? { color: 'rgba(255,255,255,0.85)' } : {}]}>{option.description}</Text>
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
  },

  // ── Page Intro ──
  pageIntro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  introLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  introLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: sem.textMuted,
    letterSpacing: 1.5,
  },
  introTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    color: sem.text,
  },

  // ── Content ──
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // ── Cards ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: sem.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: sem.textSecondary,
    lineHeight: 18,
  },
});
