import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { Check, ChevronLeft, ArrowRight, BookOpen, PenLine, MessageCircle } from 'lucide-react-native';

import { colors, fontFamily, fontSize, spacing, radii, shadows, gradients, getSemanticColors } from '@/constants/designTokens';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { useOnboarding } from '@/hooks/useOnboardingStore';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { formatLocalDate } from '@/lib/dateUtils';
import SoberDateEditor from '@/components/SoberDateEditor';

const c = getSemanticColors('light');

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
  const [agreed, setAgreed] = useState(false);
  const openTerms = () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => {});
  const openPrivacy = () => Linking.openURL('https://soberdailies.com/privacy').catch(() => {});

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.consentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.consentMark}>
            <Sunrise size={32} />
          </View>
          <Text style={styles.consentTitle}>Welcome to{'\n'}Sober Dailies</Text>
          <Text style={styles.consentDesc}>Daily recovery practices — reflections, gratitude, prayers, and a sponsor-style AI chat — in one quiet place.</Text>

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
            <Text style={[styles.consentContinueText, !agreed && { color: 'rgba(255,255,255,0.7)' }]}>Continue</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 2 · What's inside (paper feature rows) ────────────────────────────
const FEATURES: { tone: string; Icon: React.ComponentType<{ size?: number; color?: string }>; title: string; sub: string }[] = [
  { tone: 'teal', Icon: Sunrise, title: 'Today', sub: 'Your daily program — a simple checklist across Morning, Anytime, and Evening.' },
  { tone: 'amber', Icon: BookOpen, title: 'Tools', sub: 'Daily reflection, prayers, literature, speaker tapes, and the writing tools.' },
  { tone: 'blue', Icon: PenLine, title: 'Journey', sub: 'Look back on your days and see your progress over time.' },
  { tone: 'lavender', Icon: MessageCircle, title: 'AI Sponsor', sub: 'A sponsor-style companion for encouragement, anytime. Not a person.' },
];

function WhatsInsideStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable hitSlop={8} onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.insideScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.insideTitle}>What&apos;s inside</Text>
        <Text style={styles.insideSub}>Four places to build and keep your daily program.</Text>
        {FEATURES.map((f) => {
          const tone = resolveTone(f.tone);
          return (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureMedallion, { backgroundColor: tone.ink, shadowColor: tone.ink }]}>
                <f.Icon size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={onContinue}>
          <Text style={styles.primaryText}>Continue</Text>
          <ArrowRight size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
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
    { id: 'call', label: 'Call another alcoholic', icon: 'phone', color: 'blue', action: 'callAnother', on: false },
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

function DefineDailiesStep({ onBack, onStart }: { onBack: () => void; onStart: (items: DailyItem[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(STARTER.flatMap((s) => s.items.filter((i) => i.on).map((i) => i.id))),
  );
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const count = selected.size;

  const start = () => {
    const items: DailyItem[] = STARTER.flatMap((s) =>
      s.items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id, label: i.label, icon: i.icon, color: i.color, when: s.when, action: i.action })),
    );
    onStart(items);
  };

  return (
    <SafeAreaView style={styles.paper} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable hitSlop={8} onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.dailiesScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.insideTitle}>Define your dailies</Text>
        <Text style={styles.insideSub}>We&apos;ve checked the basics. Tap any practice to add or remove it — you can change everything later in My Dailies.</Text>

        {STARTER.map((section) => (
          <View key={section.when} style={styles.dailiesSection}>
            <Text style={styles.dailiesSectionLabel}>{section.when}</Text>
            {section.items.map((item) => {
              const on = selected.has(item.id);
              const tone = resolveTone(item.color);
              const Glyph = resolveGlyph(item.icon);
              return (
                <Pressable key={item.id} style={[styles.dailyRow, on && { borderColor: tone.ink + '55', backgroundColor: tone.soft }]} onPress={() => toggle(item.id)}>
                  <View style={[styles.dailyMedallion, { backgroundColor: tone.ink }]}>
                    <Glyph size={19} color="#fff" />
                  </View>
                  <Text style={styles.dailyLabel}>{item.label}</Text>
                  <View style={[styles.dailyCheck, { borderColor: on ? tone.ink : c.border, backgroundColor: on ? tone.ink : 'transparent' }]}>
                    {on && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={[styles.primaryBtn, count === 0 && styles.primaryBtnOff]} onPress={start} disabled={count === 0}>
          <Text style={styles.primaryText}>Start my program · {count} {count === 1 ? 'daily' : 'dailies'}</Text>
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

const styles = StyleSheet.create({
  // consent
  consentScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  consentMark: { width: 60, height: 60, borderRadius: 18, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  consentTitle: { fontFamily: fontFamily.displayBold, fontSize: 32, color: '#fff', textAlign: 'center', letterSpacing: -0.6, lineHeight: 35 },
  consentDesc: { fontFamily: fontFamily.serif, fontSize: fontSize.lg, color: '#fff', opacity: 0.94, textAlign: 'center', lineHeight: 24, marginTop: 14 },
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
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  insideScroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24 },
  insideTitle: { fontFamily: fontFamily.displayBold, fontSize: fontSize.hero, color: c.text, letterSpacing: -0.5 },
  insideSub: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: c.textSecondary, lineHeight: 21, marginTop: 8, marginBottom: 8 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, marginTop: 12, ...shadows.sm },
  featureMedallion: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  featureTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: c.text },
  featureSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.textMuted, lineHeight: 18, marginTop: 2 },

  // define dailies
  dailiesScroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24 },
  dailiesSection: { marginTop: 18 },
  dailiesSectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: c.text, marginBottom: spacing.sm },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 8 },
  dailyMedallion: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dailyLabel: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.text },
  dailyCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  // shared footer
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary, ...shadows.md },
  primaryBtnOff: { backgroundColor: '#C7C9C4', shadowOpacity: 0 },
  primaryText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, color: '#fff' },
});
