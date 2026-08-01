// Journal — freeform writing composer (redesign 3.0). Per the prototype
// (hifi-tools-four.jsx JournalEditor): a single open writing surface. Saving
// appends an entry to the journal store (local-first) and, when opened from a
// Today daily, checks it off. Entries surface in the deferred Journey "Notebook".
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useJournal } from '@/hooks/use-journal-store';
import { useDailies } from '@/hooks/use-dailies-store';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { maybePromptBackup } from '@/lib/backupPrompt';
import { notifySaved } from '@/components/SavedSnackbar';

const tool = TOOLS.journal;

export default function JournalScreen() {
  const router = useRouter();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { c, isDark } = useTokens();
  const journal = useJournal();
  const dailies = useDailies();
  const [text, setText] = useState('');
  const dirty = text.trim() !== '';

  const commit = () => {
    Keyboard.dismiss();
    if (dirty && journal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      journal.addEntry(text.trim());
      logEvent('entry_saved', { type: 'journal' });
      if (dailyId) dailies.markDone(dailyId);
      maybePromptBackup(); // one-time, only if this device isn't backing up
      notifySaved();       // where did it go? — Journey, and here's a way there
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader tool={tool} dirty={dirty} onCommit={commit} />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        <ToolIntro tool={tool} variant="bar">Write freely — whatever&rsquo;s on your mind. No rules, no audience.</ToolIntro>
        <View style={styles.body}>
          <View style={styles.card}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What’s on your mind today?"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              multiline
              autoFocus
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, isDark } = tk;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  body: { paddingHorizontal: 18 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, minHeight: 240, ...darkCard },
  input: { fontFamily: fontFamily.regular, fontSize: 16.5, lineHeight: 25, color: c.text, minHeight: 200, textAlignVertical: 'top' },
  });
};
