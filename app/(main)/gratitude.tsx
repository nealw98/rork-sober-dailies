// Gratitude — clean new-entry composer (redesign 3.0). Per the prototype
// (hifi-tools-four.jsx GratitudeEditor): start blank, "Today I'm grateful
// for…" + fields + "Add another". Saving writes the entry to the gratitude
// store (local-first) and, when opened from a Today daily, checks it off.
// History/Share live in the deferred Journey "Notebook", not in this editor.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useGratitudeStore } from '@/hooks/use-gratitude-store';
import { useDailies } from '@/hooks/use-dailies-store';
import { useGratitudeQuote } from '@/hooks/useGratitudeQuote';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const tool = TOOLS.gratitude;

export default function GratitudeScreen() {
  const router = useRouter();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const gratitude = useGratitudeStore();
  const dailies = useDailies();
  const { formattedQuote, isLoading: isQuoteLoading } = useGratitudeQuote();

  const [vals, setVals] = useState<string[]>(['', '', '']);
  const dirty = vals.some((v) => v.trim() !== '');
  const setVal = (i: number, v: string) => setVals((arr) => arr.map((x, j) => (j === i ? v : x)));

  const commit = () => {
    Keyboard.dismiss();
    const items = vals.map((v) => v.trim()).filter(Boolean);
    if (items.length > 0 && gratitude) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      gratitude.saveDetailedEntry(items);
      gratitude.completeToday(items);
      if (dailyId) dailies.markDone(dailyId);
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader tool={tool} dirty={dirty} onCommit={commit} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {!isQuoteLoading && formattedQuote ? (
          <ToolIntro tool={tool}>{`“${formattedQuote}”`}</ToolIntro>
        ) : (
          <View style={styles.introSpacer} />
        )}

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
            />
          ))}

          <Pressable onPress={() => setVals((v) => [...v, ''])} style={styles.addAnother} hitSlop={6}>
            <Plus size={16} color={tool.dark} strokeWidth={2.4} />
            <Text style={[styles.addAnotherText, { color: tool.dark }]}>Add another</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: 32 },
  introSpacer: { height: 8 },
  body: { paddingHorizontal: 18 },
  heading: { fontFamily: fontFamily.semiBold, fontSize: 17, color: c.text, letterSpacing: -0.2, marginBottom: 16 },
  field: {
    backgroundColor: colors.white,
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
  },
  fieldItalic: { fontFamily: fontFamily.regularItalic },
  addAnother: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 4 },
  addAnotherText: { fontFamily: fontFamily.semiBold, fontSize: 15 },
});
