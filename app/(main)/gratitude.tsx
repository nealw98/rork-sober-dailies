// Gratitude — clean new-entry composer (redesign 3.0). Per the prototype
// (hifi-tools-four.jsx GratitudeEditor): start blank, "Today I'm grateful
// for…" + fields + "Add another". Saving writes the entry to the gratitude
// store (local-first) and, when opened from a Today daily, checks it off.
// History/Share live in the deferred Journey "Notebook", not in this editor.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Share } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useGratitudeQuote } from '@/hooks/useGratitudeQuote';
import { useDailies } from '@/hooks/use-dailies-store';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { usePane } from '@/components/layout/PaneContext';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { confirmSaved } from '@/lib/savedNotice';

const tool = TOOLS.gratitude;

export default function GratitudeScreen() {
  const router = useRouter();
  // Non-null when this screen renders inside Today's wide-layout pane —
  // "back" there means closing the pane, not popping the navigator.
  const pane = usePane();
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

  // The cursor always moves to the next OPEN item: the first empty field at or
  // after `from` (wrapping to the top), or a new field when every one is
  // filled. A newly added field is focused once it has rendered.
  const inputRefs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);
  const pendingFocus = useRef<number | null>(null);
  const focusNextOpen = (from: number) => {
    if (pendingFocus.current !== null) return; // an add is already in flight (Android can fire submit twice)
    const order = [...vals.keys()].slice(from).concat([...vals.keys()].slice(0, from));
    const open = order.find((i) => vals[i].trim() === '');
    if (open !== undefined) { inputRefs.current[open]?.focus(); return; }
    pendingFocus.current = vals.length;
    setVals((v) => [...v, '']);
  };
  useEffect(() => {
    if (pendingFocus.current === null) return;
    inputRefs.current[pendingFocus.current]?.focus();
    pendingFocus.current = null;
  }, [vals.length]);

  const commit = () => {
    Keyboard.dismiss();
    if (dirty && gratitude) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      gratitude.saveDetailedEntry(items);
      gratitude.completeToday(items);
      logEvent('entry_saved', { type: 'gratitude', item_count: items.length });
      if (dailyId) dailies.markDone(dailyId);
      // Tell them where it went, and let the dialog do the navigating so the
      // Alert is never presented mid-transition. It also fires the one-time
      // backup nudge afterwards, so the two queue instead of stacking.
      confirmSaved(pane?.close);
      return;
    }
    if (pane) pane.close(); else router.back();
  };

  // Share the list as it reads on screen (saved or not) via the system sheet.
  const shareList = async () => {
    if (items.length === 0) return;
    const body = `Today I'm grateful for:\n\n${items.map((it) => `• ${it}`).join('\n')}`;
    try { await Share.share({ message: body }); }
    catch (e) { console.error('Error sharing gratitude list:', e); }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader tool={tool} dirty={dirty} onCommit={commit} onShare={shareList} shareDisabled={items.length === 0} />
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
              ref={(el) => { inputRefs.current[i] = el; }}
              value={val}
              onChangeText={(t) => setVal(i, t)}
              placeholder={i === 0 ? 'e.g., My sobriety' : ''}
              placeholderTextColor={c.textMuted}
              style={[styles.field, i === 0 && val === '' ? styles.fieldItalic : null]}
              multiline
              // Return moves on to the next open item instead of adding a line.
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => focusNextOpen(i + 1)}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          ))}

          <Pressable onPress={() => focusNextOpen(0)} style={styles.addAnother} hitSlop={6}>
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
