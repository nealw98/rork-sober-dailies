import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Check,
  CheckCircle,
  Heart,
  Home,
  Moon,
  Phone,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import {
  redesignColors,
  redesignRadii,
  redesignSpacing,
} from '@/constants/redesignTokens';
import {
  ADD_DAILY_TEMPLATES,
  AddDailyTemplate,
  DailyItem,
  DailySection,
  DailyTone,
  useDailiesStore,
} from '@/hooks/use-dailies-store';
import { useSobriety } from '@/hooks/useSobrietyStore';

const SECTIONS: DailySection[] = ['Morning', 'Anytime', 'Evening'];
const TOOL_TEMPLATES = ADD_DAILY_TEMPLATES.filter(template => template.category === 'tool');
const QUICK_ACTION_TEMPLATES = ADD_DAILY_TEMPLATES.filter(template => template.category === 'quick');

const toneColors: Record<DailyTone, { ink: string; soft: string }> = {
  teal: { ink: redesignColors.teal, soft: redesignColors.tealSoft },
  amber: { ink: redesignColors.amber, soft: redesignColors.amberSoft },
  blue: { ink: redesignColors.blue, soft: redesignColors.blueSoft },
  lavender: { ink: redesignColors.lavender, soft: redesignColors.lavenderSoft },
  coral: { ink: redesignColors.coral, soft: redesignColors.coralSoft },
  gray: { ink: redesignColors.inkMuted, soft: redesignColors.paperDeep },
};

function iconFor(icon: string, tone: DailyTone, size = 18, color = toneColors[tone].ink) {
  const prototypeIcons = new Set([
    'book',
    'check',
    'circle',
    'heart',
    'home',
    'journal',
    'library',
    'lotus',
    'moon',
    'phone',
    'play',
    'pray',
    'users',
  ]);
  if (prototypeIcons.has(icon)) {
    return <PrototypeIcon name={icon} size={size} color={color} stroke={1.9} />;
  }

  const props = { size, color, strokeWidth: 1.9 };
  switch (icon) {
    case 'sun':
    case 'pray':
      return <Sun {...props} />;
    case 'heart':
      return <Heart {...props} />;
    case 'users':
      return <Users {...props} />;
    case 'book':
    case 'library':
      return <BookOpen {...props} />;
    case 'moon':
      return <Moon {...props} />;
    case 'home':
      return <Home {...props} />;
    case 'phone':
      return <Phone {...props} />;
    case 'sparkles':
      return <Sparkles {...props} />;
    default:
      return <CheckCircle {...props} />;
  }
}

