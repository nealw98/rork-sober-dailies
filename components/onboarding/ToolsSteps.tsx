import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';

import { fontFamily, fontSize, steelPlay, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { SPONSORS } from '@/constants/sponsors';
import { OnboardingColumn, PrimaryButton, TourProgress } from '@/components/onboarding/OnboardingChrome';

// R4 · Read & listen and R5 · Talk & practice — static previews of the tools
// (nothing here is tappable), each card drawn from the real app imagery.

const BIG_BOOK = require('@/assets/images/big-book_cover.webp');
const TWELVE_TWELVE = require('@/assets/images/new_12x12_cover.webp');
const SPEAKERS_HERO = require('@/assets/images/speakers_hero2.webp');
const MEDITATION_HERO = require('@/assets/images/meditation-hero1.webp');

// A real entry from the speaker catalog (checked against the live `speakers`
// table, 2026-11-08) — the row is a still, not a player, but the name on it
// should be someone you can actually find in Speaker tapes.
const SAMPLE_SPEAKER = 'Andrew I. · Anchorage, AK';

// The sample exchange on the AI sponsor card: Steady Eddie, condensed from a
// real reply to fit three lines. A still illustration — never generated at
// runtime, never read from chat history.
const SAMPLE_PROMPT = 'I’m having a hard time today';
const SAMPLE_REPLY = 'Yeah, that’s tough — some days just feel heavy. Tell me what’s actually going on: are you thinking about drinking, or is something else weighing on you?';

// Six of the everyday tools, in their Today glyphs and family tones.
const TOOL_CHIPS = [
  { label: 'Journal', icon: 'journal', tone: 'teal' },
  { label: 'Gratitude', icon: 'heart', tone: 'terracotta' },
  { label: 'Nightly review', icon: 'moon', tone: 'periwinkle' },
  { label: 'Spot check', icon: 'check', tone: 'terracotta' },
  { label: 'Meetings', icon: 'users', tone: 'steel' },
  { label: 'Reach out', icon: 'phone', tone: 'steel' },
];

// Wide landscape (the unfolded Duo, an iPad on its side): a single 520pt
// column of stacked cards runs off the bottom of a 669pt-tall screen while
// most of the width sits empty, so the column widens and the cards go side
// by side.
const SPREAD_MIN_WIDTH = 800;
const SPREAD_MAX_WIDTH = 860;

function TourScreen({ index, overline, overlineColor, title, children, buttonLabel, onContinue, onSkip }: {
  index: number;
  overline: string;
  overlineColor: string;
  title: string;
  children: React.ReactNode;
  buttonLabel: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  const { width, height } = useWindowDimensions();
  const spread = width > height && width >= SPREAD_MIN_WIDTH;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OnboardingColumn maxWidth={spread ? SPREAD_MAX_WIDTH : undefined}>
        <TourProgress index={index} onSkip={onSkip} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.overline, { color: overlineColor }]}>{overline}</Text>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <View style={[styles.cards, spread && styles.cardsSpread]}>
            {spread
              ? React.Children.map(children, (child) => <View style={styles.flex}>{child}</View>)
              : children}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label={buttonLabel} onPress={onContinue} />
        </View>
      </OnboardingColumn>
    </SafeAreaView>
  );
}

export function ReadListenStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors, mode } = useTokens();
  return (
    <TourScreen
      index={2}
      overline="READ & LISTEN"
      overlineColor={colors.steelDark}
      title="The literature and the speakers, right here"
      buttonLabel="Next"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={styles.litCard}>
        <View style={styles.covers}>
          <Image source={BIG_BOOK} style={[styles.cover, { transform: [{ rotate: '-3deg' }] }]} contentFit="cover" accessibilityLabel="Big Book cover" />
          <Image source={TWELVE_TWELVE} style={[styles.cover, { transform: [{ rotate: '3deg' }] }]} contentFit="cover" accessibilityLabel="Twelve Steps and Twelve Traditions cover" />
        </View>
        <Text style={styles.cardTitle}>Literature</Text>
        <Text style={styles.cardBody}>The Big Book and the Twelve and Twelve, always in your pocket.</Text>
      </View>

      <View style={styles.photoCard}>
        <Image source={SPEAKERS_HERO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: '70%' }} />
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.photoText}>
          <Text style={styles.photoTitle}>Speaker tapes</Text>
          <Text style={styles.photoBody}>Experience, strength and hope — a meeting&apos;s worth, whenever you need it.</Text>
          <View style={styles.player}>
            <View style={styles.playBtn}>
              <Play size={14} color={steelPlay[mode]} fill={steelPlay[mode]} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.playerName} numberOfLines={1}>{SAMPLE_SPEAKER}</Text>
              <View style={styles.playerTrack}><View style={styles.playerFill} /></View>
            </View>
          </View>
        </View>
      </View>
    </TourScreen>
  );
}

