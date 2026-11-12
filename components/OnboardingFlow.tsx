import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, ScrollView, BackHandler, PanResponder, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react-native';

import { families, fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { recordDisclaimerAcceptance } from '@/lib/disclaimerConsent';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';
import { SPONSORS } from '@/constants/sponsors';
import { useSideBackdrop } from '@/components/layout/SideInsetGuard';
import PaywallScreen from '@/components/PaywallScreen';
import PassOfferScreen from '@/components/PassOfferScreen';
import { logEvent } from '@/lib/analytics';
import { ONBOARDING_MAX_WIDTH, OnboardingColumn, TOUR_MAX_FONT_SCALE } from '@/components/onboarding/OnboardingChrome';
import CounterStep from '@/components/onboarding/CounterStep';
import { toDateInput } from '@/lib/soberDateInput';
import { termsUrl } from '@/lib/storeLinks';
import ReflectionStep from '@/components/onboarding/ReflectionStep';
import { ToolsStep, ProgramStep } from '@/components/onboarding/ToolsSteps';
import { HelpList, HelpTryChat, HelpTrySpotCheck } from '@/components/onboarding/HelpStep';
import { TRY_EVENT_NAME, type TryOffer, type TryTarget } from '@/constants/onboardingSponsors';
import { useTrialAvailable } from '@/hooks/useTrialAvailable';

// App-icon gradient → interior bridge (prototype `obvGrad`). t=0 = vivid app icon,
// t=1 = muted interior. Onboarding stays icon-leaning (the retiring teal header
// gradient is NOT used here).
const OBV_HOT = ['#0079C5', '#0099C0', '#00B7B0'];
const OBV_COOL = ['#4A6FA5', '#3D8B8B', '#45A08A'];
function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// Dark mode keeps the brand hues and drops the luminance. A full-bleed
// saturated gradient is a lot of light for someone who has asked for less, and
// this app gets opened at 2am. Multiplying RGB holds the hue and the relative
// saturation; mixing toward grey would wash the brand out instead.
const DARK_GRAD_K = 0.42;
function shade(hex: string, k: number): string {
  const p = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
  return '#' + p.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
function obvGrad(t: number, dark = false): [string, string, string] {
  const g: [string, string, string] = [
    lerpHex(OBV_HOT[0], OBV_COOL[0], t),
    lerpHex(OBV_HOT[1], OBV_COOL[1], t),
    lerpHex(OBV_HOT[2], OBV_COOL[2], t),
  ];
  return dark ? [shade(g[0], DARK_GRAD_K), shade(g[1], DARK_GRAD_K), shade(g[2], DARK_GRAD_K)] : g;
}
// The two gradient screens (Welcome, disclaimer) hand their gradient to the
// app root's SideInsetGuard instead of drawing it themselves. The guard pads
// every screen out of the Duo's side strips (84pt, both displays), so a
// gradient drawn by the screen stopped at the strip and left a band of the
// paper background under the clock column; the guard draws a backdrop across
// the full window. On phones the insets are 0 and this is pixel-identical.
// Layout effect, so the backdrop is in place before the first paint.
function useGradientBackdrop(t: number, dark: boolean) {
  const backdrop = useSideBackdrop();
  const [c0, c1, c2] = obvGrad(t, dark);
  useLayoutEffect(() => {
    backdrop.set(
      <LinearGradient colors={[c0, c1, c2]} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />,
    );
    return () => backdrop.set(null);
  }, [backdrop, c0, c1, c2]);
}

function obvInk(t: number): string {
  return lerpHex('#0086C2', '#2F6E6E', t);
}

// Legal links — Apple's standard EULA + our Privacy Policy. The welcome CTA
// carries implied agreement; explicit agreement (checkbox) happens on the
// disclaimer step, which runs right after Welcome, so everyone agrees before
// the tour and the paywall.
const openTerms = () => Linking.openURL(termsUrl()).catch(() => {});
const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

// ─── Step 1 · Welcome (the toolkit, shown) ──────────────────────────────────
// One welcome for everyone. There is deliberately no "welcome back" variant:
// to a v2 upgrader this IS a new app, so they are introduced to it the same
// way a stranger is. Access only ever changes whether the paywall step runs.
//
// The tiles are real app imagery — today's reflection, the Big Book, a speaker
// tape and the three AI sponsors with a sample of the chat — so the first
// screen shows what people came for rather than describing it. No single person
// is the face of it, so it doesn't read as a men's or a women's app. Laid out
// at the mockup's 337×338 and scaled as one piece to the text column, so
// narrow or short screens shrink it instead of re-flowing it.
const TILES_W = 337;
const TILE_ROW_H = 132;
const TILE_CHAT_H = 196;
const TILE_GAP = 10;
const TILES_H = TILE_ROW_H + TILE_GAP + TILE_CHAT_H;
// Steady Eddie · Gentle Grace · Salty Sam, overlapped on the sponsor tile.
// The Big Book tile's cream, as on the Tools screen.
const TILE_CREAM = '#F3EBDA';
const TILE_SPONSORS = ['supportive', 'grace', 'salty']
  .map((id) => SPONSORS.find((s) => s.id === id))
  .filter((s) => s != null);

// iPad / unfolded-Duo heights. On a phone the headline sits at the bottom,
// above the button (the mockup); on a tall screen that leaves a band of empty
// gradient between it and the tiles, so there the two are kept together and
// the group is centered instead.
const isTall = (h: number) => h >= 1000;

// The tiles' labels are part of the picture, so they keep their designed size
// (allowFontScaling off) — the grid as a whole shrinks for large text. Below
// this it stops shrinking and the page scrolls instead.
const TILES_MIN_SCALE = 0.75;
const TILES_TOP_GAP = 22;
// welcomeSafe's horizontal padding, both sides: the text column's width.
const WELCOME_SIDE_PADDING = 56;

function TileLabel({ overline, title, overlineColor, titleColor }: { overline: string; title: string; overlineColor: string; titleColor: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tileLabel}>
      <Text style={[styles.tileOverline, { color: overlineColor }]} allowFontScaling={false}>{overline}</Text>
      <Text style={[styles.tileTitle, { color: titleColor }]} allowFontScaling={false}>{title}</Text>
    </View>
  );
}

function WelcomeTiles({ maxHeight }: { maxHeight?: number }) {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  // As wide as the text column. `maxHeight` is the room the headline and body
  // leave (measured, so large Dynamic Type or a short screen like the folded
  // Duo shrinks the grid instead of pushing the copy under the button).
  const fit = maxHeight != null ? Math.max(TILES_MIN_SCALE, maxHeight / TILES_H) : Infinity;
  const scale = Math.min((Math.min(width, ONBOARDING_MAX_WIDTH) - WELCOME_SIDE_PADDING) / TILES_W, fit);
  return (
    <View style={{ height: TILES_H * scale, alignItems: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.tiles, { transform: [{ scale }], marginTop: (TILES_H * (scale - 1)) / 2 }]}>
        <View style={styles.tileRow}>
          {/* The alarm clock on a sunny windowsill, pinned so the clock stays
              in view; a white fade under the bright window carries the label. */}
          <View style={[styles.tileShadow, { backgroundColor: '#EEF5F2' }]}>
            <View style={styles.tile}>
              <Image source={require('@/assets/images/onboarding-reflection-clock.webp')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: '30%', bottom: 0 }} />
              <LinearGradient colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']} style={styles.tileFadeHalf} />
              <TileLabel overline="DAILY" title="Reflections" overlineColor={families.teal[700]} titleColor="#232529" />
            </View>
          </View>
          <View style={[styles.tileShadow, { backgroundColor: TILE_CREAM }]}>
            <View style={[styles.tile, { backgroundColor: TILE_CREAM }]}>
              {/* A 3D render on a transparent background: the shadow follows
                  the book's shape, and the tile clips its bottom. */}
              <View style={styles.tileBook}>
                <Image source={require('@/assets/images/big-book_cover.webp')} style={StyleSheet.absoluteFill} contentFit="contain" />
              </View>
              <TileLabel overline="READ" title="Big Book" overlineColor="#8B4E3A" titleColor="#232529" />
            </View>
          </View>
          <View style={[styles.tileShadow, { backgroundColor: '#3A2A20' }]}>
            <View style={styles.tile}>
              <Image source={require('@/assets/images/speakers_hero2.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']} style={styles.tileFadeDark} />
              <TileLabel overline="LISTEN" title="Speakers" overlineColor="rgba(255,255,255,0.9)" titleColor="#fff" />
            </View>
          </View>
        </View>
        <View style={[styles.tileShadow, styles.chatTile]}>
          <View style={styles.chatHead}>
            <View style={styles.chatAvatars}>
              {TILE_SPONSORS.map((s, i) => (
                <Image key={s.id} source={s.avatar} style={[styles.chatAvatar, i > 0 && styles.chatAvatarOverlap]} contentFit="cover" />
              ))}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.tileOverline, { color: '#605786' }]} allowFontScaling={false}>AI SPONSORS · 24/7</Text>
              <Text style={styles.chatTitle} allowFontScaling={false}>Someone to talk to at 2am</Text>
            </View>
          </View>
          {/* A sample exchange in the real chat's style. */}
          <View style={styles.chatUser}>
            <Text style={styles.chatUserText} allowFontScaling={false}>I really want a drink tonight.</Text>
          </View>
          <View style={styles.chatBot}>
            <Text style={styles.chatBotText} allowFontScaling={false}>I hear you. Let&apos;s get through tonight together.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WelcomeStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  useGradientBackdrop(0.18, isDark);
  const tall = isTall(useWindowDimensions().height);
  // Measured: the scroll viewport, the wordmark row and the copy block. What's
  // left between them is the tiles' room.
  const [viewportH, setViewportH] = useState(0);
  const [wordmarkH, setWordmarkH] = useState(0);
  const [copyH, setCopyH] = useState(0);
  const tilesRoom = viewportH && copyH ? viewportH - wordmarkH - TILES_TOP_GAP - copyH : undefined;
  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <OnboardingColumn style={styles.welcomeSafe}>
          <ScrollView
            contentContainerStyle={styles.welcomeScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          >
            <View style={styles.wordmarkRow} onLayout={(e) => setWordmarkH(e.nativeEvent.layout.height)}>
              <Image source={require('@/assets/images/icon.png')} style={styles.wordmarkIcon} contentFit="cover" />
              <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.wordmark}>Sober Dailies</Text>
              {/* Same look as the tour screens' Skip; under the safe area, so
                  clear of the status bar and Dynamic Island. */}
              <Pressable onPress={onSkip} hitSlop={12} style={styles.welcomeSkip} accessibilityRole="button" accessibilityLabel="Skip">
                <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeSkipText}>Skip</Text>
              </Pressable>
            </View>
            {/* Phones: the copy stays at the bottom and the leftover space is
                split above and below the tiles. Tall screens: the tiles and
                the copy are kept together and centered. */}
            <View style={styles.flex} />
            <View style={styles.tilesWrap}>
              <WelcomeTiles maxHeight={tilesRoom} />
            </View>
            {!tall && <View style={styles.flex} />}
            <View style={[styles.welcomeCopy, tall && styles.welcomeCopyTall]}>
              {/* Measured on its own, plus the block's own top and bottom
                  padding. */}
              <View onLayout={(e) => setCopyH(e.nativeEvent.layout.height + (tall ? 48 : 20) + 26)}>
                <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeHeadline} accessibilityRole="header">Your whole recovery toolkit, in one place</Text>
                <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeBody}>
                  The Big Book, Daily Reflections, speaker tapes, prayers, your sobriety count — and a sponsor to talk to at 2am.
                </Text>
              </View>
            </View>
            {tall && <View style={styles.flex} />}
          </ScrollView>
          <View style={styles.welcomeFooter}>
            <Pressable style={styles.welcomeBtn} onPress={onContinue} accessibilityRole="button">
              <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeBtnText}>Get started</Text>
              <ArrowRight size={18} color={obvInk(0.55)} />
            </Pressable>
            <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeAgreeLine}>
              By continuing, you agree to our <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeAgreeLink} onPress={openTerms}>Terms of Use</Text> and <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.welcomeAgreeLink} onPress={openPrivacy}>Privacy Policy</Text>.
            </Text>
          </View>
        </OnboardingColumn>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 2 · Disclaimer ────────────────────────────────────────────────────
