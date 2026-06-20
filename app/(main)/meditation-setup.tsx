import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PrototypeIcon } from '@/components/ui/PrototypeIcon';
import {
  redesignColors,
  redesignRadii,
} from '@/constants/redesignTokens';
import {
  DEFAULT_MEDITATION_SETTINGS,
  MEDITATION_APPS,
  MeditationSettings,
  MeditationSource,
  MeditationSoundtrack,
  saveMeditationSettings,
  useMeditationSettings,
} from '@/hooks/use-meditation-settings';

const LAVENDER_DARK = '#7A5FB5';
const TIMER_LENGTHS = [5, 10, 15, 20];
const SOUNDS: Array<{ id: MeditationSoundtrack; label: string }> = [
  { id: 'silence', label: 'Silence' },
  { id: 'rain', label: 'Rainfall' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
];

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ChevronLeft size={22} color={redesignColors.inkSecondary} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.headerIcon}>
        <PrototypeIcon name="lotus" size={30} color={redesignColors.white} stroke={1.8} />
      </View>
      <View style={styles.headerCopy}>
        <AppText typeRole="displayM" color={redesignColors.ink} style={styles.headerTitle}>
          Meditate with
        </AppText>
        <AppText typeRole="sub" color={redesignColors.inkMuted} style={styles.headerSubtitle}>
          How a tap starts your session
        </AppText>
      </View>
    </View>
  );
}

function SourceCard({
  badge,
  icon,
  selected,
  subtitle,
  title,
  onPress,
}: {
  badge?: string;
  icon: string;
  selected: boolean;
  subtitle: string;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.sourceCard, selected && styles.sourceCardSelected]}
      onPress={onPress}
    >
      <View style={[styles.sourceIcon, selected && styles.sourceIconSelected]}>
        <PrototypeIcon name={icon} size={21} color={selected ? redesignColors.white : LAVENDER_DARK} stroke={1.9} />
      </View>
      <View style={styles.sourceText}>
        <View style={styles.sourceTitleRow}>
          <AppText typeRole="ui" color={redesignColors.ink} style={styles.sourceTitle}>
            {title}
          </AppText>
          {badge ? (
            <View style={styles.badge}>
              <AppText typeRole="counter" color="#7A4A1F" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText typeRole="sub" color={redesignColors.inkMuted} style={styles.cardSubtitle}>
          {subtitle}
        </AppText>
      </View>
      <View style={[styles.selectCircle, selected && styles.selectCircleSelected]}>
        {selected ? <PrototypeIcon name="checkPlain" size={12} color={redesignColors.white} stroke={3} /> : null}
      </View>
    </Pressable>
  );
}

function ConfigLabel({ children }: { children: string }) {
  return (
    <AppText typeRole="eyebrow" color={redesignColors.inkMuted} style={styles.configLabel}>
      {children}
    </AppText>
  );
}

function LengthChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.lengthChip, selected && styles.lengthChipSelected]} onPress={onPress}>
      <AppText
        voice="display"
        weight="medium"
        size={17}
        lineHeight={22}
        color={selected ? redesignColors.white : redesignColors.ink}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function LengthRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const isCustom = !TIMER_LENGTHS.includes(value);
  return (
    <View style={styles.chipRow}>
      {TIMER_LENGTHS.map(length => (
        <LengthChip
          key={length}
          label={`${length} min`}
          selected={value === length}
          onPress={() => onChange(length)}
        />
      ))}
      <Pressable
        style={[styles.customChip, isCustom && styles.lengthChipSelected]}
        onPress={() => onChange(isCustom ? value : 25)}
      >
        <AppText typeRole="ui" color={isCustom ? redesignColors.white : redesignColors.inkSecondary}>
          {isCustom ? `${value} min` : '+  Custom'}
        </AppText>
      </Pressable>
    </View>
  );
}

