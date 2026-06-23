// Spot Check Inventory — "Watch For → Strive For" in-the-moment tool
// (redesign 3.0). Per the prototype (hifi-tools-four.jsx SpotCheckEditor):
// name the situation, tap what's driving it (6 core defects up front, "Show
// all 18" reveals the rest), and see the on-the-beam counterpart to strive
// for. Saving writes a record to AsyncStorage (spot_check_inventories, the
// existing local-first shape) and, when opened from a Today daily, checks it
// off. History moves to the deferred Journey "Notebook".
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useDailies } from '@/hooks/use-dailies-store';
import { ToolHeader, ToolIntro, TOOLS } from '@/components/ToolScreen';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';
import { SPOT_PAIRS } from '@/constants/spotCheckPairs';

const c = getSemanticColors('light');
const tool = TOOLS.spotcheck;
const ON = { ink: colors.primary, soft: colors.primarySoft, dark: colors.primaryDark };

const INVENTORY_STORAGE_KEY = 'spot_check_inventories';

export default function InventoryScreen() {
  const router = useRouter();
  const { dailyId } = useLocalSearchParams<{ dailyId?: string }>();
  const dailies = useDailies();

  const [situation, setSituation] = useState('');
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const visible = showAll ? SPOT_PAIRS : SPOT_PAIRS.filter((p) => p.core || sel[p.id]);
  const chosen = SPOT_PAIRS.filter((p) => sel[p.id]);
  const dirty = situation.trim() !== '' || chosen.length > 0;

  const commit = async () => {
    Keyboard.dismiss();
    if (dirty) {
      try {
        const selections: Record<string, 'lookFor'> = {};
        chosen.forEach((p) => { selections[p.id] = 'lookFor'; });
        const record = { id: Date.now().toString(), ts: new Date().toISOString(), situation, selections };
        const stored = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
        const records = stored ? JSON.parse(stored) : [];
        records.unshift(record);
        await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(records));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (dailyId) dailies.markDone(dailyId);
      } catch (error) {
        console.error('Error saving spot check:', error);
      }
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
        <ToolIntro tool={tool}>Pause. Breathe. Name what&rsquo;s driving it — then turn it around.</ToolIntro>

        <View style={styles.body}>
          {/* Situation */}
          <Text style={styles.heading}>What&rsquo;s disturbing you?</Text>
          <TextInput
            value={situation}
            onChangeText={setSituation}
            placeholder="What happened? Name the situation."
            placeholderTextColor={c.textMuted}
            style={styles.situation}
            multiline
          />

          {/* Off the beam */}
          <View style={styles.offHead}>
            <Text style={styles.heading}>Where am I off the beam?</Text>
            <Text style={styles.subhead}>Tap what&rsquo;s driving this one.</Text>
          </View>

          <View style={styles.chips}>
            {visible.map((p) => {
              const on = !!sel[p.id];
              return (
                <Pressable
                  key={p.id}
                  onPress={() => toggle(p.id)}
                  style={[styles.chip, on ? { backgroundColor: tool.accent, borderColor: tool.accent } : styles.chipOff]}
                >
                  <Text style={[styles.chipText, { color: on ? '#fff' : c.textSecondary }]}>{p.off}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setShowAll((v) => !v)} style={[styles.chip, styles.chipShowAll]}>
              <Text style={[styles.chipText, { color: c.textMuted }]}>{showAll ? 'Show fewer' : 'Show all 18'}</Text>
            </Pressable>
          </View>

          {/* Strive for — the on-the-beam counterpart for each pick */}
          {chosen.length > 0 && (
            <View style={styles.striveCard}>
              <View style={styles.striveHeadRow}>
                <Text style={styles.watchLabel}>WATCH FOR</Text>
                <Text style={styles.striveLabel}>STRIVE FOR</Text>
              </View>
              <View style={styles.striveList}>
                {chosen.map((p) => (
                  <View key={p.id} style={styles.striveRow}>
                    <Text style={styles.striveOff}>{p.off}</Text>
                    <Text style={styles.striveOn}>{p.on}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  body: { paddingHorizontal: 18 },

  heading: { fontFamily: fontFamily.semiBold, fontSize: 17, color: c.text, letterSpacing: -0.2 },
  subhead: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },

  situation: {
    marginTop: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    minHeight: 60,
    fontFamily: fontFamily.regular,
    fontSize: 16.5,
    lineHeight: 23,
    color: c.text,
  },

  offHead: { marginTop: 20, marginBottom: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5 },
  chipOff: { backgroundColor: colors.white, borderColor: c.border },
  chipShowAll: { backgroundColor: 'transparent', borderColor: c.textMuted + '66', borderStyle: 'dashed' },
  chipText: { fontFamily: fontFamily.semiBold, fontSize: 14 },

  striveCard: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 16,
    backgroundColor: ON.soft,
    borderWidth: 1,
    borderColor: ON.ink + '33',
  },
  striveHeadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  watchLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: tool.dark, flex: 1 },
  striveLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.1, color: ON.dark, flex: 1, textAlign: 'right' },
  striveList: { gap: 11 },
  striveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  striveOff: { fontFamily: fontFamily.semiBold, fontSize: 15, color: tool.dark, flex: 1 },
  striveOn: { fontFamily: fontFamily.semiBoldItalic, fontSize: 15, color: ON.dark, flex: 1, textAlign: 'right' },
});
