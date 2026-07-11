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
  Mic,
} from 'lucide-react-native';
// Prayer + Meditation use Phosphor (Lucide has no praying-hands / lotus).
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';
import { fontFamily, fontSize, shadows, lighten, steelFill, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { ThemedCard } from '@/components/ThemedCard';
import GiftGlyph from '@/components/GiftGlyph';
import SettingsGear from '@/components/navigation/SettingsGear';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useGiftWallet } from '@/hooks/use-gift-wallet';

/**
 * Tools — the app's launcher (redesign 3.0). A featured Literature hero, the two
 * conversational flagships (Speaker Tapes · AI Sponsor) as colored cards, and the
 * remaining tools as a clean white-tile grid. Pure launcher — no completion.
 *
 * Dark mode (Dark Mode Handoff): the flagships drop their tinted backgrounds and
 * become neutral surface cards identical to the grid tiles — the colored round
 * icon is the only differentiator. The Literature photo hero stays saturated.
 */

const H_PAD = 22;     // ScrollView horizontal padding (each side)
const CARD_GAP = 12;  // gap between the two flagship cards

type GlyphComponent = React.ComponentType<{ size?: number; color?: string }>;

// ─── Flagship cards (Speaker Tapes · AI Sponsor) ─────────────────────────────
type Flag = { bg: string; circle: string };

// ─── Grid tools — tile + line icon in the tool's tone ────────────────────────
type AppDef = { id: string; name: string; tone: 'primary' | 'tertiary' | 'accent' | 'steel' | 'rose'; Icon: GlyphComponent; route: Href };

const APPS: AppDef[] = [
  { id: 'prayers', name: 'Prayers', tone: 'primary', Icon: HandsPraying, route: '/(main)/prayers' },
  { id: 'meditation', name: 'Meditation', tone: 'tertiary', Icon: FlowerLotus, route: '/(main)/meditation' },
  { id: 'journal', name: 'Journal', tone: 'primary', Icon: NotebookPen, route: '/(main)/journal' as Href },
  { id: 'gratitude', name: 'Gratitude', tone: 'accent', Icon: Heart, route: '/(main)/gratitude' },
  { id: 'spotcheck', name: 'Spot Check', tone: 'accent', Icon: CircleCheck, route: '/(main)/inventory' },
  { id: 'nightly', name: 'Nightly Review', tone: 'tertiary', Icon: Moon, route: '/(main)/evening-review' },
  { id: 'another', name: 'Reach Out', tone: 'steel', Icon: Phone, route: '/(main)/reach-out' as Href },
  { id: 'meeting', name: 'Meetings', tone: 'steel', Icon: Users, route: '/(main)/meetings' },
  // 9th tile (3×3) — Pass It On. Rose is deliberately outside the four tool
  // families; the route flips to the wallet once codes exist (handoff Phase 4).
  { id: 'passiton', name: 'Pass It On', tone: 'rose', Icon: GiftGlyph, route: '/(main)/pass-it-on' as Href },
];