export function TalkPracticeStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors, mode } = useTokens();
  const eddie = SPONSORS.find((s) => s.id === 'supportive');
  return (
    <TourScreen
      index={3}
      overline="TALK & PRACTICE"
      overlineColor={colors.tertiaryDark}
      title="Someone to talk to, and the practices that keep you steady"
      buttonLabel="Continue"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={styles.sponsorCard}>
        <View style={styles.sponsorHead}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>AI sponsor</Text>
            <Text style={styles.cardBody}>Three personalities. Any hour.</Text>
          </View>
          <View style={styles.avatars}>
            {SPONSORS.map((s, i) => (
              <Image key={s.id} source={s.avatar} style={[styles.avatar, i > 0 && styles.avatarOverlap]} contentFit="cover" accessibilityLabel={s.name} />
            ))}
          </View>
        </View>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{SAMPLE_PROMPT}</Text>
        </View>
        <View style={styles.replyRow}>
          {eddie && <Image source={eddie.avatar} style={styles.replyAvatar} contentFit="cover" />}
          <View style={[styles.replyBubble, eddie?.bubbleColor ? { backgroundColor: eddie.bubbleColor } : null]}>
            <Text style={styles.replyText}>{SAMPLE_REPLY}</Text>
          </View>
        </View>
      </View>

      <View style={styles.practices}>
      <View style={styles.meditationCard}>
        <Image source={MEDITATION_HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(23,26,34,0.62)', 'rgba(23,26,34,0.1)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.meditationText}>
          <Text style={styles.photoTitle}>Prayers &amp; meditation</Text>
          <Text style={styles.photoBody}>Morning, evening, and a quiet minute in between.</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {TOOL_CHIPS.map((t) => {
          const Glyph = resolveGlyph(t.icon);
          const tone = resolveTone(t.tone, mode);
          return (
            <View key={t.label} style={styles.chip}>
              <View style={[styles.chipIcon, { backgroundColor: tone.soft }]}>
                <Glyph size={14} color={tone.ink} />
              </View>
              <Text style={styles.chipLabel}>{t.label}</Text>
            </View>
          );
        })}
      </View>
      </View>
    </TourScreen>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const cardEdge = isDark ? { borderWidth: 1, borderColor: c.border } : null;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
    overline: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8 },
    title: { fontFamily: fontFamily.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: c.text, marginTop: 6 },
    cards: { gap: 14, marginTop: 18 },
    cardsSpread: { flexDirection: 'row', alignItems: 'stretch' },
    practices: { gap: 12 },
    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },

    cardTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: c.text },
    cardBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 20, color: c.textSecondary, marginTop: 3 },

    // Read & listen
    litCard: { backgroundColor: colors.steelSoft, borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, ...cardEdge },
    covers: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4, marginBottom: 14 },
    cover: { width: 112, height: 148, borderRadius: 8, shadowColor: '#171A22', shadowOpacity: 0.28, shadowRadius: 11, shadowOffset: { width: 0, height: 12 } },
    photoCard: { flexGrow: 1, minHeight: 236, borderRadius: 22, overflow: 'hidden', backgroundColor: '#3A2A20', justifyContent: 'flex-end' },
    photoText: { paddingHorizontal: 18, paddingBottom: 16, paddingTop: 60 },
    photoTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: '#fff' },
    photoBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 20, color: 'rgba(255,255,255,0.92)', marginTop: 3 },
    player: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 14, paddingVertical: 9, paddingLeft: 9, paddingRight: 12 },
    playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#2B3A4E' : '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
    playerName: { fontFamily: fontFamily.semiBold, fontSize: 13, color: '#fff' },
    playerTrack: { marginTop: 6, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
    playerFill: { width: '34%', height: 3, borderRadius: 2, backgroundColor: '#fff' },

    // Talk & practice
    sponsorCard: { backgroundColor: colors.tertiarySoft, borderRadius: 22, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 10, ...cardEdge },
    sponsorHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatars: { flexDirection: 'row' },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.tertiarySoft },
    avatarOverlap: { marginLeft: -12 },
    userBubble: { alignSelf: 'flex-end', maxWidth: '78%', backgroundColor: c.surface, borderRadius: 14, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
    userText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },
    replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    replyAvatar: { width: 28, height: 28, borderRadius: 14 },
    // Eddie's own green (SPONSORS bubbleColor) in both modes, so its ink is
    // fixed dark too.
    replyBubble: { flex: 1, borderRadius: 14, borderBottomLeftRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
    replyText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: '#232529' },
    meditationCard: { minHeight: 122, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primary, justifyContent: 'center' },
    meditationText: { paddingVertical: 18, paddingLeft: 16, paddingRight: 120 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexBasis: '30%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 8 },
    chipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    chipLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 11.5, lineHeight: 14, color: c.text },
  });
};
