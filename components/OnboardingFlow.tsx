import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { Check, ArrowRight, BookOpen, PenLine, MessageCircle } from 'lucide-react-native';

import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import BackButton from '@/components/BackButton';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { formatLocalDate } from '@/lib/dateUtils';
import SoberDateEditor from '@/components/SoberDateEditor';


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

function Sunrise({ size = 32, color = '#fff' }: { size?: number; color?: string }) {
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

// ─── Step 1 · Consent (identity gradient) ───────────────────────────────────
const BULLETS = [
  'This app is not a substitute for therapy, medical advice, or emergency support.',
  'The AI sponsor chat offers encouragement, but it is not human and cannot provide crisis support or clinical help.',
  "If you're in immediate danger or emotional distress, please contact emergency services or a crisis hotline.",
];

function ConsentStep({ onContinue }: { onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [agreed, setAgreed] = useState(false);
  const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {});
  const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.3)} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.consentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.consentMark}>
            <Sunrise size={32} />
          </View>
          <Text style={styles.consentTitle}>Welcome to{'\n'}Sober Dailies</Text>
          <Text style={styles.consentDesc}>Practice the daily exercises that keep you in fit spiritual condition.</Text>

          <View style={styles.consentCard}>
            <Text style={styles.consentNote}>Please note:</Text>
            {BULLETS.map((b, i) => (
              <View key={i} style={[styles.consentBullet, i < 2 && { marginBottom: 12 }]}>
                <Text style={styles.consentBulletDot}>•</Text>
                <Text style={styles.consentBulletText}>{b}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.consentAgree}>
            By continuing, you agree to our <Text style={styles.consentLink} onPress={openTerms}>Terms of Use</Text> and <Text style={styles.consentLink} onPress={openPrivacy}>Privacy Policy</Text>.
          </Text>

          <Pressable style={styles.consentCheckRow} onPress={() => setAgreed((a) => !a)}>
            <View style={[styles.consentCheckbox, agreed && styles.consentCheckboxOn]}>
              {agreed && <Check size={15} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={styles.consentCheckText}>I have read and agree to the Terms of Use and Privacy Policy.</Text>
          </Pressable>

          <Pressable
            style={[styles.consentContinue, !agreed && styles.consentContinueOff]}
            onPress={() => agreed && onContinue()}
            disabled={!agreed}
          >
            <Text style={[styles.consentContinueText, { color: obvInk(0.3) }, !agreed && { color: 'rgba(255,255,255,0.7)' }]}>Continue</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 2 · What's inside (ObvOutline — gradient band + paper rows) ───────
const FEATURES: { Icon: React.ComponentType<{ size?: number; color?: string }>; iconColor: string; tone: string; title: string; sub: string }[] = [
  { Icon: Sunrise, iconColor: '#2E6F6F', tone: 'teal', title: 'Today', sub: 'The heart of your program — where you define your dailies and track your progress one day at a time.' },
  { Icon: BookOpen, iconColor: '#B07A33', tone: 'amber', title: 'Tools', sub: 'The tools you reach for each day — literature, speakers, prayers, meetings — linked right to your dailies as you work through them.' },
  { Icon: PenLine, iconColor: '#3A6AE0', tone: 'blue', title: 'Journey', sub: 'The record of your program — your notebook entries and daily progress, to look back on and keep yourself accountable.' },
  { Icon: MessageCircle, iconColor: '#7A5FB5', tone: 'lavender', title: 'Your AI Sponsor, anytime', sub: 'Bring real questions, get real advice and support from distinct sponsor personalities, day or night.' },
];

function WhatsInsideStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, isDark, mode } = useTokens();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <LinearGradient colors={obvGrad(0.4)} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.insideBand} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={onBack} dark />
        </View>
        <View style={styles.insideHeader}>
          <Text style={styles.insideOverline}>EVERYTHING YOU NEED</Text>
          <Text style={styles.insideHeadline}>Your whole program, all in one place</Text>
        </View>
        <View style={styles.insideSheet}>
          <ScrollView contentContainerStyle={styles.insideSheetScroll} showsVerticalScrollIndicator={false}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.outlineRow}>
                <View style={styles.outlineIconBox}>
                  <f.Icon size={23} color={isDark ? resolveTone(f.tone, mode).ink : f.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.outlineTitle}>{f.title}</Text>
                  <Text style={styles.outlineSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.primaryBtn} onPress={onContinue}>
              <Text style={styles.primaryText}>Set up my app</Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
          </View>
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