// The v2 welcome-screen disclaimer, on our gradient: what the app is not, the
// 988 line, and an explicit Terms/Privacy checkbox. Runs right after Welcome,
// before the tour and the paywall — agreeing to what the app is and isn't
// comes before anything else, and long before we take anyone's money. Still
// exported: app/_layout renders it as a backstop for people who completed
// onboarding before it existed.
const DISCLAIMER_BULLETS = [
  'This app is not a substitute for therapy, medical advice, or emergency support.',
  'The AI sponsors offer encouragement and reflection, but they are not human and cannot provide crisis support or clinical help.',
  'If you’re in immediate danger or emotional distress, call or text 988 (Suicide & Crisis Lifeline) or contact your local emergency services.',
];

export function DisclaimerStep({ onAgree }: { onAgree: () => void | Promise<void> }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  useGradientBackdrop(0.5, isDark);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const agree = async () => {
    if (!checked || saving) return;
    setSaving(true);
    // Local acceptance record + best-effort server sync (retries on launch).
    await recordDisclaimerAcceptance();
    await onAgree();
  };

  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Same centered column as the tour screens, so on an iPad or an
            unfolded Duo the card and the checkbox line don't run edge to edge. */}
        <OnboardingColumn>
        <ScrollView contentContainerStyle={styles.consentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.consentMark}>
            <ShieldCheck size={30} color="#fff" strokeWidth={1.8} />
          </View>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentTitle}>Before you begin</Text>
          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentDesc}>A word about safety.</Text>

          <View style={styles.consentCard}>
            <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentNote}>Please note:</Text>
            {DISCLAIMER_BULLETS.map((line, i) => (
              <View key={i} style={[styles.consentBullet, i > 0 && { marginTop: 12 }]}>
                <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentBulletDot}>•</Text>
                <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentBulletText}>{line}</Text>
              </View>
            ))}
          </View>

          <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentAgree}>
            By continuing, you agree to our <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentLink} onPress={openTerms}>Terms of Use</Text> and <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentLink} onPress={openPrivacy}>Privacy Policy</Text>.
          </Text>

          <Pressable style={styles.consentCheckRow} onPress={() => setChecked((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
            <View style={[styles.consentCheckbox, checked && styles.consentCheckboxOn]}>
              {checked && <Check size={15} color="#fff" strokeWidth={3} />}
            </View>
            <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentCheckText}>I understand the above, and have read and agree to the Terms of Use and Privacy Policy.</Text>
          </Pressable>

          <Pressable
            style={[styles.consentContinue, !checked && styles.consentContinueOff]}
            onPress={agree}
            disabled={!checked || saving}
            accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color={obvInk(0.55)} /> : <Text maxFontSizeMultiplier={TOUR_MAX_FONT_SCALE} style={styles.consentContinueText}>Continue</Text>}
          </Pressable>
        </ScrollView>
        </OnboardingColumn>
      </SafeAreaView>
    </View>
  );
}