export default function MyDailiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sectionItems, addDaily, updateDaily, removeDaily } = useDailiesStore();
  const { emergencyContacts } = useSobriety();
  const [addSection, setAddSection] = useState<DailySection | null>(null);
  const [settingsItem, setSettingsItem] = useState<DailyItem | null>(null);
  const [customSection, setCustomSection] = useState<DailySection | null>(null);
  const [customName, setCustomName] = useState('');

  const settingsDraft = useMemo(() => settingsItem ? { ...settingsItem } : null, [settingsItem]);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftSection, setDraftSection] = useState<DailySection>('Anytime');

  const openSettings = (item: DailyItem) => {
    if (item.action === 'meditation') {
      router.push('/(main)/meditation-setup');
      return;
    }
    setSettingsItem(item);
    setDraftLabel(item.label);
    setDraftSection(item.section);
  };

  const closeSettings = () => {
    setSettingsItem(null);
    setDraftLabel('');
    setDraftSection('Anytime');
  };

  const saveSettings = async () => {
    if (!settingsItem) return;
    const label = draftLabel.trim();
    if (!label) return;
    await updateDaily(settingsItem.id, {
      label,
      section: draftSection,
    });
    closeSettings();
  };

  const confirmRemoveItem = (item: DailyItem, closeAfterRemove = false) => {
    Alert.alert(
      item.custom ? 'Delete custom action?' : 'Remove from Your Day?',
      item.custom
        ? 'This removes the custom action entirely.'
        : 'This only removes it from your daily list. The underlying tool stays available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.custom ? 'Delete' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeDaily(item.id);
            if (closeAfterRemove) closeSettings();
          },
        },
      ],
    );
  };

  const confirmRemove = () => {
    if (!settingsItem) return;
    confirmRemoveItem(settingsItem, true);
  };

  const addTemplate = async (template: AddDailyTemplate) => {
    if (!addSection) return;
    await addDaily(template, addSection);
    setAddSection(null);
    if (template.action === 'call' && emergencyContacts.length === 0) {
      router.push('/(main)/add-from-contacts');
    }
  };

  const openCustom = (section: DailySection) => {
    setAddSection(null);
    setCustomSection(section);
    setCustomName('');
  };

  const saveCustom = async () => {
    if (!customSection) return;
    const label = customName.trim();
    if (!label) return;
    await addDaily({
      label,
      action: 'custom',
      subtitle: 'custom action',
      icon: 'circle',
      tone: 'gray',
      custom: true,
    }, customSection);
    setCustomSection(null);
    setCustomName('');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + redesignSpacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <AppText voice="display" weight="medium" size={30} color={redesignColors.ink} style={styles.headerTitle}>
              My Dailies
            </AppText>
            <AppText voice="interface" size={13} color={redesignColors.inkMuted}>
              Arrange your daily program
            </AppText>
          </View>
          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <AppText voice="interface" weight="semiBold" size={13} color={redesignColors.white}>
              Done
            </AppText>
          </Pressable>
        </View>

        <View style={styles.instructionCard}>
          <AppText voice="display" weight="semiBold" size={17} color={redesignColors.ink}>
            Build your daily program
          </AppText>
          <AppText voice="interface" size={13} color={redesignColors.inkSecondary} style={styles.instructionText}>
            These are the things you&apos;ll do each day to stay on track. Use{' '}
            <AppText voice="interface" weight="bold" size={13} color={redesignColors.inkSecondary}>+ Add</AppText>
            {' '}to add a daily, the gear to set one up, and{' '}
            <AppText voice="interface" weight="bold" size={13} color={redesignColors.inkSecondary}>×</AppText>
            {' '}to remove. To move a daily to a different time of day, open it and change{' '}
            <AppText voice="interface" weight="bold" size={13} color={redesignColors.inkSecondary}>When.</AppText>
          </AppText>
        </View>

        {SECTIONS.map(section => (
          <View key={section} style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText voice="display" weight="medium" size={20} color={redesignColors.ink}>
                {section}
              </AppText>
            </View>

            {sectionItems(section).length ? (
              sectionItems(section).map(item => (
                <EditorRow
                  key={item.id}
                  item={item}
                  onSettings={() => openSettings(item)}
                  onRemove={() => confirmRemoveItem(item)}
                />
              ))
            ) : (
              <View style={styles.emptySection}>
                <AppText voice="interface" size={13} color={redesignColors.inkMuted}>
                  Nothing here yet — add a daily below.
                </AppText>
              </View>
            )}

            <Pressable style={styles.addButton} onPress={() => setAddSection(section)}>
              <Plus size={16} color={redesignColors.teal} strokeWidth={2.3} />
              <AppText voice="interface" weight="semiBold" size={13} color={redesignColors.teal}>
                Add to {section}
              </AppText>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <AddSheet
        section={addSection}
        onClose={() => setAddSection(null)}
        onAdd={addTemplate}
        onCreateCustom={openCustom}
      />

      <SettingsSheet
        item={settingsDraft}
        draftLabel={draftLabel}
        draftSection={draftSection}
        onClose={closeSettings}
        onLabelChange={setDraftLabel}
        onSectionChange={setDraftSection}
        onSave={saveSettings}
        onRemove={confirmRemove}
      />

      <CustomSheet
        section={customSection}
        name={customName}
        onNameChange={setCustomName}
        onClose={() => setCustomSection(null)}
        onSave={saveCustom}
      />
    </View>
  );
}

function EditorRow({
  item,
  onSettings,
  onRemove,
}: {
  item: DailyItem;
  onSettings: () => void;
  onRemove: () => void;
}) {
  const tone = toneColors[item.tone];

  return (
    <View style={styles.editorRow}>
      <View style={[styles.editorIcon, { backgroundColor: tone.soft }]}>
        {iconFor(item.icon, item.tone, 19)}
      </View>
      <View style={styles.editorText}>
        <View style={styles.labelRow}>
          <AppText voice="interface" weight="semiBold" size={14.5} color={redesignColors.ink} numberOfLines={1}>
            {item.label}
          </AppText>
          {item.custom ? (
            <View style={styles.customBadge}>
              <AppText voice="interface" weight="bold" size={9.5} color="#7A4A1F" style={styles.customBadgeText}>
                Custom
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rowActions}>
        <Pressable style={styles.settingsButton} onPress={onSettings}>
          <Settings size={15} color={redesignColors.inkSecondary} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.removeCircleButton} onPress={onRemove}>
          <X size={13} color={redesignColors.white} strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

function AddSheet({
  section,
  onClose,
  onAdd,
  onCreateCustom,
}: {
  section: DailySection | null;
  onClose: () => void;
  onAdd: (template: AddDailyTemplate) => void;
  onCreateCustom: (section: DailySection) => void;
}) {
  return (
    <Modal visible={!!section} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <View>
              <AppText voice="display" weight="medium" size={23} color={redesignColors.ink}>
                Add to {section}
              </AppText>
              <AppText voice="interface" size={12} color={redesignColors.inkMuted}>
                Pick from your tools, a quick action, or make your own.
              </AppText>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={17} color={redesignColors.inkSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetScroll}>
            <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.sheetLabel}>
              From your tools
            </AppText>
            {TOOL_TEMPLATES.map(template => (
              <AddRow key={template.label} template={template} onPress={() => onAdd(template)} />
            ))}

            <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.sheetLabel}>
              Quick actions
            </AppText>
            {QUICK_ACTION_TEMPLATES.map(template => (
              <AddRow key={template.label} template={template} onPress={() => onAdd(template)} />
            ))}

            {section ? (
              <>
                <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.sheetLabel}>
                  Create your own
                </AppText>
                <Pressable style={styles.customActionCard} onPress={() => onCreateCustom(section)}>
                  <View style={styles.customPlus}>
                    <Plus size={20} color={redesignColors.teal} strokeWidth={2.3} />
                  </View>
                  <View style={styles.editorText}>
                    <AppText voice="interface" weight="semiBold" size={15} color={redesignColors.ink}>
                      Make a custom action
                    </AppText>
                    <AppText voice="interface" size={12} color={redesignColors.inkMuted}>
                      Something only on your list.
                    </AppText>
                  </View>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AddRow({ template, onPress }: { template: AddDailyTemplate; onPress: () => void }) {
  const tone = toneColors[template.tone];
  return (
    <Pressable style={styles.addRow} onPress={onPress}>
      <View style={[styles.addRowIcon, { backgroundColor: tone.soft }]}>
        {iconFor(template.icon, template.tone, 19)}
      </View>
      <View style={styles.editorText}>
        <AppText voice="interface" weight="semiBold" size={14.5} color={redesignColors.ink}>
          {template.label}
        </AppText>
      </View>
      <View style={styles.addSmallButton}>
        <Plus size={15} color={redesignColors.teal} strokeWidth={2.3} />
      </View>
    </Pressable>
  );
}

function SettingsSheet({
  item,
  draftLabel,
  draftSection,
  onClose,
  onLabelChange,
  onSectionChange,
  onSave,
  onRemove,
}: {
  item: DailyItem | null;
  draftLabel: string;
  draftSection: DailySection;
  onClose: () => void;
  onLabelChange: (value: string) => void;
  onSectionChange: (section: DailySection) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const tone = item ? toneColors[item.tone] : toneColors.teal;
  const canSave = draftLabel.trim().length > 0;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetCompact}>
          <View style={styles.sheetNav}>
            <Pressable onPress={onClose}>
              <AppText voice="interface" size={14} color={redesignColors.inkSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={onSave} disabled={!canSave}>
              <AppText voice="interface" weight="semiBold" size={14} color={canSave ? redesignColors.teal : redesignColors.inkMuted}>
                Save
              </AppText>
            </Pressable>
          </View>

          {item ? (
            <View style={styles.settingsTitleRow}>
              <View style={[styles.settingsHeroIcon, { backgroundColor: tone.soft }]}>
                {iconFor(item.icon, item.tone, 22)}
              </View>
              <View style={styles.editorText}>
                <AppText voice="display" weight="medium" size={21} color={redesignColors.ink}>
                  {item.label}
                </AppText>
                <AppText voice="interface" size={12} color={redesignColors.inkMuted}>
                  {item.section}{item.custom ? ' · custom' : ''}
                </AppText>
              </View>
            </View>
          ) : null}

          <View style={styles.formBlock}>
            <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.formLabel}>
              Name
            </AppText>
            <TextInput
              value={draftLabel}
              onChangeText={onLabelChange}
              placeholder="Daily name"
              placeholderTextColor={redesignColors.inkMuted}
              style={styles.input}
            />

            <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.formLabel}>
              When
            </AppText>
            <View style={styles.segmented}>
              {SECTIONS.map(section => (
                <Pressable
                  key={section}
                  style={[
                    styles.segment,
                    draftSection === section && { backgroundColor: redesignColors.teal, borderColor: redesignColors.teal },
                  ]}
                  onPress={() => onSectionChange(section)}
                >
                  <AppText
                    voice="interface"
                    weight="semiBold"
                    size={13}
                    color={draftSection === section ? redesignColors.white : redesignColors.ink}
                  >
                    {section}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.removeButton} onPress={onRemove}>
              <Trash2 size={17} color={redesignColors.coral} strokeWidth={2.1} />
              <View style={styles.editorText}>
                <AppText voice="interface" weight="semiBold" size={14} color={redesignColors.coral}>
                  {item?.custom ? 'Delete custom action' : 'Remove from Your Day'}
                </AppText>
                <AppText voice="interface" size={12} color={redesignColors.inkMuted}>
                  {item?.custom ? 'This cannot be undone.' : 'The tool remains available elsewhere.'}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CustomSheet({
  section,
  name,
  onNameChange,
  onClose,
  onSave,
}: {
  section: DailySection | null;
  name: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const canSave = name.trim().length > 0;

  return (
    <Modal visible={!!section} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetCompact}>
          <View style={styles.sheetNav}>
            <Pressable onPress={onClose}>
              <AppText voice="interface" size={14} color={redesignColors.inkSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <AppText voice="interface" weight="semiBold" size={14} color={redesignColors.ink}>
              New action
            </AppText>
            <Pressable onPress={onSave} disabled={!canSave}>
              <AppText voice="interface" weight="semiBold" size={14} color={canSave ? redesignColors.teal : redesignColors.inkMuted}>
                Save
              </AppText>
            </Pressable>
          </View>

          <View style={styles.formBlock}>
            <AppText voice="display" weight="medium" size={24} color={redesignColors.ink} style={styles.customTitle}>
              Add a custom daily
            </AppText>
            <AppText voice="interface" size={13} color={redesignColors.inkSecondary} style={styles.instructionText}>
              This is a check-off action only. It won’t open another screen.
            </AppText>

            <AppText voice="interface" weight="bold" size={11} color={redesignColors.inkMuted} style={styles.formLabel}>
              Name
            </AppText>
            <TextInput
              value={name}
              onChangeText={onNameChange}
              placeholder="e.g. Call my sponsor"
              placeholderTextColor={redesignColors.inkMuted}
              style={styles.input}
              autoFocus
            />

            <View style={styles.whenNote}>
              <Check size={16} color={redesignColors.teal} strokeWidth={2.2} />
              <AppText voice="interface" size={13} color={redesignColors.inkSecondary}>
                Adds to {section}
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: redesignColors.warmWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 124,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: redesignSpacing.lg,
  },
  headerTitle: {
    letterSpacing: -0.6,
  },
  doneButton: {
    backgroundColor: redesignColors.ink,
    borderRadius: redesignRadii.pill,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  instructionCard: {
    backgroundColor: redesignColors.tealSoft,
    borderColor: `${redesignColors.teal}33`,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: redesignSpacing.md,
    padding: redesignSpacing.lg,
  },
  instructionText: {
    lineHeight: 22,
    marginTop: 4,
  },
  section: {
    marginTop: redesignSpacing.lg,
  },
  sectionHeader: {
    marginBottom: redesignSpacing.sm,
  },
  editorRow: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: 'rgba(43,42,48,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  editorIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  editorText: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  customBadge: {
    backgroundColor: redesignColors.amberSoft,
    borderRadius: redesignRadii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  customBadgeText: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: '#EFEBE1',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  removeCircleButton: {
    alignItems: 'center',
    backgroundColor: '#D84832',
    borderColor: redesignColors.white,
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    width: 28,
  },
  emptySection: {
    alignItems: 'center',
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    padding: redesignSpacing.lg,
  },
  addButton: {
    alignItems: 'center',
    borderColor: `${redesignColors.teal}66`,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: redesignSpacing.sm,
    minHeight: 54,
    padding: redesignSpacing.md,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(20,20,30,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: redesignColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '86%',
    paddingBottom: redesignSpacing.lg,
  },
  sheetCompact: {
    backgroundColor: redesignColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: redesignSpacing.xl,
  },
  sheetGrabber: {
    alignSelf: 'center',
    backgroundColor: redesignColors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: redesignSpacing.md,
    marginTop: redesignSpacing.md,
    width: 38,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: redesignSpacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: redesignSpacing.sm,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#EFEBE1',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sheetScroll: {
    paddingHorizontal: 22,
    paddingBottom: redesignSpacing.lg,
  },
  sheetLabel: {
    letterSpacing: 1.3,
    marginBottom: redesignSpacing.sm,
    marginTop: redesignSpacing.lg,
    textTransform: 'uppercase',
  },
  addRow: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: 'rgba(43,42,48,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: redesignColors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  addRowIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addSmallButton: {
    alignItems: 'center',
    borderColor: redesignColors.teal,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  customActionCard: {
    alignItems: 'center',
    backgroundColor: redesignColors.tealSoft,
    borderColor: `${redesignColors.teal}66`,
    borderRadius: redesignRadii.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: redesignSpacing.md,
    padding: redesignSpacing.lg,
  },
  customPlus: {
    alignItems: 'center',
    backgroundColor: redesignColors.white,
    borderColor: `${redesignColors.teal}66`,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sheetNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: redesignSpacing.lg,
    paddingBottom: redesignSpacing.md,
  },
  settingsTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: redesignSpacing.md,
    paddingHorizontal: 22,
    paddingBottom: redesignSpacing.md,
  },
  settingsHeroIcon: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  formBlock: {
    paddingHorizontal: 22,
    paddingTop: redesignSpacing.md,
  },
  formLabel: {
    letterSpacing: 1.3,
    marginBottom: redesignSpacing.sm,
    marginTop: redesignSpacing.md,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.md,
    borderWidth: 1.5,
    color: redesignColors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    paddingHorizontal: redesignSpacing.md,
    paddingVertical: redesignSpacing.md,
  },
  segmented: {
    flexDirection: 'row',
    gap: redesignSpacing.sm,
    marginBottom: redesignSpacing.lg,
  },
  segment: {
    alignItems: 'center',
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.md,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 10,
  },
  removeButton: {
    alignItems: 'center',
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: redesignSpacing.md,
    marginTop: redesignSpacing.md,
    padding: redesignSpacing.md,
  },
  customTitle: {
    letterSpacing: -0.4,
  },
  whenNote: {
    alignItems: 'center',
    backgroundColor: redesignColors.tealSoft,
    borderRadius: redesignRadii.md,
    flexDirection: 'row',
    gap: redesignSpacing.sm,
    marginTop: redesignSpacing.lg,
    padding: redesignSpacing.md,
  },
});
