// WhatsInsideCarousel.tsx — the "What's inside" onboarding step (DECIDED July 13, 2026).
// Replaces WhatsInsideStep (the one-page summary) in components/OnboardingFlow.tsx.
// Drop at: components/onboarding/WhatsInsideCarousel.tsx — see HANDOFF.md.
//
// 4-card carousel, STATIC vignettes (functional previews deliberately dropped),
// Skip prominent + up front. Order: Today (program + sponsor FAB peek) →
// AI Sponsor (the emotional hook) → Tools (the inventory) → Journey (accumulation).
//
// @ASK-FIRST: every number here is a SAMPLE ILLUSTRATION (247 coin, Done states,
//   streaks 21/14/9, the heatmap, "26 of 31 days"). Do not wire them to stores —
//   decided. The ONLY live data is SPONSORS (names/taglines/avatars verbatim).

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { ArrowRight, Check, Plus, BookOpen, MessageCircle, PenLine, Heart, Moon, Users, CircleCheck, NotebookPen, Phone, Mic, Send } from 'lucide-react-native';
import { HandsPraying, FlowerLotus, ChatCircleDots } from 'phosphor-react-native';

import { fontFamily, families, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { SPONSORS } from '@/constants/sponsors';

// Carousel gradient (prototype WI_GRAD) — one step past Welcome on the
// icon→interior cooling bridge.
const WI_GRAD = ['#2E86B8', '#2E9AA6', '#3D9B8F'] as const;
const WI_INK = '#2F6E6E';   // button ink on the gradient
const WI_PAPER = '#F5F1E9'; // vignette shell (light mode)

// Heatmap ramp — the Trends page teal intensities.
const HEAT_HI = '#2E7D74';
const HEAT_MID = '#3E9186';
const HEAT_LO = '#CFE3DF';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PAD = 26;
const CARD_W = SCREEN_W - PAGE_PAD * 2;

function Sunrise({ size = 21, color = '#2E6F6F' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.6v2.5" />
      <Path d="M5.9 6 7.7 7.8" />
      <Path d="M18.1 6 16.3 7.8" />
      <Path d="M7.4 14.5a4.6 4.6 0 0 1 9.2 0" />
      <Path d="M3.5 19q8.5-2.9 17 0" />
    </Svg>
  );
}

// ─── shared vignette atoms ───────────────────────────────────────────────────

function VigRow({ Glyph, ink, soft, label, done }: {
  Glyph: React.ComponentType<{ size?: number; color?: string }>;
  ink: string; soft: string; label: string; done?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.vigRow}>
      <View style={[styles.vigRowCoin, { backgroundColor: soft }]}>
        <Glyph size={14} color={ink} />
      </View>
      <Text style={styles.vigRowLabel} numberOfLines={1}>{label}</Text>
      {done ? (
        <View style={styles.vigDonePillOn}>
          <Check size={10} color="#fff" strokeWidth={3.4} />
          <Text style={styles.vigDonePillOnText}>Done</Text>
        </View>
      ) : (
        <View style={styles.vigDonePillOff}>
          <Text style={styles.vigDonePillOffText}>Done</Text>
        </View>
      )}
    </View>
  );
}

// ─── 1 · Today — the program (+ the sponsor FAB peeking, unexplained) ────────

