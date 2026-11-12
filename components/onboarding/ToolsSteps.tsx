import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Check, ChevronRight, Heart, Mic } from 'lucide-react-native';
import { HandsPraying, FlowerLotus } from 'phosphor-react-native';

import { families, fontFamily, fontSize, radii, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { DEFAULT_PROGRAM, ACTION_TONE, type WhenBucket } from '@/hooks/use-dailies-store';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { OnboardingColumn, PrimaryButton, TourProgress, TOUR_MAX_FONT_SCALE } from '@/components/onboarding/OnboardingChrome';

// All the tools you use every day and R5b · Your daily program — static previews of the tools
// (nothing here is tappable), each card drawn from the real app imagery.

const BIG_BOOK = require('@/assets/images/big-book_cover.webp');
const TWELVE_TWELVE = require('@/assets/images/new_12x12_cover.webp');

// Wide landscape (the unfolded Duo, an iPad on its side): a single 520pt
// column of stacked cards runs off the bottom of a 669pt-tall screen while
// most of the width sits empty, so the column widens and the cards go side
// by side.
const SPREAD_MIN_WIDTH = 800;
const SPREAD_MAX_WIDTH = 860;

function useTourSpread() {
  const { width, height } = useWindowDimensions();
  return width > height && width >= SPREAD_MIN_WIDTH;
}

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
  const spread = useTourSpread();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OnboardingColumn maxWidth={spread ? SPREAD_MAX_WIDTH : undefined}>
        <TourProgress index={index} onSkip={onSkip} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!!overline && <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={[styles.overline, { color: overlineColor }]}>{overline}</Text>}
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={[styles.title, !overline && styles.titleAlone]} accessibilityRole="header">{title}</Text>
          <View style={[styles.cards, gap !== undefined && { gap }, spread && styles.cardsSpread]}>
            {spread
              ? React.Children.map(children, (child) => <View style={styles.flex}>{child}</View>)
              : children}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {!!footnote && <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.footnote}>{footnote}</Text>}
          <PrimaryButton label={buttonLabel} onPress={onContinue} />
        </View>
      </OnboardingColumn>
    </SafeAreaView>
  );
}

// The three everyday tools under the speaker card. Circles keep the light
// palette's base in both modes so the white glyphs stay readable on dark.
const SMALL_TOOLS = [
  { label: 'Prayers', family: 'teal', glyph: <HandsPraying size={18} color="#fff" weight="bold" /> },
  { label: 'Gratitude', family: 'terracotta', glyph: <Heart size={17} color="#fff" strokeWidth={2.2} /> },
  { label: 'Meditation', family: 'periwinkle', glyph: <FlowerLotus size={18} color="#fff" weight="bold" /> },
] as const;

export function ToolsStep({ index, onContinue, onSkip, onBack }: { index: number; onContinue: () => void; onSkip: () => void; onBack: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTokens();
  const spread = useTourSpread();
  const soft = { teal: colors.primarySoft, terracotta: colors.accentSoft, periwinkle: colors.tertiarySoft };

  // Wide spread: the Big Book card on the left, these stacked on the right.
  const rest = [
    <View key="speakers" style={styles.speakerCard}>
      <View style={styles.speakerMic}>
        <Mic size={22} color="#fff" strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.speakerTitle}>Speaker tapes</Text>
        <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.speakerBody}>Experience, strength and hope — a meeting’s worth, whenever you need it.</Text>
      </View>
    </View>,
    <View key="small" style={styles.smallRow}>
      {SMALL_TOOLS.map(({ label, family, glyph }) => (
        <View key={label} style={[styles.smallCard, { backgroundColor: soft[family] }]}>
          <View style={[styles.smallIcon, { backgroundColor: families[family][500] }]}>
            {glyph}
          </View>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.smallTitle}>{label}</Text>
        </View>
      ))}
    </View>,
    <Text key="more" maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.toolsMore}>Plus journal, nightly review, meeting finder and more.</Text>,
  ];

  return (
    <TourScreen
      index={index}
      title="All the tools you use every day"
      gap={12}
      buttonLabel="Your daily program"
      onContinue={onContinue}
      onSkip={onSkip}
      onBack={onBack}
    >
      {/* Warm cream in both modes: the pale 12&12 cover vanishes on blue and
          navy is too heavy for it. */}
      <View style={styles.litCard}>
        <View style={styles.covers}>
          {/* Bare 3D covers with the Literature tab's lift: the shadow sits on
              a background-less wrapper so it follows the book's shape. */}
          <View style={[styles.coverLift, { transform: [{ rotate: '-3deg' }] }]}>
            <Image source={BIG_BOOK} style={styles.cover} contentFit="contain" accessibilityLabel="Big Book cover" />
          </View>
          <View style={[styles.coverLift, { transform: [{ rotate: '3deg' }] }]}>
            <Image source={TWELVE_TWELVE} style={styles.cover} contentFit="contain" accessibilityLabel="Twelve Steps and Twelve Traditions cover" />
          </View>
        </View>
        <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.litTitle}>Big Book Reader</Text>
        <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.litBody}>A Kindle-style Big Book reader, plus the complete Twelve and Twelve</Text>
      </View>
      {spread ? <View style={styles.toolsRest}>{rest}</View> : rest}
    </TourScreen>
  );
}

