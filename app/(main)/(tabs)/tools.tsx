import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import {
  NotebookPen,
  Heart,
  CircleCheck,
  Moon,
  Phone,
  Users,
} from 'lucide-react-native';
// Prayer + Meditation use Phosphor (Lucide has no praying-hands / lotus) —
// per the DESIGN-DECISIONS icon lockdown.
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { fontFamily, fontSize, spacing, radii, shadows, getSemanticColors } from '@/constants/designTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

/**
 * Tools — pure launcher (redesign 3.0). Tap a tool to open it; no "Add to My
 * Day" pills here (curation lives in My Dailies). Structure mirrors the locked
 * `ToolsFinal` direction in `frames/hifi-tools-v2.jsx`:
 *   hero stack (Literature wide + Speaker / AI Sponsor) → categorized cards.
 * Daily Reflection is intentionally absent — it's the permanent hero on Today.
 */

type Tone = { solid: string; soft: string; ink: string };

const TONE: Record<string, Tone> = {
  teal: { solid: '#3D8B8B', soft: '#E7F1F1', ink: '#1F4F4F' },
  lavender: { solid: '#A386D5', soft: '#F3EEFA', ink: '#5C3F8F' },
  amber: { solid: '#E8A95D', soft: '#FCF0DE', ink: '#7A4A1F' },
  blue: { solid: '#5C8DFF', soft: '#E5ECF6', ink: '#3A6AE0' },
  coral: { solid: '#D36A5A', soft: '#FBE7E1', ink: '#7A2A1A' },
  plum: { solid: '#6B3FA0', soft: '#EFE7F7', ink: '#3F2070' },
};

// Both Lucide and Phosphor icon components accept { size, color } — type to the
// shared subset so we can mix the two libraries (Phosphor for prayer/meditation).
type GlyphComponent = React.ComponentType<{ size?: number; color?: string }>;

type ToolDef = {
  id: string;
  name: string;
  sub: string;
  tone: Tone;
  Icon: GlyphComponent;
  // null route → not built yet (net-new / deferred): show a graceful notice
  route: Href | null;
};

const SECTIONS: { title: string; tools: ToolDef[] }[] = [
  {
    title: 'Reflect & learn',
    tools: [
      { id: 'prayers', name: 'Prayers', sub: 'Daily prayers', tone: TONE.amber, Icon: HandsPraying, route: '/(main)/prayers' },
      { id: 'meditation', name: 'Meditation', sub: '11th step', tone: TONE.lavender, Icon: FlowerLotus, route: null },
    ],
  },
  {
    title: 'Write it down',
    tools: [
      { id: 'journal', name: 'Journal', sub: 'Free writing', tone: TONE.blue, Icon: NotebookPen, route: null },
      { id: 'gratitude', name: 'Gratitude', sub: 'Three things', tone: TONE.amber, Icon: Heart, route: '/(main)/gratitude' },
      { id: 'spotcheck', name: 'Spot Check Inventory', sub: 'In the moment', tone: TONE.coral, Icon: CircleCheck, route: '/(main)/inventory' },
      { id: 'nightly', name: 'Nightly Review', sub: '10th step', tone: TONE.lavender, Icon: Moon, route: '/(main)/evening-review' },
    ],
  },
  {
    title: 'Connect',
    tools: [
      { id: 'another', name: 'Reach Out', sub: 'Call someone', tone: TONE.blue, Icon: Phone, route: null },
      { id: 'meeting', name: 'Meetings', sub: 'Find a meeting', tone: TONE.lavender, Icon: Users, route: '/(main)/meeting-pocket' },
    ],
  },
];

const comingSoon = (name: string) =>
  Alert.alert('Coming soon', `${name} is on the way in the redesign.`);

export default function ToolsScreen() {
  const router = useRouter();
  const c = getSemanticColors('light');
  useScreenTimeTracking('Tools');

  const open = (route: Href | null, name: string) => {
    if (route) router.push(route);
    else comingSoon(name);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header (large) */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Tools</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Open any tool</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero stack — always-on top tools (not "featured") */}
        <Pressable
          onPress={() => router.push('/(main)/literature')}
          style={({ pressed }) => [styles.heroWide, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}
        >
          <ImageBackground
            source={require('@/assets/images/literature_hero3.webp')}
            style={styles.heroWidePhoto}
            imageStyle={styles.heroPhotoImg}
            resizeMode="cover"
          />
          <View style={styles.heroCaption}>
            <Text style={[styles.heroName, { color: c.text }]}>Literature</Text>
            <Text style={[styles.heroSub, { color: c.textMuted }]}>Big Book · 12&amp;12</Text>
          </View>
        </Pressable>

        <View style={styles.heroPair}>
          <Pressable
            onPress={() => router.push('/(main)/speakers')}
            style={({ pressed }) => [styles.heroSmall, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}
          >
            <Image source={require('@/assets/images/speakers_hero2.webp')} style={styles.heroSmallPhoto} resizeMode="cover" />
            <View style={styles.heroSmallCaption}>
              <Text style={[styles.heroSmallName, { color: c.text }]}>Speaker Tapes</Text>
              <Text style={[styles.heroSub, { color: c.textMuted }]}>AA talks library</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(main)/chat')}
            style={({ pressed }) => [styles.heroSmall, { backgroundColor: c.surface, borderColor: c.border }, pressed && styles.pressed]}
          >
            <Image source={require('@/assets/images/ai_sponsor_hero.webp')} style={styles.heroSmallPhoto} resizeMode="cover" />
            <View style={styles.heroSmallCaption}>
              <Text style={[styles.heroSmallName, { color: c.text }]}>AI Sponsor</Text>
              <Text style={[styles.heroSub, { color: c.textMuted }]}>Chat anytime</Text>
            </View>
          </Pressable>
        </View>

        {/* Categorized launcher cards */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{section.title}</Text>
            <View style={styles.grid}>
              {section.tools.map((tool) => {
                const { Icon } = tool;
                return (
                  <Pressable
                    key={tool.id}
                    onPress={() => open(tool.route, tool.name)}
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: c.surface, borderColor: c.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.medallion, { backgroundColor: tool.tone.solid, shadowColor: tool.tone.solid }]}>
                      <Icon size={19} color="#fff" />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={[styles.cardName, { color: c.text }]} numberOfLines={2}>{tool.name}</Text>
                      <Text style={[styles.cardSub, { color: c.textMuted }]} numberOfLines={1}>{tool.sub}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.md, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 120 },
  pressed: { opacity: 0.85 },

  // Wide hero (Literature)
  heroWide: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 10, ...shadows.sm },
  heroWidePhoto: { height: 132, width: '100%' },
  heroPhotoImg: {},
  heroCaption: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 13 },
  heroName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 19 },
  heroSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, marginTop: 2 },

  // Small hero pair (Speaker / AI Sponsor)
  heroPair: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  heroSmall: { flex: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden', ...shadows.sm },
  heroSmallPhoto: { height: 88, width: '100%' },
  heroSmallCaption: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  heroSmallName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, lineHeight: 18 },

  // Sections + cards
  section: { marginBottom: 18 },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 64,
  },
  medallion: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, lineHeight: 17 },
  cardSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, marginTop: 1 },
});
