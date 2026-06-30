import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import {
  NotebookPen,
  Heart,
  CircleCheck,
  Moon,
  Phone,
  Users,
  Settings,
  Mic,
  ChevronRight,
} from 'lucide-react-native';
// Prayer + Meditation use Phosphor (Lucide has no praying-hands / lotus).
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { colors, fontFamily, fontSize, shadows, getSemanticColors, lighten } from '@/constants/designTokens';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

const c = getSemanticColors('light');

/**
 * Tools — the app's launcher (redesign 3.0). A featured Literature hero, the two
 * conversational flagships (Speaker Tapes · AI Sponsor) as colored cards, and the
 * remaining tools as a clean white-tile grid. Pure launcher — no completion.
 */

const INK = c.text;
const H_PAD = 22;     // ScrollView horizontal padding (each side)
const CARD_GAP = 12;  // gap between the two flagship cards

type GlyphComponent = React.ComponentType<{ size?: number; color?: string }>;

// ─── Flagship cards (Speaker Tapes · AI Sponsor) ─────────────────────────────
type Flag = { bg: string; circle: string; ink: string };
const SPEAKER: Flag = { bg: lighten(colors.steel, 0.62), circle: colors.steel, ink: colors.steelDark };
const SPONSOR: Flag = { bg: lighten(colors.tertiary, 0.56), circle: colors.tertiary, ink: colors.tertiaryDark };

// ─── Grid tools — white tile + line icon in the tool's tone ──────────────────
type AppDef = { id: string; name: string; color: string; Icon: GlyphComponent; route: Href };

const APPS: AppDef[] = [
  { id: 'prayers', name: 'Prayers', color: colors.primary, Icon: HandsPraying, route: '/(main)/prayers' },
  { id: 'meditation', name: 'Meditation', color: colors.tertiary, Icon: FlowerLotus, route: '/(main)/meditation' },
  { id: 'journal', name: 'Journal', color: colors.primary, Icon: NotebookPen, route: '/(main)/journal' as Href },
  { id: 'gratitude', name: 'Gratitude', color: colors.accent, Icon: Heart, route: '/(main)/gratitude' },
  { id: 'spotcheck', name: 'Spot Check', color: colors.accent, Icon: CircleCheck, route: '/(main)/inventory' },
  { id: 'nightly', name: 'Nightly Review', color: colors.tertiary, Icon: Moon, route: '/(main)/evening-review' },
  { id: 'another', name: 'Reach Out', color: colors.steel, Icon: Phone, route: '/(main)/reach-out' as Href },
  { id: 'meeting', name: 'Meetings', color: colors.steel, Icon: Users, route: '/(main)/meetings' },
];

function FlagCard({ flag, Icon, title, subtitle, onPress }: { flag: Flag; Icon: GlyphComponent; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.flagCard, { backgroundColor: flag.bg }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.flagTop}>
        <View style={[styles.flagCircle, { backgroundColor: flag.circle }]}>
          <Icon size={22} color="#fff" />
        </View>
        <ChevronRight size={18} color={flag.ink} strokeWidth={2.2} />
      </View>
      <View>
        <Text style={styles.flagTitle}>{title}</Text>
        <Text style={styles.flagSub} numberOfLines={2}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function AppTile({ app, onPress }: { app: AppDef; onPress: () => void }) {
  const { Icon } = app;
  return (
    <Pressable style={styles.gridCell} onPress={onPress} accessibilityRole="button" accessibilityLabel={app.name}>
      <View style={styles.tile}>
        <Icon size={26} color={app.color} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>{app.name}</Text>
    </Pressable>
  );
}

export default function ToolsScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  useScreenTimeTracking('Tools');

  const heroH = Math.round((screenW - H_PAD * 2) * 0.55);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tools</Text>
          <Text style={styles.subtitle}>Open the support you need</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.gear}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
        >
          <Settings size={18} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Featured hero — Literature */}
        <Pressable style={[styles.hero, { height: heroH }]} onPress={() => router.push('/(main)/literature')} accessibilityRole="button" accessibilityLabel="Literature">
          <Image source={require('@/assets/images/literature-hero4.webp')} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.featured}>
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
          <View style={styles.heroBottom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Literature</Text>
              <Text style={styles.heroSub}>Read. Reflect. Grow.</Text>
            </View>
            <View style={styles.heroArrow}>
              <ChevronRight size={22} color={INK} strokeWidth={2.4} />
            </View>
          </View>
        </Pressable>

        {/* Flagship cards */}
        <View style={styles.flagRow}>
          <FlagCard flag={SPEAKER} Icon={Mic} title="Speaker Tapes" subtitle="Members' experience, strength and hope." onPress={() => router.push('/(main)/speakers')} />
          <FlagCard flag={SPONSOR} Icon={Users} title="AI Sponsor" subtitle="Guidance and encouragement anytime." onPress={() => router.push('/(main)/chat')} />
        </View>

        {/* Tool grid */}
        <View style={styles.grid}>
          {APPS.map((app) => (
            <AppTile key={app.id} app={app} onPress={() => router.push(app.route)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text },
  subtitle: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textMuted, marginTop: 2 },
  gear: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: H_PAD, paddingTop: 6, paddingBottom: 130 },

  // Featured hero
  hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primary, marginBottom: 14, ...shadows.md },
  featured: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  featuredText: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1, color: '#fff' },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 18 },
  heroTitle: { fontFamily: fontFamily.displayBold, fontSize: 30, color: '#fff', letterSpacing: -0.6, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  heroSub: { fontFamily: fontFamily.medium, fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroArrow: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.sm },

  // Flagship cards
  flagRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: 22 },
  flagCard: { flex: 1, height: 150, borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  flagTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flagCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  flagTitle: { fontFamily: fontFamily.semiBold, fontSize: 16.5, color: c.text, letterSpacing: -0.2 },
  flagSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: 'rgba(35,37,41,0.62)', marginTop: 3, lineHeight: 17 },

  // Tool grid — white tiles with a line icon, label beneath
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '25%', alignItems: 'center', marginBottom: 16 },
  tile: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  tileLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: c.text, textAlign: 'center', marginTop: 8, width: 80 },
});
