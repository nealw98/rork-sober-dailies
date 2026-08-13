import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';
import WhatsInsideCarousel from '@/components/onboarding/WhatsInsideCarousel';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { recordDisclaimerAcceptance } from '@/lib/disclaimerConsent';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useSubscription } from '@/hooks/useSubscription';
import { formatLocalDate } from '@/lib/dateUtils';
import SoberDateEditor from '@/components/SoberDateEditor';
import DailiesEditor from '@/components/today/DailiesEditor';
import PaywallScreen from '@/components/PaywallScreen';

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
function obvGrad(t: number): [string, string, string] {
  return [lerpHex(OBV_HOT[0], OBV_COOL[0], t), lerpHex(OBV_HOT[1], OBV_COOL[1], t), lerpHex(OBV_HOT[2], OBV_COOL[2], t)];
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
// `upgrader` = v2 user whose device data carried through the store update; the
// copy welcomes them back instead of pitching the app they already use.
function WelcomeStep({ upgrader, onContinue }: { upgrader: boolean; onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.18)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.welcomeSafe} edges={['top', 'bottom']}>
        <View style={styles.welcomeCenter}>
          <Image source={require('@/assets/images/icon.png')} style={styles.welcomeLogo} contentFit="cover" />
          {/* Two lines, always. The new-user promise is the longer string, so it
              sets the type size; adjustsFontSizeToFit is the backstop for narrow
              screens and large Dynamic Type. */}
          <Text
            style={[styles.welcomePromise, upgrader ? null : styles.welcomePromiseLong]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {upgrader ? 'Welcome to the new Sober Dailies' : 'The daily habits that build long-term sobriety'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {upgrader ? 'Everything you saved is still here. New in this version: speaker tapes, meditation, and a whole new Today.' : 'One day. Every day.'}
          </Text>
        </View>
        <View style={styles.welcomeFooter}>
          <Pressable style={styles.welcomeBtn} onPress={onContinue}>
            <Text style={styles.welcomeBtnText}>{upgrader ? "See what's new" : 'Get started'}</Text>
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

// ─── Door 1 · Welcome back (members and returning subscribers) ──────────────
// Anyone who already has access — grandfathered members, and subscribers whose
// purchase reattached after a reinstall — sees this instead of the whole
// introduction. No pitch, no price, no re-asking for a sobriety date the app
// already has. Their Today is already correct: DEFAULT_PROGRAM is the same set
// "Define your dailies" pre-checks, so skipping setup lands on identical
// defaults (use-dailies-store).
function WelcomeBackStep({ onContinue }: { onContinue: () => void | Promise<void> }) {
  const styles = useThemedStyles(makeStyles);
  const [going, setGoing] = useState(false);
  const go = async () => {
    if (going) return;
    setGoing(true);
    await onContinue();
  };
  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.18)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.welcomeSafe} edges={['top', 'bottom']}>
        <View style={styles.welcomeCenter}>
          <Image source={require('@/assets/images/icon.png')} style={styles.welcomeLogo} contentFit="cover" />
          <Text style={styles.welcomePromise} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            Welcome back
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Your access carries over — nothing to set up, nothing to buy. Everything you saved is still here.
          </Text>
        </View>
        <View style={styles.welcomeFooter}>
          <Pressable style={styles.welcomeBtn} onPress={go} disabled={going}>
            {going ? (
              <ActivityIndicator color={obvInk(0.55)} />
            ) : (
              <>
                <Text style={styles.welcomeBtnText}>Open Sober Dailies</Text>
                <ArrowRight size={18} color={obvInk(0.55)} />
              </>
            )}
          </Pressable>
        </View>
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
      <LinearGradient colors={obvGrad(0.5)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
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

  // Seed the store with the default-on starter set once, on entry. From here the
  // user shapes it with the SAME editor as the Today screen (drag / remove / add),
  // so onboarding and Today are one interface.
  useEffect(() => {
    const defaults: DailyItem[] = STARTER.flatMap((s) =>
      s.items.filter((i) => i.on).map((i) => ({ id: i.id, label: i.label, icon: i.icon, color: i.color, when: s.when, action: i.action })),
    );
    dailies.setAll(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);
    await onComplete();
  };

  const header = (
    <>
      <Text style={styles.overline}>SET UP YOUR APP</Text>
      <Text style={styles.insideTitle}>Define your dailies</Text>
      <Text style={styles.dailiesSubtitle}>The practices you&apos;ll start with</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          These are the practices that will appear on your Today page every day. Add the ones you want, remove what doesn&apos;t fit, and reorder them into a rhythm you&apos;ll actually follow. Each one opens a tool or a reading, and you check it off when it&apos;s done. You can change all of this later from Today.
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        {onBack && <BackButton onPress={onBack} />}
      </View>
      <DailiesEditor header={header} contentContainerStyle={styles.dailiesScroll} />
      <View style={styles.footerBordered}>
        <Pressable style={styles.primaryBtn} onPress={handleComplete} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryText}>Go to Today</Text>
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
}: {
  onDisclaimerAccepted?: () => void;
  // __DEV__ only: the simulator bypass has to release the backstop gate in
  // app/_layout too. Without it, finishing setup without a real entitlement
  // drops straight onto a second paywall.
  onPaywallBypassed?: () => void;
}) {
  const { completeOnboarding, isUpgrader } = useOnboarding();
  const { setSobrietyDate, sobrietyDate } = useSobriety();
  // Members and returning subscribers already have access. They get a
  // welcome-back screen and go straight in — no pitch, no price, and no
  // re-asking for details the app already has.
  //
  // Decided ONCE, on entry, and deliberately frozen: a new user who subscribes
  // at the paywall step flips isPremium true mid-flow, and re-reading it live
  // would bounce them into "Welcome back" instead of on to their setup.
  // app/_layout holds the render until subscription state resolves, so this is
  // already settled at mount.
  const { isPremium } = useSubscription();
  const [alreadyHadAccess] = useState(isPremium);
  const [step, setStep] = useState<Step>('welcome');

  // Upgraders carried their sobriety date over from v2 — don't ask again.
  // (An upgrader who never set one still gets the date step.)
  const skipDateStep = isUpgrader && !!sobrietyDate;
  const afterPurchase: Step = skipDateStep ? 'dailies' : 'date';

  const finish = async () => {
    await completeOnboarding();
    // No router.replace here: onboarding is a render gate in app/_layout, not a
    // route. When the flag flips, the gate swaps this flow out for the Stack
    // (which mounts at '/' anyway); navigating while no navigator is mounted
    // forces a root re-mount that flashes the teal fill.
  };

  // ── Door 1 · already have access ──
  if (alreadyHadAccess) {
    return <WelcomeBackStep onContinue={finish} />;
  }

  // ── Door 2 · new ──
  if (step === 'welcome') return <WelcomeStep upgrader={isUpgrader} onContinue={() => setStep('inside')} />;
  if (step === 'inside') {
    return (
      <WhatsInsideCarousel
        overline={isUpgrader ? 'WHAT’S NEW' : undefined}
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
          setStep('paywall');
        }}
      />
    );
  }
  if (step === 'paywall') {
    // No onDismiss: the wall is hard here exactly as it is at the root gate.
    // Advancing is driven by isPremium flipping — which covers a purchase, a
    // restore, and a redeemed gift code alike.
    return (
      <PaywallStep
        onSubscribed={() => setStep(afterPurchase)}
        onBypass={() => {
          onPaywallBypassed?.();
          setStep(afterPurchase);
        }}
      />
    );
  }
  if (step === 'date') {
    return (
      <SoberDateEditor
        current={null}
        overline="SET UP YOUR APP"
        onSave={(date) => { setSobrietyDate(formatLocalDate(date)); setStep('dailies'); }}
        onSkip={() => setStep('dailies')}
        primaryLabel="Set my date"
        skipLabel="Skip for now"
      />
    );
  }
  return (
    <DefineDailiesStep
      onBack={skipDateStep ? undefined : () => setStep('date')}
      onComplete={finish}
    />
  );
}

