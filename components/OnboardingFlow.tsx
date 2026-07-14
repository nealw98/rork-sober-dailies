import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';
import WhatsInsideCarousel from '@/components/onboarding/WhatsInsideCarousel';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { formatLocalDate } from '@/lib/dateUtils';
import SoberDateEditor from '@/components/SoberDateEditor';
import DailiesEditor from '@/components/today/DailiesEditor';

const TODAY_EDIT_TIP_PENDING_KEY = 'today_edit_tip_pending';

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

// Legal links — Apple's standard EULA + our Privacy Policy. The consent page was
// removed; implied agreement now rides the first onboarding CTA.
const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {});
const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

// ─── Step 1 · Welcome (logo + promise) ──────────────────────────────────────
function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.welcomeRoot}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.18)} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.welcomeSafe} edges={['top', 'bottom']}>
        <View style={styles.welcomeCenter}>
          <Image source={require('@/assets/images/icon.png')} style={styles.welcomeLogo} contentFit="cover" />
          <Text style={styles.welcomePromise}>The habits that build long-term sobriety</Text>
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

// ─── Step 4 · Define your dailies (starter catalog → setAll) ────────────────
type StarterItem = { id: string; label: string; icon: string; color: string; action: string; on: boolean };
const STARTER: { when: WhenBucket; items: StarterItem[] }[] = [
  { when: 'Morning', items: [
    { id: 'prayerM', label: 'Morning Prayer', icon: 'pray', color: 'amber', action: 'prayerMorning', on: true },
    { id: 'grat', label: 'Gratitude list', icon: 'heart', color: 'amber', action: 'gratitude', on: true },
    { id: 'bed', label: 'Make my bed', icon: 'home', color: 'gray', action: 'makeBed', on: false },
    { id: 'exAM', label: 'Get some exercise', icon: 'heart', color: 'coral', action: 'exercise', on: false },
  ] },
  { when: 'Anytime', items: [
    { id: 'meeting', label: 'Attend a meeting', icon: 'users', color: 'lavender', action: 'meeting', on: true },
    { id: 'lit', label: 'Read the literature', icon: 'library', color: 'teal', action: 'lit', on: true },
    { id: 'med', label: 'Meditation', icon: 'lotus', color: 'lavender', action: 'meditation', on: false },
    { id: 'call', label: 'Talk with another alcoholic', icon: 'phone', color: 'blue', action: 'callAnother', on: false },
    { id: 'speaker', label: 'Listen to a speaker', icon: 'play', color: 'lavender', action: 'speaker', on: false },
    { id: 'journal', label: 'Write in my journal', icon: 'journal', color: 'blue', action: 'journal', on: false },
    { id: 'spotcheck', label: 'Spot Check Inventory', icon: 'check', color: 'coral', action: 'spotcheck', on: false },
    { id: 'service', label: 'Do some service', icon: 'users', color: 'teal', action: 'service', on: false },
  ] },
  { when: 'Evening', items: [
    { id: 'nightly', label: 'Nightly Review', icon: 'moon', color: 'lavender', action: 'nightly', on: true },
    { id: 'prayerE', label: 'Evening Prayer', icon: 'pray', color: 'amber', action: 'prayerEvening', on: true },
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

function DefineDailiesStep({ onBack, onComplete }: { onBack: () => void; onComplete: () => void | Promise<void> }) {
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
    await AsyncStorage.setItem(TODAY_EDIT_TIP_PENDING_KEY, '1').catch(() => {});
    await onComplete();
  };

  const header = (
    <>
      <Text style={styles.insideTitle}>Define your dailies</Text>
      <Text style={styles.dailiesSubtitle}>The practices you&apos;ll start with</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          These are the practices that will appear on your Today page every day. Add the ones you want, remove what doesn&apos;t fit, and reorder them into a rhythm you&apos;ll actually follow. Once setup is done, each of these dailies on your Today page will open a tool or reading, and you&apos;ll check it off when you complete it.
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <BackButton onPress={onBack} />
      </View>
      <DailiesEditor header={header} contentContainerStyle={styles.dailiesScroll} />
      <View style={styles.footerBordered}>
        <Pressable style={styles.primaryBtn} onPress={handleComplete} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryText}>Start my free week</Text>
              <ArrowRight size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── The flow ───────────────────────────────────────────────────────────────
type Step = 'welcome' | 'inside' | 'date' | 'dailies';

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>('welcome');
  const { completeOnboarding } = useOnboarding();
  const { setSobrietyDate } = useSobriety();

  if (step === 'welcome') return <WelcomeStep onContinue={() => setStep('inside')} />;
  if (step === 'inside') return <WhatsInsideCarousel onSkip={() => setStep('date')} onContinue={() => setStep('date')} />;
  if (step === 'date') {
    return (
      <SoberDateEditor
        current={null}
        onBack={() => setStep('inside')}
        onSave={(date) => { setSobrietyDate(formatLocalDate(date)); setStep('dailies'); }}
        onSkip={() => setStep('dailies')}
        primaryLabel="Set my date"
        skipLabel="Skip for now"
      />
    );
  }
  return (
    <DefineDailiesStep
      onBack={() => setStep('date')}
      onComplete={async () => {
        await completeOnboarding();
        // No router.replace here: onboarding is a render gate in app/_layout, not a
        // route. When the flag flips, the gate swaps this flow out for the paywall/
        // Stack (which mounts at '/' anyway); navigating while no navigator is
        // mounted forces a root re-mount that flashes the teal loading fill.
      }}
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

  // shared footer
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
  primaryBtnOff: { backgroundColor: '#C7C9C4', shadowOpacity: 0 },
  primaryText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff' },
  agreeLine: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 16, color: c.textMuted, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  agreeLink: { fontFamily: fontFamily.semiBold, color: colors.primaryDark },
  });
};