// R5b · Your daily program — the default dailies as a Today-style card, each
// row naming the tool it opens. A still of a day in progress (the two Morning
// rows done): it shows DEFAULT_PROGRAM, never the user's saved program.
const PROGRAM_SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];
const DONE_IN_PREVIEW: WhenBucket = 'Morning';
// The tool each default daily opens from Today (ACTION_ROUTE in the Today tab).
// Meetings opens on the Meeting Guide finder, hence "Meeting finder".
const OPENS: Record<string, string> = {
  prayerMorning: 'Prayers',
  gratitude: 'Gratitude',
  meeting: 'Meeting finder',
  lit: 'the Big Book reader',
  nightly: 'Nightly Review',
  prayerEvening: 'Prayers',
};

export function ProgramStep({ index, onContinue, onSkip, onBack }: { index: number; onContinue: () => void; onSkip: () => void; onBack: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors, mode } = useTokens();
  const spread = useTourSpread();

  const intro = (
    <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.programBody}>
      Pick the daily practices that fit your recovery. Each one opens the tool you need, right from your Today page.
    </Text>
  );
  const note = (
    <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={[styles.programNote, spread && styles.programNoteSide]}>
      We&apos;ll start you with these six. Add, remove or reorder any time.
    </Text>
  );
  const card = (
    <View style={styles.programCard}>
      {PROGRAM_SECTIONS.map((when) => (
        <View key={when}>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.programSection}>{when}</Text>
          {DEFAULT_PROGRAM.filter((d) => d.when === when).map((d, i) => {
            // Tinted by action, as Today does (the stored color can be stale).
            const tone = resolveTone(ACTION_TONE[d.action] ?? d.color, mode);
            const Glyph = resolveGlyph(d.icon);
            const done = when === DONE_IN_PREVIEW;
            return (
              <View key={d.id} style={[styles.programRow, i > 0 && styles.programRowDivider]}>
                <View style={[styles.programIcon, { backgroundColor: tone.soft }]}>
                  <Glyph size={17} color={tone.ink} />
                </View>
                <View style={styles.flex}>
                  <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.programLabel}>{d.label}</Text>
                  <View style={styles.programOpens}>
                    <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={[styles.programOpensText, { color: tone.ink }]}>Opens {OPENS[d.action] ?? 'the tool'}</Text>
                    <ChevronRight size={11} color={tone.ink} strokeWidth={2.6} />
                  </View>
                </View>
                {/* Today's Done pill, display only. The done rows are solid
                    teal whatever the tool's color. */}
                <View style={[styles.programDone, done ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: tone.ink + '99' }]}>
                  {done && <Check size={12} color="#fff" strokeWidth={3} />}
                  <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={[styles.programDoneText, { color: done ? '#fff' : tone.ink }]}>Done</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <TourScreen
      index={index}
      overline="YOUR DAILY PROGRAM"
      overlineColor={colors.primaryDark}
      title="Put it all together, one day at a time"
      buttonLabel="Try the AI sponsors"
      onContinue={onContinue}
      onSkip={onSkip}
      onBack={onBack}
    >
      {/* Wide spread: the intro beside the card. Stacked: intro, card, note. */}
      {spread ? (
        [<View key="intro">{intro}{note}</View>, <View key="card">{card}</View>]
      ) : (
        <View>{intro}{card}{note}</View>
      )}
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


    // All the tools you use every day
    litCard: { borderRadius: 22, backgroundColor: '#F3EBDA', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 },
    covers: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4, marginBottom: 14 },
    // Same lift as the Literature tab's shelf (bookBtn there). Android's
    // elevation would draw a box around the transparent render, so it uses the
    // drop-shadow filter, which follows the book's outline (as Welcome does).
    coverLift: Platform.select({
      ios: { shadowColor: '#3C280A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 14 },
      android: { filter: [{ dropShadow: { offsetX: 0, offsetY: 10, standardDeviation: 7, color: 'rgba(60,40,10,0.28)' } }] },
    }),
    cover: { width: 118, height: 156 },
    litTitle: { fontFamily: fontFamily.displayBold, fontSize: 19, color: '#232529' },
    litBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 20, color: '#474A52', marginTop: 3 },
    toolsRest: { gap: 12 },
    speakerCard: { minHeight: 118, borderRadius: 22, backgroundColor: colors.steelSoft, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, ...cardEdge },
    speakerMic: { width: 48, height: 48, borderRadius: 24, backgroundColor: families.steel[500], alignItems: 'center', justifyContent: 'center' },
    speakerTitle: { fontFamily: fontFamily.displayBold, fontSize: 18, color: c.text },
    speakerBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: 3 },
    smallRow: { flexDirection: 'row', gap: 8 },
    smallCard: { flex: 1, borderRadius: 18, padding: 12, gap: 8, ...cardEdge },
    smallIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    smallTitle: { fontFamily: fontFamily.displayBold, fontSize: 13.5, color: c.text },
    toolsMore: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textMuted, textAlign: 'center' },

    // Your daily program
    programBody: { fontFamily: fontFamily.regular, fontSize: 14.5, lineHeight: 21, color: c.textSecondary, marginTop: -10, marginBottom: 16 },
    programCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, ...shadows.md },
    programSection: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textSecondary, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 2 },
    programRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 5 },
    programRowDivider: { borderTopWidth: 1, borderTopColor: c.divider },
    programIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    programLabel: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 18, color: c.text },
    programOpens: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    programOpensText: { fontFamily: fontFamily.semiBold, fontSize: 11.5 },
    // Today's DoneButton look (pill, 1.25 border, semibold 11.5).
    programDone: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.full, borderWidth: 1.25 },
    programDoneText: { fontFamily: fontFamily.semiBold, fontSize: 11.5 },
    programNote: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 12 },
    // Beside the card it sits under the left-aligned intro.
    programNoteSide: { textAlign: 'left', marginTop: 0 },
  });
};