function DefineDailiesStep({ onBack, onStart }: { onBack: () => void; onStart: (items: DailyItem[]) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark, mode } = useTokens();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(STARTER.flatMap((s) => s.items.filter((i) => i.on).map((i) => i.id))),
  );
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const total = 1 + selected.size; // + the permanent Daily Reflection hero

  const start = () => {
    const items: DailyItem[] = STARTER.flatMap((s) =>
      s.items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id, label: i.label, icon: i.icon, color: i.color, when: s.when, action: i.action })),
    );
    onStart(items);
  };

  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <BackButton onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={styles.dailiesScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.insideTitle}>Define your dailies</Text>
        <Text style={styles.dailiesSubtitle}>The practices you&apos;ll start with</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            We&apos;ve checked the <Text style={styles.infoBold}>basics</Text> to get you started. Tap any practice to add or remove it — you can change everything later in <Text style={styles.infoBold}>My Dailies</Text>.
          </Text>
        </View>

        {STARTER.map((section) => {
          const sel = section.items.filter((i) => selected.has(i.id)).length;
          return (
            <View key={section.when} style={styles.dailiesSection}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabelName}>{section.when}</Text>
                <Text style={styles.sectionLabelCount}>{sel} of {section.items.length}</Text>
              </View>
              {section.items.map((item) => {
                const on = selected.has(item.id);
                const def = DEF_TONE[item.color] ?? DEF_TONE.gray;
                // Dark: brightened mode-aware family tones; light: the prototype's static inks.
                const dark = isDark ? resolveTone(item.color, mode) : null;
                const ink = dark ? dark.ink : def.ink;
                const boxBg = dark ? dark.soft : def.solid + '22';
                const onBorder = dark ? dark.ink + '55' : def.solid + '55';
                const Glyph = resolveGlyph(item.icon);
                return (
                  <Pressable key={item.id} style={[styles.dailyRow, { borderColor: on ? onBorder : c.border }]} onPress={() => toggle(item.id)}>
                    <View style={[styles.dailyIconBox, { backgroundColor: boxBg }]}>
                      <Glyph size={18} color={ink} />
                    </View>
                    <Text style={styles.dailyLabel}>{item.label}</Text>
                    <View style={[styles.dailyCheck, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: c.border }]}>
                      {on && <Check size={15} color="#fff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footerBordered}>
        <Pressable style={styles.primaryBtn} onPress={start}>
          <Text style={styles.primaryText}>Start my program · {total} {total === 1 ? 'daily' : 'dailies'}</Text>
          <ArrowRight size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── The flow ───────────────────────────────────────────────────────────────
type Step = 'consent' | 'inside' | 'date' | 'dailies';

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>('consent');
  const { completeOnboarding } = useOnboarding();
  const { setSobrietyDate } = useSobriety();
  const dailies = useDailies();

  if (step === 'consent') return <ConsentStep onContinue={() => setStep('inside')} />;
  if (step === 'inside') return <WhatsInsideStep onBack={() => setStep('consent')} onContinue={() => setStep('date')} />;
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
      onStart={(items) => { dailies.setAll(items); completeOnboarding(); }}
    />
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
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

  // paper screens (inside + dailies)
  paper: { flex: 1, backgroundColor: c.background },
  topBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  insideTitle: { fontFamily: fontFamily.displayBold, fontSize: fontSize.hero, color: c.text, letterSpacing: -0.5 },
  insideSub: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 8 },

  // What's inside — gradient band + paper sheet + outline rows
  insideBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  insideHeader: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 18 },
  insideOverline: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.9)' },
  insideHeadline: { fontFamily: fontFamily.display, fontSize: 27, color: '#fff', letterSpacing: -0.5, lineHeight: 31, marginTop: 9 },
  insideSheet: { flex: 1, backgroundColor: c.background, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  insideSheetScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  outlineRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 18 },
  outlineIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: isDark ? c.surface : c.background, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', ...darkCard },
  outlineTitle: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, letterSpacing: -0.2 },
  outlineSub: { fontFamily: fontFamily.serif, fontSize: 14.5, color: c.textSecondary, lineHeight: 22, marginTop: 3 },

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
  });
};
