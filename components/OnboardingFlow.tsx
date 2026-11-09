import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, ScrollView, BackHandler, PanResponder, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Check, Play, ShieldCheck } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
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
import { ONBOARDING_MAX_WIDTH, OnboardingColumn } from '@/components/onboarding/OnboardingChrome';
import CounterStep from '@/components/onboarding/CounterStep';
import { toDateInput } from '@/lib/soberDateInput';
import ReflectionStep from '@/components/onboarding/ReflectionStep';
import { ReadListenStep, TalkPracticeStep } from '@/components/onboarding/ToolsSteps';

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
// disclaimer step, which now runs BEFORE the paywall so nobody is charged
// before agreeing (moved back into this flow 2026-08-13).
const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {});
const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

// ─── Step 1 · Welcome (the toolkit, shown) ──────────────────────────────────
// One welcome for everyone. There is deliberately no "welcome back" variant:
// to a v2 upgrader this IS a new app, so they are introduced to it the same
// way a stranger is. Access only ever changes whether the paywall step runs.
//
// The collage is real app imagery — the Big Book, today's-reading card, a
// speaker tape and Gentle Grace — so the first screen shows what people came
// for rather than describing it. Laid out at the mockup's 334×330 and scaled
// as one piece, so narrow or short screens shrink it instead of re-flowing it.
const COLLAGE_W = 334;
const COLLAGE_H = 330;
const GRACE = SPONSORS.find((s) => s.id === 'grace');
const MEETING_PHOTO = require('@/assets/images/literature_hero2.webp');

// iPad / unfolded-Duo heights. On a phone the headline sits at the bottom,
// above the button (the mockup); on a tall screen that leaves a band of empty
// gradient between it and the collage, so there the two are kept together and
// the group is centered instead.
const isTall = (h: number) => h >= 1000;

// The collage's labels are part of the picture, so they keep their designed
// size (allowFontScaling off) — the collage as a whole shrinks for large text.
// Below this the collage stops shrinking and the page scrolls instead.
const COLLAGE_MIN_SCALE = 0.55;
const COLLAGE_TOP_GAP = 22;