function SoundRow({
  value,
  onChange,
}: {
  value: MeditationSoundtrack;
  onChange: (value: MeditationSoundtrack) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {SOUNDS.map(sound => {
        const selected = value === sound.id;
        return (
          <Pressable
            key={sound.id}
            style={[styles.soundChip, selected && styles.soundChipSelected]}
            onPress={() => onChange(sound.id)}
          >
            <AppText typeRole="ui" color={selected ? LAVENDER_DARK : redesignColors.inkSecondary}>
              {sound.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppRow({
  app,
  selected,
  onPress,
}: {
  app: typeof MEDITATION_APPS[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.appRow, selected && styles.appRowSelected]} onPress={onPress}>
      <View style={[styles.appGlyph, { backgroundColor: app.accent }]}>
        <AppText voice="display" weight="semiBold" size={16} color={redesignColors.white}>
          {app.glyph}
        </AppText>
      </View>
      <View style={styles.sourceText}>
        <AppText typeRole="ui" color={redesignColors.ink}>
          {app.name}
        </AppText>
        <AppText typeRole="sub" color={redesignColors.inkMuted} style={styles.cardSubtitle}>
          {app.subtitle}
        </AppText>
      </View>
      <View style={[styles.selectCircle, selected && styles.selectCircleSelected]}>
        {selected ? <PrototypeIcon name="checkPlain" size={12} color={redesignColors.white} stroke={3} /> : null}
      </View>
    </Pressable>
  );
}

export default function MeditationSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, isLoading } = useMeditationSettings();
  const [draft, setDraft] = useState<MeditationSettings>(DEFAULT_MEDITATION_SETTINGS);

  useEffect(() => {
    if (!isLoading) {
      setDraft({
        source: settings.source ?? 'timer',
        timer: { ...settings.timer },
        youtube: { ...settings.youtube },
        app: { ...settings.app },
      });
    }
  }, [isLoading, settings]);

  const selectSource = (source: MeditationSource) => {
    setDraft(current => ({ ...current, source }));
  };

  const save = async () => {
    await saveMeditationSettings(draft);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <Header onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SourceCard
            icon="circle"
            title="Built-in timer"
            badge="Hero"
            subtitle="A calm photo timer with soundtracks"
            selected={draft.source === 'timer'}
            onPress={() => selectSource('timer')}
          />
          <SourceCard
            icon="play"
            title="A YouTube video"
            subtitle="Plays in-app, no leaving the app"
            selected={draft.source === 'youtube'}
            onPress={() => selectSource('youtube')}
          />
          <SourceCard
            icon="library"
            title="Use an app"
            subtitle="Calm · Headspace · Insight Timer"
            selected={draft.source === 'app'}
            onPress={() => selectSource('app')}
          />

          {draft.source === 'timer' ? (
            <>
              <ConfigLabel>Length</ConfigLabel>
              <LengthRow
                value={draft.timer.minutes}
                onChange={minutes => setDraft(current => ({
                  ...current,
                  timer: { ...current.timer, minutes },
                }))}
              />
              <ConfigLabel>Soundtrack</ConfigLabel>
              <SoundRow
                value={draft.timer.sound}
                onChange={sound => setDraft(current => ({
                  ...current,
                  timer: { ...current.timer, sound },
                }))}
              />
            </>
          ) : null}

          {draft.source === 'app' ? (
            <>
              <ConfigLabel>Choose app</ConfigLabel>
              {MEDITATION_APPS.map(app => (
                <AppRow
                  key={app.id}
                  app={app}
                  selected={draft.app.id === app.id}
                  onPress={() => setDraft(current => ({
                    ...current,
                    app: { ...current.app, id: app.id },
                  }))}
                />
              ))}
              <ConfigLabel>Session length</ConfigLabel>
              <LengthRow
                value={draft.app.minutes}
                onChange={minutes => setDraft(current => ({
                  ...current,
                  app: { ...current.app, minutes },
                }))}
              />
            </>
          ) : null}

          {draft.source === 'youtube' ? (
            <>
              <ConfigLabel>Video URL</ConfigLabel>
              <View style={styles.inputWrapSelected}>
                <PrototypeIcon name="play" size={17} color={redesignColors.lavender} stroke={2} />
                <TextInput
                  value={draft.youtube.url}
                  onChangeText={url => setDraft(current => ({
                    ...current,
                    youtube: { ...current.youtube, url },
                  }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="youtube.com/watch?v=..."
                  placeholderTextColor={redesignColors.inkMuted}
                  style={styles.inlineInput}
                />
              </View>
              <AppText typeRole="sub" color={redesignColors.inkMuted} style={styles.youtubeTitle}>
                {draft.youtube.title || 'Add a title or paste a YouTube link'}
              </AppText>
              <ConfigLabel>Label (optional)</ConfigLabel>
              <TextInput
                value={draft.youtube.label}
                onChangeText={label => setDraft(current => ({
                  ...current,
                  youtube: { ...current.youtube, label },
                }))}
                placeholder="5-min breathing"
                placeholderTextColor={redesignColors.inkMuted}
                style={styles.textInput}
              />
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 14, 26) }]}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <AppText typeRole="ui" color={redesignColors.inkSecondary}>
              Cancel
            </AppText>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={save}>
            <AppText typeRole="ui" color={redesignColors.white}>
              Save
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: redesignColors.warmWhite,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavender,
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    shadowColor: redesignColors.lavender,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    width: 42,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: -1,
  },
  scroll: {
    flex: 1,
    marginTop: 22,
  },
  scrollContent: {
    paddingBottom: 28,
    paddingHorizontal: 18,
  },
  sourceCard: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 13,
    marginBottom: 10,
    minHeight: 78,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  sourceCardSelected: {
    backgroundColor: redesignColors.lavenderSoft,
    borderColor: redesignColors.lavender,
  },
  sourceIcon: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavenderSoft,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sourceIconSelected: {
    backgroundColor: redesignColors.lavender,
  },
  sourceText: {
    flex: 1,
    minWidth: 0,
  },
  sourceTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sourceTitle: {
    lineHeight: 18,
  },
  cardSubtitle: {
    marginTop: 3,
  },
  badge: {
    backgroundColor: redesignColors.amberSoft,
    borderRadius: redesignRadii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectCircle: {
    alignItems: 'center',
    borderColor: redesignColors.border,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  selectCircleSelected: {
    backgroundColor: redesignColors.lavender,
    borderColor: redesignColors.lavender,
  },
  configLabel: {
    marginBottom: 9,
    marginTop: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lengthChip: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 52,
    paddingHorizontal: 10,
  },
  lengthChipSelected: {
    backgroundColor: redesignColors.lavender,
    borderColor: redesignColors.lavender,
  },
  customChip: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  soundChip: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 15,
  },
  soundChipSelected: {
    backgroundColor: redesignColors.lavenderSoft,
    borderColor: redesignColors.lavender,
  },
  appRow: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 9,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  appRowSelected: {
    backgroundColor: redesignColors.lavenderSoft,
    borderColor: redesignColors.lavender,
  },
  appGlyph: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  inputWrapSelected: {
    alignItems: 'center',
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.lavender,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 15,
  },
  inlineInput: {
    color: redesignColors.ink,
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    paddingVertical: 0,
  },
  youtubeTitle: {
    marginTop: 8,
  },
  textInput: {
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
    borderRadius: 12,
    borderWidth: 1.5,
    color: redesignColors.inkSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  footer: {
    backgroundColor: redesignColors.surface,
    borderTopColor: redesignColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: redesignColors.border,
    borderRadius: redesignRadii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: redesignColors.lavender,
    borderRadius: redesignRadii.pill,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 52,
  },
});
