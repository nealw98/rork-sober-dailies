import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, X, Plus, Trash2, Check } from 'lucide-react-native';

import { colors, fontFamily, fontSize, spacing, radii, shadows, getSemanticColors } from '@/constants/designTokens';
import { resolveGlyph, resolveTone, resolveSubtitle } from '@/components/dailyTokens';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

type Template = Omit<DailyItem, 'id' | 'when'>;

const BUCKETS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// "From your tools" catalog (matches the prototype Add sheet).
const TOOL_CATALOG: Template[] = [
  { label: 'Morning Prayer', icon: 'pray', color: 'amber', action: 'prayerMorning' },
  { label: 'Evening Prayer', icon: 'pray', color: 'amber', action: 'prayerEvening' },
  { label: 'Write my Gratitude List', icon: 'heart', color: 'amber', action: 'gratitude' },
  { label: 'Read the literature', icon: 'library', color: 'teal', action: 'lit' },
  { label: 'Nightly Review', icon: 'moon', color: 'lavender', action: 'nightly' },
  { label: 'Listen to a speaker tape', icon: 'play', color: 'lavender', action: 'speaker' },
  { label: 'Attend a meeting', icon: 'users', color: 'lavender', action: 'meeting' },
  { label: 'Write in my journal', icon: 'journal', color: 'blue', action: 'journal' },
  { label: 'Spot Check Inventory', icon: 'check', color: 'coral', action: 'spotcheck' },
  { label: 'Meditation', icon: 'lotus', color: 'lavender', action: 'meditation' },
  { label: 'Call another alcoholic', icon: 'phone', color: 'blue', action: 'callAnother' },
];

// "Quick actions" — no tool, just check off.
const QUICK_CATALOG: Template[] = [
  { label: 'Make my bed', icon: 'home', color: 'amber', action: 'makeBed' },
  { label: 'Get some exercise', icon: 'heart', color: 'coral', action: 'exercise' },
  { label: 'Do some service', icon: 'users', color: 'teal', action: 'service' },
];

function Medallion({ icon, tone, soft }: { icon: string; tone: string; soft?: boolean }) {
  const t = resolveTone(tone);
  const Glyph = resolveGlyph(icon);
  return (
    <View style={[styles.medallion, soft ? { backgroundColor: t.ink + '22' } : { backgroundColor: t.ink, ...shadows.sm, shadowColor: t.ink }]}>
      <Glyph size={20} color={soft ? t.ink : '#fff'} />
    </View>
  );
}

