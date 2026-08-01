// Gratitude — clean new-entry composer (redesign 3.0). Per the prototype
// (hifi-tools-four.jsx GratitudeEditor): start blank, "Today I'm grateful
// for…" + fields + "Add another". Saving writes the entry to the gratitude
// store (local-first) and, when opened from a Today daily, checks it off.
// History/Share live in the deferred Journey "Notebook", not in this editor.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useGratitudeQuote } from '@/hooks/useGratitudeQuote';
import { useDailies } from '@/hooks/use-dailies-store';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { maybePromptBackup } from '@/lib/backupPrompt';
import { confirmSaved } from '@/lib/savedNotice';

const tool = TOOLS.gratitude;

export default function GratitudeScreen() {
  const router = useRouter();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const gratitude = useGratitudeStore();
  const dailies = useDailies();
  // Daily gratitude quote from Supabase (gratitude_quotes, matched on day-of-year,
  // cached locally with a built-in fallback), shown in place of the static line.
  // Source is passed separately so it sits on its own line (like Daily Reflection).
  const { quote: dailyQuote, source: quoteSource } = useGratitudeQuote();

  const [vals, setVals] = useState<string[]>(['', '', '']);
  // Today's list is a living document: prefill what's already saved so a later
  // visit appends and edits instead of starting blank (Save then writes the
  // whole visible list back, so it can no longer clobber the morning's items).
  // The notebook copy (savedEntries) is the prefill source — it's what Journey
  // shows, so deleting today's card there makes this start blank again.
  const initialItems = useRef<string[] | null>(null);
  useEffect(() => {
    if (initialItems.current !== null || !gratitude || gratitude.isLoading) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const items = gratitude.getSavedEntry(key)?.items ?? [];
    initialItems.current = items;
    if (items.length > 0) setVals([...items, '']);
  }, [gratitude]);

  const items = vals.map((v) => v.trim()).filter(Boolean);
  // "Save" lights up only when the list differs from what's stored; a fully
  // cleared list reads "Cancel" (delete-the-day lives in Journey, not here).
  const dirty = items.length > 0 && JSON.stringify(items) !== JSON.stringify(initialItems.current ?? []);
  const setVal = (i: number, v: string) => setVals((arr) => arr.map((x, j) => (j === i ? v : x)));

  const commit = () => {
    Keyboard.dismiss();
    if (dirty && gratitude) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      gratitude.saveDetailedEntry(items);
      gratitude.completeToday(items);
      logEvent('entry_saved', { type: 'gratitude', item_count: items.length });
      if (dailyId) dailies.markDone(dailyId);
      // Tell them where it went — and let the dialog do the navigating, so the
      // Alert is never presented mid-transition. If the one-time backup nudge is
      // firing on this save, stand down rather than stack two dialogs; the save
      // confirmation comes back on the next entry.
      maybePromptBackup().then((backupShown) => {
        if (backupShown) router.back();
        else confirmSaved();
      });
      return;
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
        {dailyQuote ? <ToolIntro tool={tool} variant="bar" attribution={quoteSource ?? undefined}>{dailyQuote}</ToolIntro> : null}

        <View style={styles.body}>
          <Text style={styles.heading}>Today I&rsquo;m grateful for&hellip;</Text>

          {vals.map((val, i) => (
            <TextInput
              key={i}
              value={val}
              onChangeText={(t) => setVal(i, t)}
              placeholder={i === 0 ? 'e.g., My sobriety' : ''}
              placeholderTextColor={c.textMuted}
              style={[styles.field, i === 0 && val === '' ? styles.fieldItalic : null]}
              multiline
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          ))}

          <Pressable onPress={() => setVals((v) => [...v, ''])} style={styles.addAnother} hitSlop={6}>
            <Plus size={16} color={colors.accentDark} strokeWidth={2.4} />
            <Text style={[styles.addAnotherText, { color: colors.accentDark }]}>Add another</Text>
          </Pressable>
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
  scroll: { paddingBottom: 32 },
  body: { paddingHorizontal: 18 },
  heading: { fontFamily: fontFamily.semiBold, fontSize: 17, color: c.text, letterSpacing: -0.2, marginBottom: 16 },
  field: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    fontFamily: fontFamily.regular,
    fontSize: 16.5,
    lineHeight: 22,
    color: c.text,
    marginBottom: 12,
    ...darkCard,
  },
  fieldItalic: { fontFamily: fontFamily.regularItalic },
  addAnother: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 4 },
  addAnotherText: { fontFamily: fontFamily.semiBold, fontSize: 15 },
  });
};
