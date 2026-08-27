// Dailies editing sheets — the Add / Create / Settings bottom sheets used by
// Today's in-place Edit mode (lifted from the retired My Dailies page so the
// editing UX lives where you customise: on Today). Pure presentation + the
// store mutations are wired by the caller.
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
// RN's KeyboardAvoidingView doesn't track the keyboard inside a <Modal> (separate
// native window). Use react-native-keyboard-controller inside a KeyboardProvider
// (no toolbar — these sheets have their own Add/Save button that dismisses).
import { KeyboardProvider, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { X, Plus, Check } from 'lucide-react-native';
import { fontFamily, fontSize, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';

export type Template = Omit<DailyItem, 'id' | 'when'>;

// "From your tools" catalog (canonical add list) — alphabetical by the TOOL
// each action belongs to, not the verb-led label (labels all start with
// verbs, so label-alphabetical was meaningless): Another alcoholic, Evening
// prayers, Gratitude, Journal, Literature, Meditation, Meeting, Morning
// prayers, Nightly Review, Speaker Tapes, Sponsor, Spot Check.
// Colors use the canonical palette families (steel / teal / periwinkle /
// terracotta) so each item matches how the same daily is tinted on the Today
// list (DEFAULT_PROGRAM + toolFamily): people/reading = steel, spiritual
// practice + writing = teal/terracotta, wind-down = periwinkle.
export const TOOL_CATALOG: Template[] = [
  { label: 'Talk with another alcoholic', icon: 'phone', color: 'steel', action: 'callAnother' },
  { label: 'Say my evening prayers', icon: 'pray', color: 'periwinkle', action: 'prayerEvening' },
  { label: 'Write a gratitude list', icon: 'heart', color: 'terracotta', action: 'gratitude' },
  { label: 'Write in my journal', icon: 'journal', color: 'teal', action: 'journal' },
  { label: 'Read the literature', icon: 'library', color: 'steel', action: 'lit' },
  { label: 'Take time to meditate', icon: 'lotus', color: 'periwinkle', action: 'meditation' },
  { label: 'Attend a meeting', icon: 'users', color: 'steel', action: 'meeting' },
  { label: 'Say my morning prayers', icon: 'pray', color: 'terracotta', action: 'prayerMorning' },
  { label: 'Do my nightly review', icon: 'moon', color: 'periwinkle', action: 'nightly' },
  { label: 'Listen to a speaker tape', icon: 'mic', color: 'steel', action: 'speaker' },
  { label: 'Call my sponsor', icon: 'phone', color: 'steel', action: 'callSponsor' },
  { label: 'Take a spot check inventory', icon: 'check', color: 'terracotta', action: 'spotcheck' },
];

// "Quick actions" — no tool, just check off. Alphabetical by label.
export const QUICK_CATALOG: Template[] = [
  { label: 'Do some service', icon: 'heartHandshake', color: 'steel', action: 'service' },
  { label: 'Get some exercise', icon: 'dumbbell', color: 'terracotta', action: 'exercise' },
  { label: 'Make my bed', icon: 'home', color: 'periwinkle', action: 'makeBed' },
];

export function Medallion({ icon, tone, soft }: { icon: string; tone: string; soft?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const t = resolveTone(tone, mode);
  const Glyph = resolveGlyph(icon);
  return (
    <View style={[styles.medallion, soft ? { backgroundColor: t.ink + '22' } : { backgroundColor: t.ink, ...shadows.sm, shadowColor: t.ink }]}>
      <Glyph size={20} color={soft ? t.ink : '#fff'} />
    </View>
  );
}

function SheetBackdrop({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return <Pressable style={styles.backdrop} onPress={onPress} />;
}

export function AddSheet({ section, added, onClose, onAdd, onCreate }: { section: WhenBucket; added: Set<string>; onClose: () => void; onAdd: (t: Template) => void; onCreate: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <SheetBackdrop onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Add to {section}</Text>
              <Text style={styles.sheetSub}>Pick from your tools, a quick action, or make your own.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={16} color={c.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            {/* Create-your-own leads the sheet — at the bottom it was easy to
                miss below two catalogs (decided Jul 18). */}
            <Text style={styles.groupLabel}>CREATE YOUR OWN</Text>
            <Pressable style={styles.createRow} onPress={onCreate}>
              <View style={styles.createIcon}>
                <Plus size={20} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addRowName}>Make a custom action</Text>
                <Text style={styles.sheetSub}>Something only on your list — name it.</Text>
              </View>
            </Pressable>

            <Text style={styles.groupLabel}>FROM YOUR TOOLS</Text>
            {TOOL_CATALOG.map((t) => (
              <Pressable key={t.action} style={[styles.addRow, added.has(t.action) && styles.addRowAdded]} disabled={added.has(t.action)} onPress={() => onAdd(t)}>
                <Medallion icon={t.icon} tone={t.color} soft />
                <View style={styles.addRowText}>
                  <Text style={styles.addRowName}>{t.label}</Text>
                </View>
                {added.has(t.action) ? (
                  <View style={styles.addedCheck}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.addPlus}>
                    <Plus size={13} color={colors.primary} strokeWidth={2.4} />
                  </View>
                )}
              </Pressable>
            ))}

            <Text style={styles.groupLabel}>QUICK ACTIONS · NO TOOL, JUST CHECK OFF</Text>
            {QUICK_CATALOG.map((t) => (
              <Pressable key={t.action} style={[styles.addRow, added.has(t.action) && styles.addRowAdded]} disabled={added.has(t.action)} onPress={() => onAdd(t)}>
                <Medallion icon={t.icon} tone={t.color} soft />
                <View style={styles.addRowText}>
                  <Text style={styles.addRowName}>{t.label}</Text>
                </View>
                {added.has(t.action) ? (
                  <View style={styles.addedCheck}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.addPlus}>
                    <Plus size={13} color={colors.primary} strokeWidth={2.4} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Creates into the section the "+ Add" was tapped in (no When picker — the
// placement is already implied by where you started).
export function CreateSheet({ section, onClose, onCreate }: { section: WhenBucket; onClose: () => void; onCreate: (label: string, when: WhenBucket, notes: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const canSave = name.trim().length > 0;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardProvider>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <SheetBackdrop onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeadRow}>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Pressable disabled={!canSave} onPress={() => onCreate(name.trim(), section, notes.trim())}>
              <Text style={[styles.save, { color: canSave ? colors.primary : c.textMuted }]}>Add</Text>
            </Pressable>
          </View>
          <Text style={[styles.sheetTitle, { paddingHorizontal: 22 }]}>Define your own daily</Text>

          <View style={{ padding: 22 }}>
            <Text style={styles.groupLabelTight}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Call my sponsor"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              autoFocus
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
            <Text style={[styles.groupLabelTight, { marginTop: 18 }]}>NOTES</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional — shows under the name"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Cheap dark card treatment for the small catalog rows (lit top hairline).
  const darkCard = isDark
    ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    medallion: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? c.overlay : 'rgba(20,20,30,0.35)' },
    sheet: { backgroundColor: isDark ? c.surface : c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, maxHeight: '88%', ...(isDark ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)', borderBottomWidth: 0 } : null) },
    grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#EDEAE2', alignSelf: 'center', marginBottom: 10 },
    sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 22, paddingBottom: 8 },
    sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 6 },
    sheetTitle: { fontFamily: fontFamily.display, fontSize: 20, color: c.text, letterSpacing: -0.3 },
    sheetSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.textMuted, marginTop: 3 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEBE1', alignItems: 'center', justifyContent: 'center' },
    cancel: { fontFamily: fontFamily.regular, fontSize: fontSize.lg, color: c.textSecondary },
    save: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg },

    groupLabel: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, letterSpacing: 1.4, color: c.textMuted, marginTop: 18, marginBottom: 8, paddingHorizontal: 22 },
    groupLabelTight: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, letterSpacing: 1.4, color: c.textMuted, marginBottom: 8 },

    addRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 22, marginBottom: 10,
      backgroundColor: isDark ? c.surfaceRaised : colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, ...shadows.sm,
      ...darkCard,
    },
    // Already-on-the-list rows recede so the still-available ones pop on a
    // glance — dimmed, but kept readable.
    addRowAdded: { opacity: 0.55 },
    addRowText: { flex: 1 },
    addRowName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: c.text },
    editRowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    addPlus: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    addedCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    createRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 22,
      backgroundColor: isDark ? colors.primarySoft : colors.primary + '12', borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed', padding: 14,
    },
    createIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff', borderWidth: 1.5, borderColor: colors.primary + '66', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    input: { fontFamily: fontFamily.regular, fontSize: fontSize.lg, color: c.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.white, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 12 },
  });
};