// ─── The flow ───────────────────────────────────────────────────────────────
// Agree to it → see it → subscribe. Consent comes first, right after Welcome,
// so everything after it (including the sponsor trial, which sends real
// messages) happens after agreeing to what the app is and isn't. The five tour
// screens then show what people came for (their count, today's reading, the
// everyday tools, the program, the sponsors) before the paywall. There is no
// setup after the paywall: the program is already the six defaults, and Today
// introduces Edit with a one-time tip.
//
// `help` is the sponsor and Spot Check try.
type Step = 'welcome' | 'disclaimer' | 'counter' | 'reflection' | 'tools' | 'program' | 'help' | 'paywall';

// Funnel position for `onboarding_step`. Fixed per step rather than counted, so
// a member (no paywall) and a new user report the same index for the same
// screen and the two funnels line up in Mixpanel.
const STEP_INDEX: Record<Step, number> = {
  welcome: 0, disclaimer: 1, counter: 2, reflection: 3, tools: 4, program: 5, help: 6, paywall: 7,
};
// Position on the tour's 5-segment progress rail.
const TOUR_INDEX = { counter: 0, reflection: 1, tools: 2, program: 3, help: 4 } as const;
// Where back goes — always the screen before in the tour, even when Skip
// jumped past it. The counter goes back to Welcome, not to the consent just
// given. Welcome, the paywall and everything after have no back.
const PREV_STEP: Partial<Record<Step, Step>> = {
  disclaimer: 'welcome', counter: 'welcome', reflection: 'counter', tools: 'reflection', program: 'tools', help: 'program',
};
// iPhone swipe-back: a drag that starts this close to the left edge and
// travels this far (or flicks) goes back a step.
const EDGE_WIDTH = 24;
const SWIPE_DISTANCE = 70;
// Tags every onboarding event so this flow and the carousel one it replaced
// can be compared side by side.
const FLOW_VERSION = 'v4_help';
// Read by Today: show the one-time "Edit your dailies" tip after this flow.
// Only this flow sets it, so people already past onboarding never see the tip.
export const TODAY_TIP_PENDING_KEY = 'today_edit_tip_pending';
// What this device already tried on the help step. The server is the real
// limit (one try per device, ever); this just keeps the list honest across a
// relaunch so a card the server would refuse shows as tried.
const TRY_TRIED_KEY = 'onboarding_try_tried';