// Paywall as a step. PaywallScreen applies the purchased CustomerInfo itself,
// so the subscription flips on in the provider; watch for that rather than
// hooking the buy button, so a restore or a gift code advances too.
//
// In __DEV__ the close (X) is wired to walk straight on to the setup steps, so
// the rest of the flow is reachable on a simulator without a sandbox purchase.
// It is undefined in any release build, where the wall stays hard — same rule
// as the backstop gate in app/_layout.
function PaywallStep({ onSubscribed, onBypass }: { onSubscribed: () => void; onBypass: () => void }) {
  const { isPremium } = useSubscription();
  useEffect(() => {
    if (isPremium) onSubscribed();
  }, [isPremium, onSubscribed]);
  return <PaywallScreen onDismiss={__DEV__ ? onBypass : undefined} />;
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
  consentContinueText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: colors.primaryDark },

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
  insideTitle: { fontFamily: fontFamily.displayBold, fontSize: fontSize.hero, color: c.text, letterSpacing: -0.5 },
  insideSub: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 8 },

  // define dailies
  dailiesScroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 16 },
  dailiesSubtitle: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 4 },
  infoCard: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '33', borderRadius: 14, padding: 13, marginTop: 14, marginBottom: 4 },
  infoText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, lineHeight: 19 },
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
  overline: { fontFamily: fontFamily.semiBold, fontSize: 12, letterSpacing: 1.2, color: c.textMuted, marginBottom: 10 },

  // shared footer
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
  primaryBtnOff: { backgroundColor: '#C7C9C4', shadowOpacity: 0 },
  primaryText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff' },
  agreeLine: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 16, color: c.textMuted, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  agreeLink: { fontFamily: fontFamily.semiBold, color: colors.primaryDark },
  });
};
