import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Updates from 'expo-updates';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';
import WhatsInsideCarousel from '@/components/onboarding/WhatsInsideCarousel';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { recordDisclaimerAcceptance } from '@/lib/disclaimerConsent';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useDailies, type WhenBucket } from '@/hooks/use-dailies-store';
import { useSubscription } from '@/hooks/useSubscription';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';
import SoberDateEditor from '@/components/SoberDateEditor';
import DailiesEditor from '@/components/today/DailiesEditor';
import PaywallScreen from '@/components/PaywallScreen';
import PassOfferScreen from '@/components/PassOfferScreen';

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
function obvInk(t: number): string {
  return lerpHex('#0086C2', '#2F6E6E', t);
}

// Legal links — Apple's standard EULA + our Privacy Policy. The welcome CTA
// carries implied agreement; explicit agreement (checkbox) happens on the
// disclaimer step, which now runs BEFORE the paywall so nobody is charged
// before agreeing (moved back into this flow 2026-08-13).
const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {});
const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

// ─── Step 1 · Welcome (logo + promise) ──────────────────────────────────────
// One welcome for everyone. There is deliberately no "welcome back" variant:
// to a v2 upgrader this IS a new app, so they are introduced to it the same
// way a stranger is. Access only ever changes whether the paywall step runs.
function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.18, isDark)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.welcomeSafe} edges={['top', 'bottom']}>
        <View style={styles.welcomeCenter}>
          <Image source={require('@/assets/images/icon.png')} style={styles.welcomeLogo} contentFit="cover" />
          {/* Two lines, always; adjustsFontSizeToFit is the backstop for narrow
              screens and large Dynamic Type. */}
          <Text
            style={[styles.welcomePromise, styles.welcomePromiseLong]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            The daily habits that build long-term sobriety
          </Text>
          <Text style={styles.welcomeSubtitle}>One day. Every day.</Text>
        </View>
        <View style={styles.welcomeFooter}>
          <Pressable style={styles.welcomeBtn} onPress={onContinue}>
            <Text style={styles.welcomeBtnText}>Get started</Text>
            <ArrowRight size={18} color={obvInk(0.55)} />
          </Pressable>
          <Text style={styles.welcomeAgreeLine}>
            By continuing, you agree to our <Text style={styles.welcomeAgreeLink} onPress={openTerms}>Terms of Use</Text> and <Text style={styles.welcomeAgreeLink} onPress={openPrivacy}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Setup progress header (steps 1 and 2 of first-run setup) ──────────────
// Shared by the sobriety-date and dailies screens so the two read as one task.
// Setup is always both steps — an upgrader sees the date screen prefilled
// rather than skipping it.
function SetupHeader({ step, onBack }: { step: 1 | 2; onBack?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  return (
    <View style={styles.setupHead}>
      <View style={styles.setupTopRow}>
        {onBack && <BackButton onPress={onBack} />}
        <Text style={styles.setupOverline}>{`SETTING UP · ${step} OF 2`}</Text>
      </View>

      <>
          <View style={styles.setupRailRow}>
            <View style={[styles.setupRail, { backgroundColor: step > 1 ? colors.primaryLight : colors.primaryDark }]} />
            <View style={[styles.setupRail, { backgroundColor: step > 1 ? colors.primaryDark : c.border }]} />
          </View>
          <View style={styles.setupRailRow}>
            <View style={styles.setupLabelCell}>
              {step > 1 && <Check size={14} color={colors.primary} strokeWidth={3} />}
              <Text style={[styles.setupLabel, step === 1 ? styles.setupLabelOn : styles.setupLabelDone]}>Sobriety date</Text>
            </View>
            <View style={styles.setupLabelCell}>
              <Text style={[styles.setupLabel, step === 2 ? styles.setupLabelOn : styles.setupLabelOff]}>Your dailies</Text>
            </View>
          </View>
      </>
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
      <LinearGradient colors={obvGrad(0.5, isDark)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
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
      </SafeAreaView>
    </View>
  );
}

// ─── Step 4 · Define your dailies (starter catalog → setAll) ────────────────
type StarterItem = { id: string; label: string; icon: string; color: string; action: string; on: boolean };
const STARTER: { when: WhenBucket; items: StarterItem[] }[] = [
  { when: 'Morning', items: [
    { id: 'prayerM', label: 'Say my morning prayers', icon: 'pray', color: 'amber', action: 'prayerMorning', on: true },
    { id: 'grat', label: 'Write a gratitude list', icon: 'heart', color: 'amber', action: 'gratitude', on: true },
    { id: 'bed', label: 'Make my bed', icon: 'home', color: 'gray', action: 'makeBed', on: false },
    { id: 'exAM', label: 'Get some exercise', icon: 'dumbbell', color: 'coral', action: 'exercise', on: false },
  ] },
  { when: 'Anytime', items: [
    { id: 'meeting', label: 'Attend a meeting', icon: 'users', color: 'lavender', action: 'meeting', on: true },
    { id: 'lit', label: 'Read the literature', icon: 'library', color: 'teal', action: 'lit', on: true },
    { id: 'med', label: 'Take time to meditate', icon: 'lotus', color: 'lavender', action: 'meditation', on: false },
    { id: 'call', label: 'Talk with another alcoholic', icon: 'phone', color: 'blue', action: 'callAnother', on: false },
    { id: 'speaker', label: 'Listen to a speaker', icon: 'mic', color: 'lavender', action: 'speaker', on: false },
    { id: 'journal', label: 'Write in my journal', icon: 'journal', color: 'blue', action: 'journal', on: false },
    { id: 'spotcheck', label: 'Take a spot check inventory', icon: 'check', color: 'coral', action: 'spotcheck', on: false },
    { id: 'service', label: 'Be of service', icon: 'heartHandshake', color: 'teal', action: 'service', on: false },
  ] },
  { when: 'Evening', items: [
    { id: 'nightly', label: 'Do my nightly review', icon: 'moon', color: 'lavender', action: 'nightly', on: true },
    { id: 'prayerE', label: 'Say my evening prayers', icon: 'pray', color: 'amber', action: 'prayerEvening', on: true },
  ] },
];

// Soft icon-box + dark outline glyph per tone (prototype OBV_TONE).
const DEF_TONE: Record<string, { solid: string; ink: string }> = {
  amber: { solid: '#E8A95D', ink: '#B07A33' },
  blue: { solid: '#5C8DFF', ink: '#3A6AE0' },
  lavender: { solid: '#A386D5', ink: '#7A5FB5' },
  teal: { solid: '#3D8B8B', ink: '#2E6F6F' },
  coral: { solid: '#D36A5A', ink: '#C0533F' },
  gray: { solid: '#9A98A4', ink: '#5A5A68' },
};

function DefineDailiesStep({ onBack, onComplete }: { onBack?: () => void; onComplete: () => void | Promise<void> }) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTokens();
  const dailies = useDailies();
  // Completing writes AsyncStorage and swaps in the paywall/app, which takes a
  // beat — show a spinner so the tap doesn't feel dead. No reset: we unmount.
  const [saving, setSaving] = useState(false);

  // No seeding here. use-dailies-store already starts at DEFAULT_PROGRAM — the
  // same six practices the starter set marks on — so a new user sees exactly
  // this list without being written to. Seeding unconditionally used to
  // overwrite whatever was already in the store, which now matters: members
  // reach this screen too, and `dailies_program` is a SYNC_KEY, so a
  // cloud-restored program would have been replaced by the defaults.

  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);
    await onComplete();
  };

  const header = (
    <>
      <Text style={styles.insideTitle}>What are your daily practices?</Text>
      <Text style={styles.dailiesBody}>
        These appear on your Today page every day. Add, remove and reorder them any time.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SetupHeader step={2} onBack={onBack} />
      <DailiesEditor header={header} contentContainerStyle={styles.dailiesScroll} />
      <View style={styles.footerBordered}>
        <Pressable style={styles.primaryBtn} onPress={handleComplete} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryText}>Start my program</Text>
              <ArrowRight size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── The flow ───────────────────────────────────────────────────────────────
// Understand it → agree to it → subscribe → set it up. Each step is a
// precondition of the next, which is why the disclaimer and the paywall moved
// inside this flow: nobody is charged before agreeing to what the app is, and
// nobody configures an app they have not bought. The setup steps read as
// setting up the subscription you just started, not as a toll before it.
type Step = 'welcome' | 'inside' | 'disclaimer' | 'paywall' | 'date' | 'dailies';

export default function OnboardingFlow({
  onDisclaimerAccepted,
  onPaywallBypassed,
  passToken,
  onPassHandled,
}: {
  onDisclaimerAccepted?: () => void;
  // __DEV__ only: the simulator bypass has to release the backstop gate in
  // app/_layout too. Without it, finishing setup without a real entitlement
  // drops straight onto a second paywall.
  onPaywallBypassed?: () => void;
  passToken?: string | null;
  onPassHandled?: () => void | Promise<void>;
}) {
  const { completeOnboarding } = useOnboarding();
  const { setSobrietyDate, sobrietyDate } = useSobriety();
  // Everyone runs the same introduction — grandfathered members included. To
  // them this IS a new app, so they get the welcome, the tour, the disclaimer
  // and both setup steps. The ONLY thing their access buys them is skipping
  // the paywall.
  //
  // Frozen at mount, deliberately: a new user who subscribes at the paywall
  // step flips isPremium true mid-flow, and re-reading it live would change
  // the route under them. app/_layout holds the render until subscription
  // state resolves, so this is already settled here.
  const { isPremium } = useSubscription();
  const [alreadyHadAccess] = useState(isPremium);
  const [step, setStep] = useState<Step>('welcome');

  // Setup is always two steps. Upgraders used to skip the date screen because
  // they already had one; now it is shown with their date filled in, so they
  // can confirm or correct it rather than have it silently assumed.
  const afterDisclaimer: Step = alreadyHadAccess ? 'date' : 'paywall';

  const finish = async () => {
    await completeOnboarding();
    // No router.replace here: onboarding is a render gate in app/_layout, not a
    // route. When the flag flips, the gate swaps this flow out for the Stack
    // (which mounts at '/' anyway); navigating while no navigator is mounted
    // forces a root re-mount that flashes the teal fill.
  };

  if (step === 'welcome') return <WelcomeStep onContinue={() => setStep('inside')} />;
  if (step === 'inside') {
    return (
      <WhatsInsideCarousel
        onSkip={() => setStep('disclaimer')}
        onContinue={() => setStep('disclaimer')}
      />
    );
  }
  if (step === 'disclaimer') {
    // Before the paywall: agreeing to what this app is and isn't shouldn't come
    // after we've taken the money. DisclaimerStep records acceptance itself.
    return (
      <DisclaimerStep
        onAgree={() => {
          onDisclaimerAccepted?.();
          setStep(afterDisclaimer);
        }}
      />
    );
  }
  if (step === 'paywall') {
    // The close (X) returns to the start of the introduction rather than
    // trapping the user here — the visible way out Play's Subscriptions policy
    // asks for. Advancing is driven by isPremium flipping after a purchase or
    // restore, including a store-native Pass It On subscription redemption.
    return (
      <PaywallStep
        onSubscribed={() => setStep('date')}
        onClose={() => setStep('welcome')}
        passToken={passToken}
        onPassHandled={onPassHandled}
        onBypass={() => {
          onPaywallBypassed?.();
          setStep('date');
        }}
      />
    );
  }
  if (step === 'date') {
    return (
      <SoberDateEditor
        // Prefilled for anyone who already has a date — a v2 upgrader confirms
        // theirs rather than retyping it.
        current={sobrietyDate ? parseLocalDate(sobrietyDate) : null}
        // No back on step 1: for a new user the paywall is behind it and they
        // have just paid; for a member there is only the disclaimer.
        header={<SetupHeader step={1} />}
        body="No pressure — add it now or later, and change it whenever you need."
        onSave={(date) => { setSobrietyDate(formatLocalDate(date)); setStep('dailies'); }}
        onSkip={() => setStep('dailies')}
        primaryLabel="Set my date"
        skipLabel="Skip for now"
      />
    );
  }
  return <DefineDailiesStep onBack={() => setStep('date')} onComplete={finish} />;
}

// Paywall as a step. PaywallScreen applies the purchased CustomerInfo itself,
// so the subscription flips on in the provider; watch for that rather than
// hooking the buy button, so a restore or a gift code advances too.
//
// Tapping the X backs out to the start of onboarding, in every build. In
// __DEV__ only, LONG-PRESSING it jumps forward to the setup screens instead, so
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
  // them. Let the visible close control continue into setup on the preview
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
      // intro and back to the same dead screen — so carry on to setup instead.
      onUnavailableDismiss={onBypass}
      onDevBypass={onBypass}
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
  welcomeRoot: { flex: 1 },
  welcomeSafe: { flex: 1, paddingHorizontal: 28 },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 42 },
  welcomeLogo: {
    width: 126,
    height: 126,
    borderRadius: 29,
    marginBottom: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    // Soft, ambient shadow — spreads fairly evenly around the icon with a gentle
    // downward weight (large blur, small offset), so it floats without a heavy
    // bottom-drop.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 22,
  },
  welcomePromise: {
    fontFamily: fontFamily.displayBold,
    fontSize: 35,
    lineHeight: 39,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  // "The daily habits that build long-term sobriety" needs ~5 more characters
  // per line than the upgrader greeting to hold at two lines.
  welcomePromiseLong: { fontSize: 30, lineHeight: 34 },
  welcomeSubtitle: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 18,
    lineHeight: 24,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.95,
  },
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

  // paper screens (inside + dailies)
  paper: { flex: 1, backgroundColor: c.background },
  topBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  setupHead: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 18 },
  setupTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 38 },
  setupOverline: { fontFamily: fontFamily.bold, fontSize: 12, letterSpacing: 1.6, color: c.textMuted },
  setupRailRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  setupRail: { flex: 1, height: 3, borderRadius: 2 },
  setupLabelCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -6 },
  setupLabel: { fontFamily: fontFamily.semiBold, fontSize: 13.5 },
  setupLabelOn: { color: c.text },
  setupLabelOff: { color: c.textMuted },
  setupLabelDone: { color: colors.primary },
  dailiesBody: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 22, marginTop: 10, marginBottom: 4 },
  insideTitle: { fontFamily: fontFamily.displayBold, fontSize: fontSize.hero, color: c.text, letterSpacing: -0.5 },
  insideSub: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 8 },

  // define dailies
  dailiesScroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 16 },
  infoBold: { fontFamily: fontFamily.semiBold, color: c.text },
  dailiesSection: { marginTop: 4 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionLabelName: { fontFamily: fontFamily.display, fontSize: 18, color: c.text },
  sectionLabelCount: { fontFamily: fontFamily.medium, fontSize: 11, color: c.textMuted },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6 },
  dailyIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dailyLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.base, color: c.text },
  dailyCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footerBordered: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border },

  // shared footer
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
  primaryBtnOff: { backgroundColor: '#C7C9C4', shadowOpacity: 0 },
  primaryText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff' },
  agreeLine: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 16, color: c.textMuted, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  agreeLink: { fontFamily: fontFamily.semiBold, color: colors.primaryDark },
  });
};