export default function OnboardingFlow({
  onDisclaimerAccepted,
  onPaywallBypassed,
  passToken,
  onPassHandled,
}: {
  onDisclaimerAccepted?: () => void;
  // __DEV__ only: the simulator bypass has to release the backstop gate in
  // app/_layout too. Without it, finishing without a real entitlement drops
  // straight onto a second paywall.
  onPaywallBypassed?: () => void;
  passToken?: string | null;
  onPassHandled?: () => void | Promise<void>;
}) {
  const { completeOnboarding } = useOnboarding();
  const { setSobrietyDate, sobrietyDate } = useSobriety();
  // Everyone runs the same introduction — grandfathered members included. To
  // them this IS a new app, so they get the welcome, the disclaimer and the
  // tour. The ONLY thing their access buys them is skipping the paywall.
  //
  // Frozen at mount, deliberately: a new user who subscribes at the paywall
  // step flips isPremium true mid-flow, and re-reading it live would change
  // the route under them. app/_layout holds the render until subscription
  // state resolves, so this is already settled here.
  const { isPremium } = useSubscription();
  const [alreadyHadAccess] = useState(isPremium);
  const trialAvailable = useTrialAvailable();
  // The help step's button and the sponsors' closings: same eligibility check
  // the paywall uses.
  const tryOffer: TryOffer = alreadyHadAccess ? 'member' : trialAvailable ? 'trial' : 'subscribe';
  const [step, setStep] = useState<Step>('welcome');
  // The help step shows its list, or one try on top of it. Tried lives here so
  // it survives going back and forward through the tour.
  const [helpView, setHelpView] = useState<'list' | TryTarget>('list');
  const [tried, setTried] = useState<ReadonlySet<TryTarget>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem(TRY_TRIED_KEY)
      .then((v) => { if (v) setTried((cur) => new Set([...cur, ...(JSON.parse(v) as TryTarget[])])); })
      .catch(() => {});
  }, []);
  const markTried = (target: TryTarget) => {
    setTried((cur) => {
      if (cur.has(target)) return cur;
      const next = new Set(cur).add(target);
      AsyncStorage.setItem(TRY_TRIED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  };
  // The counter's typed date lives here, not in the step, so it survives
  // going back to Welcome before it's saved.
  const [dateDraft, setDateDraft] = useState(() => toDateInput(sobrietyDate ? parseLocalDate(sobrietyDate) : null));
  // A saved date that loads after mount still prefills an untouched field.
  useEffect(() => {
    if (sobrietyDate && !dateDraft) setDateDraft(toDateInput(parseLocalDate(sobrietyDate)));
  }, [sobrietyDate]);

  // Funnel tracking. Every event carries is_member so the two populations can
  // be split; the step event fires once per showing (keyed on the step, so
  // re-renders don't repeat it but coming back to a step does).
  const track = (event: string, props?: Record<string, any>) =>
    logEvent(event, { is_member: alreadyHadAccess, flow_version: FLOW_VERSION, ...props });
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('onboarding_started');
  }, []);
  useEffect(() => {
    track('onboarding_step', { step, step_index: STEP_INDEX[step] });
  }, [step]);

  const go = (next: Step) => setStep(next);
  const back = (via: 'button' | 'swipe' | 'android_back') => {
    // Inside a try, back returns to the help list.
    if (step === 'help' && helpView !== 'list') {
      setHelpView('list');
      return true;
    }
    const prev = PREV_STEP[step];
    if (!prev) return false;
    track('onboarding_back_tapped', { from_step: step, via });
    setStep(prev);
    return true;
  };
  // The swipe handler is created once, so it reads the current back() here.
  const backRef = useRef(back);
  backRef.current = back;
  const edgeTouchRef = useRef(false);
  const swipeBack = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: (e) => {
      edgeTouchRef.current = e.nativeEvent.pageX < EDGE_WIDTH;
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_, g) =>
      edgeTouchRef.current && g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_DISTANCE || g.vx > 0.5) backRef.current('swipe');
    },
  })).current;
  // Skip on Welcome still runs the disclaimer, then jumps past the tour.
  const [skippedWelcome, setSkippedWelcome] = useState(false);
  const skipWelcome = () => {
    track('onboarding_skipped', { from: 'welcome' });
    setSkippedWelcome(true);
    go('disclaimer');
  };
  const startTour = () => {
    setSkippedWelcome(false);
    go('disclaimer');
  };
  // Skip on a tour screen: consent is already done, so straight to the end.
  const skipTour = () => {
    track('onboarding_skip_tapped', { from_step: step });
    if (step === 'counter') track('onboarding_counter_skipped');
    toPaywall();
  };

  // Members skip only the paywall.
  const toPaywall = async () => {
    if (alreadyHadAccess) await finish();
    else go('paywall');
  };
  const finishedRef = useRef(false);
  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    track('onboarding_completed');
    await AsyncStorage.setItem(TODAY_TIP_PENDING_KEY, '1').catch(() => {});
    await completeOnboarding();
    // No router.replace here: onboarding is a render gate in app/_layout, not a
    // route. When the flag flips, the gate swaps this flow out for the Stack
    // (which mounts at '/' anyway); navigating while no navigator is mounted
    // forces a root re-mount that flashes the teal fill.
  };

  // The paywall X (and Android back on the paywall) returns to the start of
  // the introduction rather than trapping someone there — the visible way out
  // Play's Subscriptions policy asks for.
  const closePaywall = () => {
    track('onboarding_paywall_closed');
    setStep('welcome');
  };

  // Android back walks back through the tour (PREV_STEP) and closes the
  // paywall like its X. On Welcome it falls through to the system (leaves the
  // app), as it always has.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'paywall') { closePaywall(); return true; }
      return back('android_back');
    });
    return () => sub.remove();
  }, [step, helpView]);

  const content = renderStep();
  // iPhone only: Android has its own back gesture, which arrives above.
  if (Platform.OS !== 'ios' || !PREV_STEP[step]) return content;
  return <View style={{ flex: 1 }} {...swipeBack.panHandlers}>{content}</View>;

  function renderHelp() {
    const startTrial = (from: 'list' | TryTarget) => {
      track('onboarding_start_trial_tapped', { from: from === 'list' ? 'list' : TRY_EVENT_NAME[from] });
      setHelpView('list');
      toPaywall();
    };
    if (helpView === 'list') {
      return (
        <HelpList
          index={TOUR_INDEX.help}
          tried={tried}
          offer={tryOffer}
          onOpen={(target) => {
            track('onboarding_try_opened', { target: TRY_EVENT_NAME[target] });
            setHelpView(target);
          }}
          onContinue={() => startTrial('list')}
          onSkip={skipTour}
          onBack={() => back('button')}
        />
      );
    }
    const handlers = {
      tried,
      offer: tryOffer,
      onTried: markTried,
      onFinished: (target: TryTarget) => track('onboarding_try_finished', { target: TRY_EVENT_NAME[target] }),
      onBack: () => back('button'),
      onTryAnother: (from: TryTarget) => {
        track('onboarding_try_another_tapped', { from: TRY_EVENT_NAME[from] });
        setHelpView('list');
      },
      onStartTrial: startTrial,
      track,
    };
    if (helpView === 'spotcheck') return <HelpTrySpotCheck {...handlers} />;
    return <HelpTryChat key={helpView} sponsorId={helpView} {...handlers} />;
  }

  function renderStep() {
    if (step === 'welcome') return <WelcomeStep onContinue={startTour} onSkip={skipWelcome} />;
    if (step === 'disclaimer') {
      // Right after Welcome, so everything after it follows agreement.
      // DisclaimerStep records acceptance itself.
      return (
        <DisclaimerStep
          onAgree={async () => {
            track('onboarding_disclaimer_accepted');
            onDisclaimerAccepted?.();
            if (skippedWelcome) await toPaywall();
            else go('counter');
          }}
        />
      );
    }
    if (step === 'counter') {
      return (
        <CounterStep
          // Prefilled for anyone who already has a date — a v2 upgrader confirms
          // theirs rather than retyping it.
          value={dateDraft}
          onChangeValue={setDateDraft}
          onSave={(date, method) => {
            track('onboarding_counter_saved', { method, had_date: !!sobrietyDate });
            setSobrietyDate(formatLocalDate(date));
            go('reflection');
          }}
          onSkip={skipTour}
          onBack={() => back('button')}
        />
      );
    }
    if (step === 'reflection') return <ReflectionStep onContinue={() => go('tools')} onSkip={skipTour} onBack={() => back('button')} />;
    // Placeholder until the "All the tools you use every day" screen exists.
    if (step === 'tools') return <ToolsStep index={TOUR_INDEX.tools} onContinue={() => go('program')} onSkip={skipTour} onBack={() => back('button')} />;
    if (step === 'program') return <ProgramStep index={TOUR_INDEX.program} onContinue={() => go('help')} onSkip={skipTour} onBack={() => back('button')} />;
    if (step === 'help') return renderHelp();
    // Paywall. Advancing is driven by isPremium flipping after a purchase or
    // restore, including a store-native Pass It On subscription redemption.
    return (
      <PaywallStep
        onSubscribed={finish}
        onClose={closePaywall}
        passToken={passToken}
        onPassHandled={onPassHandled}
        onBypass={() => {
          onPaywallBypassed?.();
          finish();
        }}
      />
    );
  }
}