function EditRow({ item, onGear, onRemove }: { item: DailyItem; onGear: () => void; onRemove: () => void }) {
  return (
    <View style={styles.editRow}>
      <Medallion icon={item.icon} tone={item.color} soft />
      <View style={styles.editRowText}>
        <View style={styles.editRowTitleRow}>
          <Text style={styles.editRowLabel} numberOfLines={2}>{item.label}</Text>
          {item.custom && <Text style={styles.customBadge}>CUSTOM</Text>}
        </View>
        {resolveSubtitle(item.action) ? (
          <Text style={styles.editRowSub} numberOfLines={1}>{resolveSubtitle(item.action)}</Text>
        ) : null}
      </View>
      <Pressable hitSlop={6} style={styles.gearBtn} onPress={onGear}>
        <Settings size={17} color="#4A4A5E" strokeWidth={2} />
      </Pressable>
      <Pressable hitSlop={8} style={styles.removeBtn} onPress={onRemove}>
        <X size={12} color="#fff" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function SheetBackdrop({ onPress }: { onPress: () => void }) {
  return <Pressable style={styles.backdrop} onPress={onPress} />;
}

function AddSheet({ section, added, onClose, onAdd, onCreate }: { section: WhenBucket; added: Set<string>; onClose: () => void; onAdd: (t: Template) => void; onCreate: () => void }) {
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
              <X size={16} color="#4A4A5E" strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.groupLabel}>FROM YOUR TOOLS</Text>
            {TOOL_CATALOG.map((t) => (
              <Pressable key={t.action} style={styles.addRow} disabled={added.has(t.action)} onPress={() => onAdd(t)}>
                <Medallion icon={t.icon} tone={t.color} soft />
                <View style={styles.addRowText}>
                  <Text style={styles.addRowName}>{t.label}</Text>
                  {resolveSubtitle(t.action) ? (
                    <Text style={styles.editRowSub} numberOfLines={1}>{resolveSubtitle(t.action)}</Text>
                  ) : null}
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
              <Pressable key={t.action} style={styles.addRow} disabled={added.has(t.action)} onPress={() => onAdd(t)}>
                <Medallion icon={t.icon} tone={t.color} soft />
                <View style={styles.addRowText}>
                  <Text style={styles.addRowName}>{t.label}</Text>
                  {resolveSubtitle(t.action) ? (
                    <Text style={styles.editRowSub} numberOfLines={1}>{resolveSubtitle(t.action)}</Text>
                  ) : null}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreateSheet({ section, onClose, onCreate }: { section: WhenBucket; onClose: () => void; onCreate: (label: string, when: WhenBucket) => void }) {
  const [name, setName] = useState('');
  const [when, setWhen] = useState<WhenBucket>(section);
  const canSave = name.trim().length > 0;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <SheetBackdrop onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeadRow}>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Pressable disabled={!canSave} onPress={() => onCreate(name.trim(), when)}>
              <Text style={[styles.save, { color: canSave ? colors.primary : '#8A8A9A' }]}>Add</Text>
            </Pressable>
          </View>
          <Text style={[styles.sheetTitle, { paddingHorizontal: 22 }]}>Custom action</Text>

          <View style={{ padding: 22 }}>
            <Text style={styles.groupLabelTight}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Call my sponsor"
              placeholderTextColor="#8A8A9A"
              style={styles.input}
              autoFocus
            />
            <Text style={[styles.groupLabelTight, { marginTop: 18 }]}>WHEN</Text>
            <WhenPicker value={when} onChange={setWhen} accent={colors.primary} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WhenPicker({ value, onChange, accent }: { value: WhenBucket; onChange: (w: WhenBucket) => void; accent: string }) {
  return (
    <View style={styles.segment}>
      {BUCKETS.map((w) => {
        const on = w === value;
        return (
          <Pressable
            key={w}
            onPress={() => onChange(w)}
            style={[styles.segmentBtn, on ? { backgroundColor: accent } : { borderWidth: 1.5, borderColor: '#EDEAE2' }]}
          >
            <Text style={[styles.segmentText, { color: on ? '#fff' : '#2B2A30' }]}>{w}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsSheet({ item, onClose, onSave, onRemove }: { item: DailyItem; onClose: () => void; onSave: (label: string, when: WhenBucket) => void; onRemove: () => void }) {
  const [name, setName] = useState(item.label);
  const [when, setWhen] = useState<WhenBucket>(item.when);
  const tone = resolveTone(item.color);
  const changed = name.trim().length > 0 && (name.trim() !== item.label || when !== item.when);
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <SheetBackdrop onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeadRow}>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Pressable disabled={!changed} onPress={() => onSave(name.trim(), when)}>
              <Text style={[styles.save, { color: changed ? colors.primary : '#8A8A9A' }]}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.settingsHead}>
            <Medallion icon={item.icon} tone={item.color} soft />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle} numberOfLines={1}>{item.label}</Text>
              {item.custom && <Text style={styles.customBadge}>CUSTOM</Text>}
            </View>
          </View>

          <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
            <Text style={styles.groupLabelTight}>NAME</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#8A8A9A" />

            <Text style={[styles.groupLabelTight, { marginTop: 18 }]}>WHEN</Text>
            <WhenPicker value={when} onChange={setWhen} accent={tone.ink} />

            <Pressable style={styles.removeAction} onPress={onRemove}>
              <Trash2 size={16} color="#C9462E" strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.removeActionLabel}>{item.custom ? 'Delete custom action' : 'Remove from Today'}</Text>
                <Text style={styles.removeActionSub}>{item.custom ? 'Removes it entirely. Cannot undo.' : 'Stays in your Tools library.'}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MyDailiesScreen() {
  const router = useRouter();
  const c = getSemanticColors('light');
  const dailies = useDailies();
  useScreenTimeTracking('My Dailies');

  const [addSection, setAddSection] = useState<WhenBucket | null>(null);
  const [createSection, setCreateSection] = useState<WhenBucket | null>(null);
  const [settingsItem, setSettingsItem] = useState<DailyItem | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>My Dailies</Text>
        <Pressable
          hitSlop={8}
          onPress={() => router.back()}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Build your daily program</Text>
          <Text style={styles.introBody}>
            These are the things you'll do each day. Use <Text style={styles.introStrong}>+ Add</Text> to add a daily, the
            {' '}<Text style={styles.introStrong}>gear</Text> to rename or move it, and <Text style={styles.introStrong}>×</Text> to remove.
          </Text>
        </View>

        {BUCKETS.map((when) => {
          const items = dailies.section(when);
          return (
            <View key={when} style={styles.bucket}>
              <View style={styles.bucketHead}>
                <Text style={[styles.bucketTitle, { color: c.text }]}>{when}</Text>
                <Text style={styles.bucketHint}>tap the gear to edit</Text>
              </View>
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Nothing here yet — add a daily below.</Text>
                </View>
              ) : (
                items.map((item) => (
                  <EditRow
                    key={item.id}
                    item={item}
                    onGear={() => setSettingsItem(item)}
                    onRemove={() => dailies.removeDaily(item.id)}
                  />
                ))
              )}
              <Pressable style={styles.addPill} onPress={() => setAddSection(when)}>
                <Plus size={16} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.addPillText}>Add to {when}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {addSection && (
        <AddSheet
          section={addSection}
          added={new Set(dailies.program.map((i) => i.action))}
          onClose={() => setAddSection(null)}
          onAdd={(t) => {
            dailies.addDaily(t, addSection);
            setAddSection(null);
          }}
          onCreate={() => {
            const s = addSection;
            setAddSection(null);
            setCreateSection(s);
          }}
        />
      )}

      {createSection && (
        <CreateSheet
          section={createSection}
          onClose={() => setCreateSection(null)}
          onCreate={(label, when) => {
            dailies.addDaily({ label, icon: 'circle', color: 'gray', action: 'custom', custom: true }, when);
            setCreateSection(null);
          }}
        />
      )}

      {settingsItem && (
        <SettingsSheet
          item={settingsItem}
          onClose={() => setSettingsItem(null)}
          onSave={(label, when) => {
            if (label !== settingsItem.label) dailies.renameDaily(settingsItem.id, label);
            if (when !== settingsItem.when) dailies.setWhen(settingsItem.id, when);
            setSettingsItem(null);
          }}
          onRemove={() => {
            dailies.removeDaily(settingsItem.id);
            setSettingsItem(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.displayBold, fontSize: 26, letterSpacing: -0.4 },
  doneBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999 },
  doneText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: '#fff' },
  scroll: { paddingHorizontal: 22, paddingBottom: 60 },

  intro: { backgroundColor: colors.primarySoft, borderRadius: 14, borderWidth: 1, borderColor: colors.primary + '33', padding: 14, marginTop: 4 },
  introTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: '#2B2A30', marginBottom: 4 },
  introBody: { fontFamily: fontFamily.regular, fontSize: 12.5, color: '#4A4A5E', lineHeight: 19 },
  introStrong: { fontFamily: fontFamily.semiBold, color: '#2B2A30' },

  bucket: { marginTop: spacing.lg },
  bucketHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  bucketTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl },
  bucketHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#8A8A9A' },

  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, ...shadows.sm,
  },
  editRowText: { flex: 1, minWidth: 0 },
  editRowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  editRowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: '#2B2A30' },
  editRowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: '#8A8A9A', marginTop: 2 },
  customBadge: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.6, color: '#7A4A1F', backgroundColor: '#F6E5C8', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.full, overflow: 'hidden' },
  gearBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFEBE1', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C9462E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },

  empty: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#EDEAE2', borderStyle: 'dashed', marginBottom: 10 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: '#8A8A9A', textAlign: 'center' },

  addPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
  },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },

  medallion: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // sheets
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,30,0.35)' },
  sheet: { backgroundColor: '#F9F7F2', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, maxHeight: '88%' },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#EDEAE2', alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 22, paddingBottom: 8 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 6 },
  sheetTitle: { fontFamily: fontFamily.display, fontSize: 22, color: '#2B2A30', letterSpacing: -0.4 },
  sheetSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: '#8A8A9A', marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFEBE1', alignItems: 'center', justifyContent: 'center' },
  cancel: { fontFamily: fontFamily.regular, fontSize: fontSize.lg, color: '#4A4A5E' },
  save: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg },

  groupLabel: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, letterSpacing: 1.4, color: '#8A8A9A', marginTop: 18, marginBottom: 8, paddingHorizontal: 22 },
  groupLabelTight: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, letterSpacing: 1.4, color: '#8A8A9A', marginBottom: 8 },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 22, marginBottom: 10,
    backgroundColor: colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, ...shadows.sm,
  },
  addRowText: { flex: 1 },
  addRowName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: '#2B2A30' },
  addPlus: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addedCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 22,
    backgroundColor: colors.primary + '12', borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed', padding: 14,
  },
  createIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary + '66', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  // settings + create
  settingsHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingBottom: 14 },
  settingsTitle: { fontFamily: fontFamily.display, fontSize: 20, color: '#2B2A30', letterSpacing: -0.3 },
  input: { fontFamily: fontFamily.regular, fontSize: fontSize.lg, color: '#2B2A30', backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#EDEAE2', paddingHorizontal: 14, paddingVertical: 12 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md },
  removeAction: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, backgroundColor: '#FBE7E1', borderRadius: 12, padding: 14 },
  removeActionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: '#C9462E' },
  removeActionSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: '#9A6A5A', marginTop: 1 },
});