function FlagCard({ flag, Icon, title, subtitle, onPress, isDark, styles }: {
  flag: Flag; Icon: GlyphComponent; title: string; subtitle: string; onPress: () => void;
  isDark: boolean; styles: ReturnType<typeof makeStyles>;
}) {
  const body = (
    <>
      <View style={styles.flagTop}>
        <View style={[styles.flagCircle, { backgroundColor: flag.circle }]}>
          <Icon size={22} color="#fff" />
        </View>
      </View>
      <View>
        <Text style={styles.flagTitle}>{title}</Text>
        <Text style={styles.flagSub} numberOfLines={2}>{subtitle}</Text>
      </View>
    </>
  );
  if (isDark) {
    // Neutral lit surface — the colored circle is the only family cue.
    return (
      <Pressable style={{ flex: 1 }} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
        <ThemedCard radius={20} contentStyle={styles.flagCardInner}>{body}</ThemedCard>
      </Pressable>
    );
  }
  return (
    <Pressable style={[styles.flagCard, { backgroundColor: flag.bg }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Pressable>
  );
}

// Grid tile — a white card holding a solid family coin (white glyph) + label.
// Dark mode swaps the white card for the neutral lit surface; the coin keeps its
// solid family color so the tools stay legible and on-family in both modes.
function AppTile({ app, color, width, onPress, isDark, styles }: {
  app: AppDef; color: string; width: number; onPress: () => void; isDark: boolean; styles: ReturnType<typeof makeStyles>;
}) {
  const { Icon } = app;
  const body = (
    <>
      <View style={[styles.coin, { backgroundColor: color }]}>
        <Icon size={24} color="#fff" />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>{app.name}</Text>
    </>
  );
  return (
    <Pressable style={{ width }} onPress={onPress} accessibilityRole="button" accessibilityLabel={app.name}>
      {isDark ? (
        <ThemedCard radius={20} shadow="sm" contentStyle={styles.tileInner}>{body}</ThemedCard>
      ) : (
        <View style={styles.tileCard}>{body}</View>
      )}
    </Pressable>
  );
}

export default function ToolsScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  const { isDark, colors, c } = useTokens();
  const { hasEverBought } = useGiftWallet();
  useScreenTimeTracking('Tools');

  const heroH = Math.round((screenW - H_PAD * 2) * 0.55);

  // Flagship tones: light keeps the tinted cards; dark goes neutral with a
  // solid family circle (steelFill carries white on dark — handoff).
  const SPEAKER: Flag = isDark
    ? { bg: c.surface, circle: steelFill.dark }
    : { bg: lighten(colors.steel, 0.62), circle: colors.steel };
  const SPONSOR: Flag = isDark
    ? { bg: c.surface, circle: '#8273B5' }
    : { bg: lighten(colors.tertiary, 0.56), circle: colors.tertiary };

  // 3-column grid: each tile's width fits three across the padded content with a CARD_GAP between.
  const tileW = Math.floor((screenW - H_PAD * 2 - CARD_GAP * 2) / 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tools</Text>
          <Text style={styles.subtitle}>Open the support you need</Text>
        </View>
        <SettingsGear style={styles.gear} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Featured hero — Literature (photo jewel: stays saturated on dark) */}
        <Pressable style={[styles.hero, { height: heroH }]} onPress={() => router.push('/(main)/(tabs)/literature')} accessibilityRole="button" accessibilityLabel="Literature">
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
          </View>
        </Pressable>

        {/* Flagship cards */}
        <View style={styles.flagRow}>
          <FlagCard flag={SPEAKER} Icon={Mic} title="Speaker Tapes" subtitle="Members' experience, strength and hope." onPress={() => router.push('/(main)/speakers')} isDark={isDark} styles={styles} />
          <FlagCard flag={SPONSOR} Icon={Users} title="AI Sponsor" subtitle="Guidance and encouragement anytime." onPress={() => router.push('/(main)/chat')} isDark={isDark} styles={styles} />
        </View>

        {/* Tool grid */}
        <View style={styles.grid}>
          {APPS.map((app) => (
            <AppTile
              key={app.id}
              app={app}
              color={colors[app.tone]}
              width={tileW}
              onPress={() => router.push(
                app.id === 'passiton' && hasEverBought ? ('/(main)/gift-wallet' as Href) : app.route
              )}
              isDark={isDark}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
      safe: { flex: 1, backgroundColor: c.background },
      // Tab header: title row starts at paddingTop 54 — the y where back-button
      // screens' titles land — with the gear inline, and a roomy paddingBottom.
      header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: H_PAD, paddingTop: 54, paddingBottom: 28 },
      gear: { paddingTop: 4 },
      title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
      subtitle: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 2 },

      scroll: { paddingHorizontal: H_PAD, paddingTop: 6, paddingBottom: 130 },

      // Featured hero
      hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primary, marginBottom: 14, ...shadows.md },
      featured: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
      featuredText: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1, color: '#fff' },
      heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 18 },
      heroTitle: { fontFamily: fontFamily.displayBold, fontSize: 32, color: '#fff', letterSpacing: -0.6, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
      heroSub: { fontFamily: fontFamily.medium, fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },

      // Flagship cards
      flagRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: 22 },
      flagCard: { flex: 1, height: 150, borderRadius: 20, padding: 16, justifyContent: 'space-between' },
      flagCardInner: { height: 150, padding: 16, justifyContent: 'space-between' },
      flagTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      flagCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
      flagTitle: { fontFamily: fontFamily.semiBold, fontSize: 16.5, color: c.text, letterSpacing: -0.2 },
      flagSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 3, lineHeight: 17 },

      // Tool grid — 3 columns of white cards: a solid family coin + label.
      grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
      tileCard: { height: 112, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
      tileInner: { height: 112, alignItems: 'center', justifyContent: 'center' },
      coin: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
      tileLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.text, textAlign: 'center', lineHeight: 15, paddingHorizontal: 4 },
  });
};