// Paywall as a step. PaywallScreen applies the purchased CustomerInfo itself,
// so the subscription flips on in the provider; watch for that rather than
// hooking the buy button, so a restore or a gift code advances too.
//
// Tapping the X backs out to the start of onboarding, in every build. In
// __DEV__ only, the DEV SKIP control jumps past the paywall instead, so
// the rest of the flow stays reachable on a simulator without a sandbox
// purchase — the two used to be the same gesture and can't be, now that the
// tap has a real job.
function PaywallStep({
  onSubscribed,
  onClose,
  onBypass,
  passToken,
  onPassHandled,
}: {
  onSubscribed: () => void;
  onClose: () => void;
  onBypass: () => void;
  passToken?: string | null;
  onPassHandled?: () => void | Promise<void>;
}) {
  const { isPremium } = useSubscription();
  // Internal preview APKs are installed directly rather than through Google
  // Play, so Play Billing cannot complete a real subscription purchase in
  // them. Let the visible close control continue into the app on the preview
  // channel; store/production builds retain the normal paywall behavior.
  const isInternalPreview = Updates.channel === 'dev';
  useEffect(() => {
    if (isPremium) onSubscribed();
  }, [isPremium, onSubscribed]);
  if (passToken) {
    return (
      <PassOfferScreen
        token={passToken}
        onPurchased={() => onPassHandled?.()}
        onDismiss={async () => {
          await onPassHandled?.();
          onClose();
        }}
      />
    );
  }
  return (
    <PaywallScreen
      onDismiss={isInternalPreview ? onBypass : onClose}
      // Backing out to the welcome screen only makes sense while the wall
      // works. If offerings never load, that X just loops someone through the
      // intro and back to the same dead screen — so carry on into the app instead.
      onUnavailableDismiss={onBypass}
      onDevBypass={onBypass}
      context="onboarding"
    />
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors } = tk;
  return StyleSheet.create({
  // consent
  consentScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  consentMark: { width: 60, height: 60, borderRadius: 18, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  consentTitle: { fontFamily: fontFamily.displayBold, fontSize: 32, color: '#fff', textAlign: 'center', letterSpacing: -0.6, lineHeight: 35 },
  consentDesc: { fontFamily: fontFamily.serifItalic, fontSize: fontSize.lg, color: '#fff', opacity: 0.94, textAlign: 'center', lineHeight: 24, marginTop: 14 },
  consentCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 18, marginVertical: 24 },
  consentNote: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: '#fff', marginBottom: 12 },
  consentBullet: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  consentBulletDot: { color: '#fff', fontSize: 16, lineHeight: 21 },
  consentBulletText: { flex: 1, color: '#fff', opacity: 0.92, fontSize: 14.5, lineHeight: 21 },
  consentAgree: { color: '#fff', opacity: 0.92, fontSize: fontSize.base, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  consentLink: { textDecorationLine: 'underline', fontFamily: fontFamily.semiBold },
  consentCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 8, marginBottom: 26 },
  consentCheckbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentCheckboxOn: { backgroundColor: colors.success, borderColor: colors.success },
  consentCheckText: { flex: 1, color: '#fff', fontSize: fontSize.base, lineHeight: 21 },
  consentContinue: { alignSelf: 'center', backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 48, borderRadius: 26, minWidth: 200, alignItems: 'center' },
  consentContinueOff: { backgroundColor: 'rgba(255,255,255,0.3)' },
  // obvInk, NOT colors.primaryDark. The pill is a hardcoded #fff in both modes,
  // so its label must be fixed too: colors.primaryDark resolves to #63C8C0 on
  // dark, which is 2:1 on white. Same value the sibling "Get started" button
  // uses, and the same one this button's own spinner already used.
  consentContinueText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: obvInk(0.55) },

  // welcome
  flex: { flex: 1 },
  welcomeRoot: { flex: 1 },
  welcomeSafe: { paddingHorizontal: 28 },
  welcomeScroll: { flexGrow: 1 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  wordmarkIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  wordmark: { fontFamily: fontFamily.displayBold, fontSize: 17, letterSpacing: -0.2, color: '#fff' },
  welcomeSkip: { marginLeft: 'auto' },
  welcomeSkipText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: '#fff', paddingVertical: 8 },
  tilesWrap: { marginTop: TILES_TOP_GAP },
  welcomeCopy: { paddingTop: 20, paddingBottom: 26 },
  welcomeCopyTall: { paddingTop: 48 },
  welcomeHeadline: { fontFamily: fontFamily.displayBold, fontSize: 33, lineHeight: 37, letterSpacing: -0.7, color: '#fff' },
  welcomeBody: { fontFamily: fontFamily.regular, fontSize: fontSize.lg, lineHeight: 23, color: 'rgba(255,255,255,0.94)', marginTop: 14 },
  welcomeFooter: { paddingBottom: 14 },
  welcomeBtn: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...shadows.md,
  },
  welcomeBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: obvInk(0.55) },
  welcomeAgreeLine: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,255,255,0.86)', textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  welcomeAgreeLink: { fontFamily: fontFamily.semiBold, color: '#fff', textDecorationLine: 'underline' },

  // welcome tiles — the mockup's sizes, inside a 337×338 box that
  // WelcomeTiles scales as a whole. Photos and fixed colors, so they read the
  // same on the light and dark gradients.
  tiles: { width: TILES_W, height: TILES_H, gap: TILE_GAP },
  tileRow: { flexDirection: 'row', gap: TILE_GAP, height: TILE_ROW_H },
  // Shadow on an unclipped wrapper; the tile inside clips its picture.
  tileShadow: { flex: 1, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  tile: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  tileFadeHalf: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
  tileFadeDark: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
  tileLabel: { position: 'absolute', left: 12, right: 8, top: 12 },
  tileOverline: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 1.4 },
  tileTitle: { fontFamily: fontFamily.serif, fontSize: 15, lineHeight: 18, marginTop: 3 },
  // About 70% of the tile's width, centered and running off the bottom.
  // No background, so iOS draws the shadow from the image's alpha (the
  // book's outline); Android's elevation would draw a box, so it uses the
  // drop-shadow filter, which follows the outline.
  tileBook: {
    position: 'absolute', left: '15%', width: '70%', top: 58, height: 100, transform: [{ rotate: '-6deg' }],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 8 } },
      android: { filter: [{ dropShadow: { offsetX: 0, offsetY: 8, standardDeviation: 6, color: 'rgba(0,0,0,0.3)' } }] },
    }),
  },
  // The real chat page's paper.
  chatTile: { flex: 0, height: TILE_CHAT_H, backgroundColor: '#FCFBF8', paddingHorizontal: 14, paddingVertical: 14 },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatAvatars: { flexDirection: 'row' },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  chatAvatarOverlap: { marginLeft: -12 },
  chatTitle: { fontFamily: fontFamily.serif, fontSize: 18, lineHeight: 22, color: '#232529', marginTop: 2 },
  chatUser: { alignSelf: 'flex-end', marginTop: 12, backgroundColor: families.teal[500], borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 9, paddingHorizontal: 13 },
  chatUserText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 18, color: '#fff' },
  chatBot: { alignSelf: 'flex-start', maxWidth: '85%', marginTop: 8, backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 9, paddingHorizontal: 13, ...shadows.sm },
  chatBotText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 18, color: '#232529' },
  });
};