function WelcomeCollage({ maxHeight }: { maxHeight?: number }) {
  const styles = useThemedStyles(makeStyles);
  const { width, height } = useWindowDimensions();
  // Up to 1.3× on a tall screen (iPad, unfolded Duo) so it fills the column.
  // `maxHeight` is the room the headline and body leave (measured, so large
  // Dynamic Type or a short screen like the folded Duo shrinks the collage
  // instead of pushing the copy under the button).
  const fit = maxHeight != null ? Math.max(COLLAGE_MIN_SCALE, maxHeight / COLLAGE_H) : Infinity;
  const scale = Math.min(isTall(height) ? 1.3 : 1, (Math.min(width, ONBOARDING_MAX_WIDTH) - 56) / COLLAGE_W, height / 844, fit);
  return (
    <View style={{ height: COLLAGE_H * scale, alignItems: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.collage, { transform: [{ scale }], marginTop: (COLLAGE_H * (scale - 1)) / 2 }]}>
        {/* The Big Book as a card like the other two: the cover over the same
            blurred, darkened meeting room the paywall's Literature tile uses. */}
        <View style={styles.collageBook}>
          <View style={styles.collageBookCard}>
            <Image source={MEETING_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top left" blurRadius={40} />
            <LinearGradient colors={['rgba(18,26,38,0.15)', 'rgba(18,26,38,0.45)', 'rgba(18,26,38,0.75)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Image source={require('@/assets/images/big-book_cover.webp')} style={styles.collageBookCover} contentFit="cover" />
          </View>
        </View>
        <View style={styles.collageSpeakers}>
          <Image source={require('@/assets/images/speakers_hero2.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.collageSpeakersRow}>
            <View style={styles.collagePlay}><Play size={12} color="#2D5882" fill="#2D5882" /></View>
            <Text style={styles.collageSpeakersText} allowFontScaling={false}>Speaker tapes</Text>
          </View>
        </View>
        <View style={styles.collageReflection}>
          {/* The green cairn, not the seedling: the seedling's warm browns read
              as the same photo as the speaker-tapes card beside it. */}
          <Image source={require('@/assets/reflections_images/reflection_bg3.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
          <View style={styles.collageReflectionText}>
            <Text style={styles.collageOverline} allowFontScaling={false}>DAILY REFLECTIONS</Text>
            <Text style={styles.collageReflectionTitle} allowFontScaling={false}>Today&apos;s reading</Text>
          </View>
        </View>
        <View style={styles.collageChat}>
          {GRACE && <Image source={GRACE.avatar} style={styles.collageAvatar} contentFit="cover" />}
          <View>
            <Text style={styles.collageChatName} allowFontScaling={false}>Gentle Grace</Text>
            <Text style={styles.collageChatText} allowFontScaling={false}>I&apos;m here. What&apos;s going on?</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  useGradientBackdrop(0.18, isDark);
  const tall = isTall(useWindowDimensions().height);
  // Measured: the scroll viewport, the wordmark row and the copy block. What's
  // left between them is the collage's room.
  const [viewportH, setViewportH] = useState(0);
  const [wordmarkH, setWordmarkH] = useState(0);
  const [copyH, setCopyH] = useState(0);
  const collageRoom = viewportH && copyH ? viewportH - wordmarkH - COLLAGE_TOP_GAP - copyH : undefined;
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
              <Text style={styles.wordmark}>Sober Dailies</Text>
            </View>
            {tall && <View style={styles.flex} />}
            <View style={styles.collageWrap}>
              <WelcomeCollage maxHeight={collageRoom} />
            </View>
            <View style={[styles.welcomeCopy, tall && styles.welcomeCopyTall]}>
              {/* Measured on its own (the block above it grows to fill), plus
                  the block's own top and bottom padding. */}
              <View onLayout={(e) => setCopyH(e.nativeEvent.layout.height + (tall ? 48 : 20) + 26)}>
                <Text style={styles.welcomeHeadline} accessibilityRole="header">Your whole recovery toolkit, in one place</Text>
                <Text style={styles.welcomeBody}>
                  The Big Book, Daily Reflections, speaker tapes, prayers, your sobriety count — and a sponsor to talk to at 2am.
                </Text>
              </View>
            </View>
            {tall && <View style={styles.flex} />}
          </ScrollView>
          <View style={styles.welcomeFooter}>
            <Pressable style={styles.welcomeBtn} onPress={onContinue} accessibilityRole="button">
              <Text style={styles.welcomeBtnText}>Get started</Text>
              <ArrowRight size={18} color={obvInk(0.55)} />
            </Pressable>
            <Text style={styles.welcomeAgreeLine}>
              By continuing, you agree to our <Text style={styles.welcomeAgreeLink} onPress={openTerms}>Terms of Use</Text> and <Text style={styles.welcomeAgreeLink} onPress={openPrivacy}>Privacy Policy</Text>.
            </Text>
          </View>
        </OnboardingColumn>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 3 · Disclaimer ────────────────────────────────────────────────────
// The v2 welcome-screen disclaimer, on our gradient: what the app is not, the
// 988 line, and an explicit Terms/Privacy checkbox. Runs after the carousel and
// BEFORE the paywall — agreeing to what the app is and isn't shouldn't come
// after we've taken someone's money. Still exported: app/_layout renders it as
// a backstop for people who completed onboarding before it existed.
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
          <Text style={styles.consentTitle}>Before you begin</Text>
          <Text style={styles.consentDesc}>A word about safety.</Text>

          <View style={styles.consentCard}>
            <Text style={styles.consentNote}>Please note:</Text>
            {DISCLAIMER_BULLETS.map((line, i) => (
              <View key={i} style={[styles.consentBullet, i > 0 && { marginTop: 12 }]}>
                <Text style={styles.consentBulletDot}>•</Text>
                <Text style={styles.consentBulletText}>{line}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.consentAgree}>
            By continuing, you agree to our <Text style={styles.consentLink} onPress={openTerms}>Terms of Use</Text> and <Text style={styles.consentLink} onPress={openPrivacy}>Privacy Policy</Text>.
          </Text>

          <Pressable style={styles.consentCheckRow} onPress={() => setChecked((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
            <View style={[styles.consentCheckbox, checked && styles.consentCheckboxOn]}>
              {checked && <Check size={15} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={styles.consentCheckText}>I understand the above, and have read and agree to the Terms of Use and Privacy Policy.</Text>
          </Pressable>

          <Pressable
            style={[styles.consentContinue, !checked && styles.consentContinueOff]}
            onPress={agree}
            disabled={!checked || saving}
            accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color={obvInk(0.55)} /> : <Text style={styles.consentContinueText}>Continue</Text>}
          </Pressable>
        </ScrollView>
        </OnboardingColumn>
      </SafeAreaView>
    </View>
  );
}

// ─── The flow ───────────────────────────────────────────────────────────────
// Show it → agree to it → subscribe. The four tour screens show what people
// came for (their count, today's reading, the literature and speakers, the
// sponsor and the practices) before anything is asked of them; the disclaimer
// still comes before the paywall so nobody is charged before agreeing to what
// the app is. There is no setup after the paywall any more: the program is
// already the six defaults, and Today introduces Edit with a one-time tip.
type Step = 'welcome' | 'counter' | 'reflection' | 'read_listen' | 'talk_practice' | 'disclaimer' | 'paywall';

// Funnel position for `onboarding_step`. Fixed per step rather than counted, so
// a member (no paywall) and a new user report the same index for the same
// screen and the two funnels line up in Mixpanel.
const STEP_INDEX: Record<Step, number> = {
  welcome: 0, counter: 1, reflection: 2, read_listen: 3, talk_practice: 4, disclaimer: 5, paywall: 6,
};
// Where back goes — always the screen before in the tour, even when Skip
// jumped past it. Welcome, the paywall and everything after have no back.
const PREV_STEP: Partial<Record<Step, Step>> = {
  counter: 'welcome', reflection: 'counter', read_listen: 'reflection', talk_practice: 'read_listen', disclaimer: 'talk_practice',
};
// iPhone swipe-back: a drag that starts this close to the left edge and
// travels this far (or flicks) goes back a step.
const EDGE_WIDTH = 24;
const SWIPE_DISTANCE = 70;
// Tags every onboarding event so this flow and the carousel one it replaced
// can be compared side by side.
const FLOW_VERSION = 'v2_tools';
// Read by Today: show the one-time "Edit your dailies" tip after this flow.
// Only this flow sets it, so people already past onboarding never see the tip.
export const TODAY_TIP_PENDING_KEY = 'today_edit_tip_pending';

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
  // them this IS a new app, so they get the welcome, the tour and the
  // disclaimer. The ONLY thing their access buys them is skipping the paywall.
  //
  // Frozen at mount, deliberately: a new user who subscribes at the paywall
  // step flips isPremium true mid-flow, and re-reading it live would change
  // the route under them. app/_layout holds the render until subscription
  // state resolves, so this is already settled here.
  const { isPremium } = useSubscription();
  const [alreadyHadAccess] = useState(isPremium);
  const [step, setStep] = useState<Step>('welcome');
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
  const skipTour = () => {
    track('onboarding_skip_tapped', { from_step: step });
    if (step === 'counter') track('onboarding_counter_skipped');
    go('disclaimer');
  };

  // Members skip only the paywall.
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
  }, [step]);

  const content = renderStep();
  // iPhone only: Android has its own back gesture, which arrives above.
  if (Platform.OS !== 'ios' || !PREV_STEP[step]) return content;
  return <View style={{ flex: 1 }} {...swipeBack.panHandlers}>{content}</View>;

  function renderStep() {
    if (step === 'welcome') return <WelcomeStep onContinue={() => go('counter')} />;
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
    if (step === 'reflection') return <ReflectionStep onContinue={() => go('read_listen')} onSkip={skipTour} onBack={() => back('button')} />;
    if (step === 'read_listen') return <ReadListenStep onContinue={() => go('talk_practice')} onSkip={skipTour} onBack={() => back('button')} />;
    if (step === 'talk_practice') return <TalkPracticeStep onContinue={() => go('disclaimer')} onSkip={skipTour} onBack={() => back('button')} />;
    if (step === 'disclaimer') {
      // Before the paywall: agreeing to what this app is and isn't shouldn't come
      // after we've taken the money. DisclaimerStep records acceptance itself.
      return (
        <DisclaimerStep
          onAgree={async () => {
            track('onboarding_disclaimer_accepted');
            onDisclaimerAccepted?.();
            if (alreadyHadAccess) await finish();
            else go('paywall');
          }}
        />
      );
    }
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
  collageWrap: { marginTop: COLLAGE_TOP_GAP },
  welcomeCopy: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 20, paddingBottom: 26 },
  welcomeCopyTall: { flexGrow: 0, paddingTop: 48 },
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

  // welcome collage — positions are the mockup's, inside a 334×330 box that
  // WelcomeCollage scales as a whole. Its cards are photos with white text and
  // a white chat chip, so they read the same on the light and dark gradients.
  collage: { width: COLLAGE_W, height: COLLAGE_H },
  // Outer view carries the tilt and shadow; the inner card clips to its
  // rounded corners (a clipping view can't also cast the shadow).
  // Mirrors the speaker card (same size and height, opposite tilt) so the two
  // side cards balance around the reflection card.
  collageBook: { position: 'absolute', left: 0, top: 30, width: 140, height: 176, transform: [{ rotate: '-8deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 16 } },
  collageBookCard: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#121A26' },
  // Fills most of the card, leaving a narrow band of the meeting room around
  // it; cover aspect is 0.76.
  collageBookCover: { position: 'absolute', left: 8, top: 7, width: 124, height: 162, borderRadius: 5 },
  collageSpeakers: { position: 'absolute', right: 0, top: 30, width: 140, height: 176, borderRadius: 16, overflow: 'hidden', backgroundColor: '#3A2A20', transform: [{ rotate: '8deg' }] },
  // Right-aligned: the reflection card overlaps this one's left third.
  collageSpeakersRow: { position: 'absolute', right: 12, bottom: 12, alignItems: 'flex-end', gap: 6 },
  collagePlay: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  collageSpeakersText: { fontFamily: fontFamily.bold, fontSize: 11.5, lineHeight: 14, color: '#fff', textAlign: 'right', maxWidth: 60 },
  collageReflection: { position: 'absolute', left: 82, top: 0, width: 170, height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: '#2E5A5A', ...shadows.lg },
  collageReflectionText: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  collageOverline: { fontFamily: fontFamily.bold, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,255,255,0.92)' },
  collageReflectionTitle: { fontFamily: fontFamily.serif, fontSize: 18, lineHeight: 22, color: '#fff', marginTop: 4 },
  collageChat: { position: 'absolute', left: 50, top: 226, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  collageAvatar: { width: 36, height: 36, borderRadius: 18 },
  collageChatName: { fontFamily: fontFamily.bold, fontSize: 12, color: '#232529' },
  collageChatText: { fontFamily: fontFamily.regular, fontSize: 12, color: '#474A52' },
  });
};