function VigToday() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  return (
    <View style={styles.vigShell}>
      {/* Real Today order: the counter leads, then the Daily Reflection hero,
          then the checkable dailies. */}
      <View style={styles.vigCounterRow}>
        <LinearGradient colors={[families.teal[500], families.teal[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vigCoin}>
          <Text style={styles.vigCoinNum}>247</Text>
        </LinearGradient>
        <View style={styles.flex1}>
          <Text style={styles.vigCounterSerif}>days, one at a time</Text>
          <Text style={styles.vigCounterSub}>Your count, front and center</Text>
        </View>
      </View>
      {/* The Daily Reflection hero — a permanent feature, not one of the
          checkable dailies. */}
      <View style={styles.vigHero}>
        <Image source={require('@/assets/images/reflection_bg2.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.62)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.vigHeroBody}>
          <View style={styles.flex1}>
            <Text style={styles.vigHeroOverline}>DAILY REFLECTIONS</Text>
            <Text style={styles.vigHeroTitle} numberOfLines={1}>Redoubling Our Efforts</Text>
          </View>
          <View style={styles.vigHeroDone}>
            <Text style={styles.vigHeroDoneText}>Done</Text>
          </View>
        </View>
      </View>
      <VigRow Glyph={HandsPraying} ink={colors.primaryDark} soft={colors.primarySoft} label="Say my morning prayers" done />
      <VigRow Glyph={Heart} ink={colors.accentDark} soft={colors.accentSoft} label="Write a gratitude list" />
      <VigRow Glyph={Moon} ink={colors.tertiaryDark} soft={colors.tertiarySoft} label="Do my nightly review" />
      {/* the add affordance — the program is yours to build */}
      <View style={styles.vigAddRow}>
        <Plus size={13} color={colors.primaryDark} strokeWidth={2.4} />
        <Text style={styles.vigAddText}>Add to Anytime</Text>
      </View>
      {/* the sponsor FAB — always there, quietly; card 2 pays it off */}
      <View style={styles.vigFab}>
        <Image source={require('@/assets/images/steady_eddie4.webp')} style={styles.vigFabAvatar} contentFit="cover" />
        <View style={styles.vigFabBadge}>
          <MessageCircle size={8} color="#fff" strokeWidth={2.6} />
        </View>
      </View>
    </View>
  );
}

// ─── 2 · AI Sponsor — the three personas (no sample chat) ────────────────────

function VigSponsor() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.vigShell}>
      {SPONSORS.map((p) => (
        <View key={p.id} style={styles.vigPersonaRow}>
          <Image source={p.avatar} style={styles.vigAvatar} contentFit="cover" />
          <View style={styles.flex1}>
            <Text style={styles.vigPersonaName}>{p.name}</Text>
            <Text style={styles.vigPersonaTag}>{p.description}</Text>
          </View>
        </View>
      ))}

      {/* ...and what it actually looks like to talk to one. No identity header
          here: Eddie is named in the row directly above, and repeating him
          read as a second, duplicate sponsor. The composer placeholder is the
          only cue needed. Sample words — see the @ASK-FIRST note up top. */}
      <View style={styles.vigChat}>
        <View style={styles.vigUserRow}>
          <View style={styles.vigUserBubble}>
            <Text style={styles.vigUserText}>Rough night. I got close.</Text>
          </View>
        </View>
        <Text style={styles.vigBotText}>
          But you didn&apos;t — and you came here instead. That&apos;s the whole thing, right there. What set it off?
        </Text>

        <View style={styles.vigChatInput}>
          <Text style={styles.vigChatPlaceholder}>Message Eddie…</Text>
          <View style={styles.vigChatSend}>
            <Send size={10} color="#fff" strokeWidth={2.4} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── 3 · Tools — the launcher: Literature hero + flagships + the grid ───────

// Mirrors app/(main)/(tabs)/tools.tsx: the featured Literature photo hero, the
// two flagship cards (Speaker Tapes / AI Sponsor), then the tool tiles.
const TOOL_TILES: [React.ComponentType<{ size?: number; color?: string }>, string, keyof typeof families][] = [
  [HandsPraying, 'Prayers', 'teal'],
  [FlowerLotus, 'Meditation', 'periwinkle'],
  [NotebookPen, 'Journal', 'teal'],
  [Heart, 'Gratitude', 'terracotta'],
  [CircleCheck, 'Spot Check', 'terracotta'],
  [Moon, 'Nightly Review', 'periwinkle'],
  [Phone, 'Reach Out', 'steel'],
  [Users, 'Meetings', 'steel'],
];

function VigTools() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  return (
    <View style={styles.vigShell}>
      {/* Featured hero — Literature */}
      <View style={styles.vigToolHero}>
        <Image source={require('@/assets/images/literature-hero4.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.vigFeatured}>
          <Text style={styles.vigFeaturedText}>FEATURED</Text>
        </View>
        <View style={styles.vigToolHeroBottom}>
          <Text style={styles.vigToolHeroTitle}>Literature</Text>
          <Text style={styles.vigToolHeroSub}>Read. Reflect. Grow.</Text>
        </View>
      </View>

      {/* Flagship pair */}
      <View style={styles.vigFlagRow}>
        <View style={[styles.vigFlagCard, { backgroundColor: colors.steelSoft }]}>
          <View style={[styles.vigFlagCircle, { backgroundColor: colors.steel }]}>
            <Mic size={14} color="#fff" />
          </View>
          <Text style={styles.vigFlagTitle}>Speaker Tapes</Text>
          <Text style={styles.vigFlagSub} numberOfLines={2}>Members&apos; experience, strength and hope.</Text>
        </View>
        <View style={[styles.vigFlagCard, { backgroundColor: colors.tertiarySoft }]}>
          <View style={[styles.vigFlagCircle, { backgroundColor: colors.tertiary }]}>
            <ChatCircleDots size={14} color="#fff" />
          </View>
          <Text style={styles.vigFlagTitle}>AI Sponsor</Text>
          <Text style={styles.vigFlagSub} numberOfLines={2}>Guidance and encouragement.</Text>
        </View>
      </View>

      {/* Tool grid */}
      <View style={styles.vigGrid}>
        {TOOL_TILES.map(([Glyph, label, tone]) => (
          <View key={label} style={styles.vigTile}>
            <View style={[styles.vigTileCoin, { backgroundColor: families[tone][500] }]}>
              <Glyph size={15} color="#fff" />
            </View>
            <Text style={styles.vigTileLabel} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 4 · Journey — accumulation, from the real Trends layout ─────────────────

// July 2026 illustration: starts Wednesday; trailing days empty-outlined.
// null = leading blank (no cell), 0 = future day (outlined), hex = intensity.
const HEAT: (string | 0 | null)[] = [
  null, null, null, HEAT_HI, HEAT_MID, HEAT_HI, HEAT_MID,
  HEAT_HI, HEAT_HI, HEAT_MID, HEAT_LO, HEAT_MID, HEAT_HI, HEAT_LO,
  HEAT_MID, HEAT_HI, HEAT_MID, HEAT_HI, HEAT_LO, HEAT_MID, HEAT_HI,
  0, HEAT_MID, HEAT_HI, 0, 0, 0, 0,
];

function VigJourney() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const streaks: [React.ComponentType<{ size?: number; color?: string }>, string, string, string, number][] = [
    [BookOpen, colors.primaryDark, colors.primarySoft, 'Daily Reflection', 21],
    [HandsPraying, colors.accentDark, colors.accentSoft, 'Morning prayers', 14],
    [Heart, colors.accentDark, colors.accentSoft, 'Gratitude', 9],
  ];
  return (
    <View style={styles.vigShell}>
      {/* active streaks */}
      <View style={styles.vigStreakCard}>
        {streaks.map(([Glyph, ink, soft, label, days], i) => (
          <View key={label} style={[styles.vigStreakRow, i < streaks.length - 1 && styles.vigStreakRowBorder]}>
            <View style={[styles.vigStreakIcon, { backgroundColor: soft }]}>
              <Glyph size={13} color={ink} />
            </View>
            <Text style={styles.vigStreakLabel}>{label}</Text>
            <Text style={styles.vigStreakDays}>
              <Text style={styles.vigStreakNum}>{days}</Text> days
            </Text>
          </View>
        ))}
      </View>
      {/* month heatmap — caption and Less/More legend dropped, and the cells
          shrunk, to make room for Insights without a taller card */}
      <View style={styles.vigHeatCard}>
        <View style={styles.vigHeatNav}>
          <Text style={styles.vigHeatNavSide}>&#8249; Jun</Text>
          <Text style={styles.vigHeatMonth}>July 2026</Text>
          <Text style={[styles.vigHeatNavSide, { opacity: 0.45 }]}>Aug &#8250;</Text>
        </View>
        <View style={styles.vigHeatGrid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={'h' + i} style={styles.vigHeatDow}>{d}</Text>
          ))}
          {HEAT.map((c, i) => (
            <View key={i} style={[
              styles.vigHeatCell,
              typeof c === 'string' ? { backgroundColor: c } : null,
              c === 0 ? styles.vigHeatCellFuture : null,
            ]} />
          ))}
        </View>
      </View>

      {/* Insights — the second card on the real Trends page. Sample values. */}
      <View style={styles.vigInsightCard}>
        <View style={styles.vigInsightHead}>
          <View style={[styles.vigInsightAccent, { backgroundColor: colors.tertiary }]} />
          <Text style={styles.vigInsightTitle}>Insights</Text>
        </View>
        {([
          ['Strongest day', 'Sunday'],
          ['Longest streak ever', 'Gratitude · 34 days'],
          ['Average completion', '78%'],
        ] as const).map(([label, value], i, arr) => (
          <View key={label} style={[styles.vigInsightRow, i < arr.length - 1 && styles.vigInsightRowBorder]}>
            <Text style={styles.vigInsightLabel} numberOfLines={1}>{label}</Text>
            <Text style={styles.vigInsightValue} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── the four cards (decided order) ──────────────────────────────────────────

type CardDef = {
  key: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tone: string; soft: string;
  title: string; desc: string;
  Vig: React.ComponentType;
};

function useCards(): CardDef[] {
  const { colors } = useTokens();
  return [
    { key: 'today', Icon: Sunrise, tone: colors.primaryDark, soft: colors.primarySoft, title: 'Your daily program', desc: 'People in recovery build their days around simple practices. Choose yours from a long list — your own daily program, checked off one day at a time.', Vig: VigToday },
    { key: 'sponsor', Icon: MessageCircle, tone: colors.tertiaryDark, soft: colors.tertiarySoft, title: 'Never alone, day or night', desc: 'Three sponsors, three personalities — solid wisdom, straight talk, or a gentle word. Someone to talk to at 2am, or any time at all.', Vig: VigSponsor },
    { key: 'tools', Icon: BookOpen, tone: colors.steelDark, soft: colors.steelSoft, title: 'Everything in one place', desc: 'The essential tools of recovery — complete, in one place, and ready when you are. No hunting through books or websites.', Vig: VigTools },
    { key: 'journey', Icon: PenLine, tone: colors.primaryDark, soft: colors.primarySoft, title: 'Watch it add up', desc: 'Every day you show up becomes part of your story — your entries, your streaks, your patterns. Private, kept on your device.', Vig: VigJourney },
  ];
}

// ─── the carousel ─────────────────────────────────────────────────────────────

export default function WhatsInsideCarousel({ onSkip, onContinue, overline }: {
  onSkip: () => void;
  onContinue: () => void;
  overline?: string; // e.g. "WHAT'S NEW" for the v2-upgrader flow
}) {
  const styles = useThemedStyles(makeStyles);
  const cards = useCards();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  // All four cards share the height of the tallest, so the carousel doesn't
  // resize as you page. Measured, not hardcoded: the tallest card differs by
  // device width and Dynamic Type. Settles in one pass — once minHeight is
  // applied, the re-measure reports the same value and the max stops moving.
  const [cardH, setCardH] = useState(0);
  const measure = (h: number) => setCardH((m) => (h > m ? h : m));
  const last = index === cards.length - 1;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(Math.max(0, Math.min(cards.length - 1, i)));
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
    setIndex(i);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={[...WI_GRAD]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={styles.overline}>{overline ?? 'WHAT’S INSIDE'}</Text>
          <Pressable onPress={onSkip} hitSlop={8} style={styles.skipPill} accessibilityRole="button" accessibilityLabel="Skip">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={{ flex: 1 }}
        >
          {cards.map((m) => (
            <ScrollView
              key={m.key}
              style={styles.page}
              contentContainerStyle={styles.pageContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[styles.card, cardH > 0 && { minHeight: cardH }]}
                onLayout={(e) => measure(e.nativeEvent.layout.height)}
              >
                <View style={styles.cardHead}>
                  <View style={[styles.cardIconBox, { backgroundColor: m.soft }]}>
                    <m.Icon size={21} color={m.tone} />
                  </View>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                </View>
                <Text style={styles.cardDesc}>{m.desc}</Text>
                <m.Vig />
              </View>
            </ScrollView>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {cards.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={() => (last ? onContinue() : goTo(index + 1))}>
            {/* Not "Make it yours" any more — that promised the setup steps,
                which now sit on the far side of the disclaimer and the paywall.
                The carousel hands off to "Before you begin". */}
            <Text style={styles.nextText}>{last ? 'Continue' : 'Next'}</Text>
            <ArrowRight size={18} color={WI_INK} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const vigPaper = isDark ? c.background : WI_PAPER;
  const vigCard = isDark ? c.surfaceRaised : '#FFFFFF';
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
    overline: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.9)' },
    skipPill: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
    skipText: { fontFamily: fontFamily.bold, fontSize: 13.5, color: '#fff' },

    page: { width: SCREEN_W },
    // grow so a card shorter than the viewport still centres
    pageContent: { flexGrow: 1, paddingHorizontal: PAGE_PAD, paddingVertical: 8, justifyContent: 'center' },
    card: { width: CARD_W, backgroundColor: c.surface, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 18, ...shadows.lg, shadowOpacity: 0.22, shadowRadius: 25, shadowOffset: { width: 0, height: 12 } },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    cardIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { flex: 1, fontFamily: fontFamily.display, fontSize: 21, color: c.text, letterSpacing: -0.4 },
    cardDesc: { fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textSecondary, lineHeight: 21, marginBottom: 13 },

    // vignette shell + rows
    flex1: { flex: 1, minWidth: 0 },
    vigShell: { backgroundColor: vigPaper, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, gap: 8 },
    vigRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10 },
    vigRowCoin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    vigRowLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 12.5, color: c.text },
    vigDonePillOn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
    vigDonePillOnText: { fontFamily: fontFamily.bold, fontSize: 10.5, color: '#fff' },
    vigDonePillOff: { borderWidth: 1.5, borderColor: colors.primary + '66', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
    vigDonePillOffText: { fontFamily: fontFamily.bold, fontSize: 10.5, color: colors.primaryDark },

    // Today vignette
    vigHero: { height: 92, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
    vigHeroBody: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 11, paddingBottom: 9 },
    vigHeroOverline: { fontFamily: fontFamily.bold, fontSize: 8.5, letterSpacing: 1.4, color: 'rgba(255,255,255,0.92)' },
    vigHeroTitle: { fontFamily: fontFamily.serif, fontSize: 16, color: '#fff', marginTop: 2 },
    vigHeroDone: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 11 },
    vigHeroDoneText: { fontFamily: fontFamily.bold, fontSize: 10.5, color: '#fff' },
    vigCounterRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    vigCoin: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', ...shadows.md },
    vigCoinNum: { fontFamily: fontFamily.displayBold, fontSize: 16, color: '#fff' },
    vigCounterSerif: { fontFamily: fontFamily.serifItalic, fontSize: 13.5, color: c.text },
    vigCounterSub: { fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textMuted, marginTop: 1 },
    vigAddRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary + '88', borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10, marginRight: 48 },
    vigAddText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.primaryDark },
    vigFab: { position: 'absolute', right: 10, bottom: 10, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff', ...shadows.md },
    vigFabAvatar: { width: '100%', height: '100%', borderRadius: 18 },
    vigFabBadge: { position: 'absolute', right: -4, bottom: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    // Sponsor vignette
    vigPersonaRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 },
    vigAvatar: { width: 42, height: 42, borderRadius: 21 },
    vigPersonaName: { fontFamily: fontFamily.bold, fontSize: 13, color: c.text },
    vigPersonaTag: { fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted, marginTop: 1 },
    vigChat: { backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, gap: 8, marginTop: 2 },
    vigUserRow: { alignItems: 'flex-end' },
    vigUserBubble: { maxWidth: '82%', backgroundColor: vigPaper, borderWidth: 1, borderColor: c.border, borderRadius: 14, borderBottomRightRadius: 4, paddingVertical: 7, paddingHorizontal: 11 },
    vigUserText: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 16, color: c.text },
    vigBotText: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 17, color: c.text, paddingRight: 14 },
    vigChatInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingVertical: 5, paddingLeft: 12, paddingRight: 5, marginTop: 2 },
    vigChatPlaceholder: { flex: 1, fontFamily: fontFamily.regular, fontSize: 11, color: c.textMuted },
    vigChatSend: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

    // Tools vignette — the launcher, mirroring the real Tools tab
    vigToolHero: { height: 104, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
    vigFeatured: { position: 'absolute', top: 9, left: 10, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
    vigFeaturedText: { fontFamily: fontFamily.bold, fontSize: 7.5, letterSpacing: 1.1, color: '#fff' },
    vigToolHeroBottom: { paddingHorizontal: 13, paddingBottom: 11 },
    vigToolHeroTitle: { fontFamily: fontFamily.displayBold, fontSize: 21, color: '#fff', letterSpacing: -0.4 },
    vigToolHeroSub: { fontFamily: fontFamily.medium, fontSize: 10.5, color: 'rgba(255,255,255,0.92)', marginTop: 1 },
    vigFlagRow: { flexDirection: 'row', gap: 9 },
    vigFlagCard: { flex: 1, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 11, gap: 7 },
    vigFlagCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    vigFlagTitle: { fontFamily: fontFamily.bold, fontSize: 12, color: c.text },
    vigFlagSub: { fontFamily: fontFamily.regular, fontSize: 9.5, lineHeight: 13, color: c.textSecondary },
    vigGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    vigTile: { flexBasis: '23%', flexGrow: 1, backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 13, paddingTop: 9, paddingBottom: 7, paddingHorizontal: 2, alignItems: 'center', gap: 5 },
    vigTileCoin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    vigTileLabel: { fontFamily: fontFamily.semiBold, fontSize: 8.5, color: c.text },

    // Journey vignette
    vigStreakCard: { backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 },
    vigStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
    vigStreakRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    vigStreakIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    vigStreakLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 12, color: c.text },
    vigStreakDays: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted },
    vigStreakNum: { fontFamily: fontFamily.displayBold, fontSize: 14, color: colors.primary },
    vigHeatCard: { backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
    vigHeatNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    vigHeatNavSide: { fontFamily: fontFamily.semiBold, fontSize: 10, color: c.textMuted },
    vigHeatMonth: { fontFamily: fontFamily.displayBold, fontSize: 12, color: c.text },
    vigHeatGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 0 },
    vigHeatDow: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fontFamily.bold, fontSize: 8.5, color: c.textMuted },
    vigHeatCell: { width: `${100 / 7 - 1.5}%`, marginHorizontal: '0.75%', height: 9, borderRadius: 2.5 },
    vigHeatCellFuture: { borderWidth: 1, borderColor: c.border },
    vigInsightCard: { backgroundColor: vigCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 },
    vigInsightHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
    vigInsightAccent: { width: 3, height: 14, borderRadius: 2 },
    vigInsightTitle: { fontFamily: fontFamily.displayBold, fontSize: 12.5, color: c.text },
    vigInsightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
    vigInsightRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    vigInsightLabel: { flex: 1, fontFamily: fontFamily.regular, fontSize: 10.5, color: c.textSecondary },
    vigInsightValue: { fontFamily: fontFamily.semiBold, fontSize: 10.5, color: c.text },

    // dots + footer
    dotsRow: { flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { width: 22, backgroundColor: '#fff' },
    footer: { paddingHorizontal: 26, paddingBottom: 14 },
    nextBtn: { minHeight: 54, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, ...shadows.md },
    nextText: { fontFamily: fontFamily.semiBold, fontSize: 16, color: WI_INK },
  });
};
