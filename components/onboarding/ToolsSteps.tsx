import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Play, CircleCheck, Heart } from 'lucide-react-native';
import { HandsPraying } from 'phosphor-react-native';

import { colors as lightColors, fontFamily, fontSize, steelPlay, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
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

// Wide landscape (the unfolded Duo, an iPad on its side): a single 520pt
// column of stacked cards runs off the bottom of a 669pt-tall screen while
// most of the width sits empty, so the column widens and the cards go side
// by side.
const SPREAD_MIN_WIDTH = 800;
const SPREAD_MAX_WIDTH = 860;

function TourScreen({ index, overline, overlineColor, title, children, gap, footnote, buttonLabel, onContinue, onSkip, onBack }: {
  index: number;
  overline?: string;
  overlineColor?: string;
  title: string;
  children: React.ReactNode;
  gap?: number;
  footnote?: string;
  buttonLabel: string;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  const { width, height } = useWindowDimensions();
  const spread = width > height && width >= SPREAD_MIN_WIDTH;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OnboardingColumn maxWidth={spread ? SPREAD_MAX_WIDTH : undefined}>
        <TourProgress index={index} onSkip={onSkip} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!!overline && <Text style={[styles.overline, { color: overlineColor }]}>{overline}</Text>}
          <Text style={[styles.title, !overline && styles.titleAlone]} accessibilityRole="header">{title}</Text>
          <View style={[styles.cards, gap !== undefined && { gap }, spread && styles.cardsSpread]}>
            {spread
              ? React.Children.map(children, (child) => <View style={styles.flex}>{child}</View>)
              : children}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {!!footnote && <Text style={styles.footnote}>{footnote}</Text>}
          <PrimaryButton label={buttonLabel} onPress={onContinue} />
        </View>
      </OnboardingColumn>
    </SafeAreaView>
  );
}

export function ReadListenStep({ onContinue, onSkip, onBack }: { onContinue: () => void; onSkip: () => void; onBack: () => void }) {
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
      onBack={onBack}
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

// R5 · Talk it through, and practice every day — the tools grouped by when you'd
// reach for them. Two children so the spread puts "When it's hard" beside the
// everyday and quiet groups.
export function TalkPracticeStep({ onContinue, onSkip, onBack }: { onContinue: () => void; onSkip: () => void; onBack: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const eddie = SPONSORS.find((s) => s.id === 'supportive');
  return (
    <TourScreen
      index={3}
      title="Talk it through, and practice every day"
      gap={18}
      footnote="Plus journal, nightly review, meeting finder and more."
      buttonLabel="Continue"
      onContinue={onContinue}
      onSkip={onSkip}
      onBack={onBack}
    >
      <View>
        <Text style={[styles.groupLabel, { color: colors.tertiaryDark }]}>WHEN IT&apos;S HARD</Text>
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
            <View style={styles.replyBubble}>
              <Text style={styles.replyText}>{SAMPLE_REPLY}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spotCard}>
          <View style={styles.spotIcon}>
            <CircleCheck size={20} color={colors.accentDark} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.smallTitle}>Spot check inventory</Text>
            <Text style={styles.smallBody}>Upset right now? Work through it on the spot.</Text>
          </View>
        </View>
      </View>

      <View style={styles.groups}>
        <View>
          <Text style={[styles.groupLabel, { color: colors.primaryDark }]}>EVERY DAY</Text>
          <View style={styles.pair}>
            <View style={[styles.dayCard, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.dayIcon, { backgroundColor: colors.primary }]}>
                <HandsPraying size={18} color="#fff" />
              </View>
              <Text style={styles.smallTitle}>Prayers</Text>
              <Text style={styles.dayBody}>Morning, evening and the ones in between.</Text>
            </View>
            <View style={[styles.dayCard, { backgroundColor: colors.accentSoft }]}>
              <View style={[styles.dayIcon, { backgroundColor: colors.accent }]}>
                <Heart size={18} color="#fff" strokeWidth={2} />
              </View>
              <Text style={styles.smallTitle}>Gratitude list</Text>
              <Text style={styles.dayBody}>A few lines that change the whole day.</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[styles.groupLabel, { color: colors.tertiaryDark }]}>WHEN YOU NEED QUIET</Text>
          <View style={styles.meditationCard}>
            <Image source={MEDITATION_HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(23,26,34,0.66)', 'rgba(23,26,34,0.12)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.meditationText}>
              <Text style={styles.meditationTitle}>Meditation</Text>
              <Text style={styles.photoBody}>Its own quiet corner of the app.</Text>
            </View>
          </View>
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
    titleAlone: { marginTop: 0 },
    cards: { gap: 14, marginTop: 18 },
    cardsSpread: { flexDirection: 'row', alignItems: 'stretch' },
    footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    footnote: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textMuted, textAlign: 'center', marginBottom: 12 },

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
    groups: { gap: 18 },
    groupLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.8, marginBottom: 8 },
    sponsorCard: { backgroundColor: colors.tertiarySoft, borderRadius: 22, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 10, ...cardEdge },
    sponsorHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatars: { flexDirection: 'row' },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.tertiarySoft },
    avatarOverlap: { marginLeft: -12 },
    userBubble: { alignSelf: 'flex-end', maxWidth: '78%', backgroundColor: c.surface, borderRadius: 14, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
    userText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },
    replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    replyAvatar: { width: 28, height: 28, borderRadius: 14 },
    // Periwinkle with white ink in both modes (the light-palette tone, so it
    // doesn't wash out to the brighter dark-mode periwinkle).
    replyBubble: { flex: 1, backgroundColor: lightColors.tertiary, borderRadius: 14, borderBottomLeftRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
    replyText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: '#fff' },
    spotCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
    spotIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    smallTitle: { fontFamily: fontFamily.displayBold, fontSize: 16, color: c.text },
    smallBody: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 1 },
    pair: { flexDirection: 'row', gap: 8 },
    dayCard: { flex: 1, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14, gap: 8, ...cardEdge },
    dayIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    dayBody: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textSecondary },
    meditationCard: { minHeight: 78, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.primary, justifyContent: 'center' },
    meditationText: { paddingVertical: 14, paddingLeft: 16, paddingRight: 90 },
    meditationTitle: { fontFamily: fontFamily.displayBold, fontSize: 17, color: '#fff' },
  });
};
