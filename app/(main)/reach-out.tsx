// Reach Out — "Talk with another alcoholic" (redesign 3.0, blue/secondary tone).
// A flat list of saved program contacts; tap Call or Text to hand off to the OS
// dialer / Messages (tel: / sms:). "Add from contacts" opens the native picker.
// Prototype: frames/hifi-connect-tools.jsx (ScreenCallAnother). Local-first
// store: hooks/use-contacts-store.ts.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Stack, useRouter } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useContacts, normalizePhone, type Contact } from '@/hooks/use-contacts-store';
import { pickContact } from '@/lib/pickContact';
import { colors, fontFamily, getSemanticColors, shadows } from '@/constants/designTokens';

const c = getSemanticColors('light');
const CO = colors.secondary;       // blue — Reach Out tone
const CO_SOFT = colors.secondarySoft;
const CO_DARK = colors.secondaryDark;

const call = (phone: string) => Linking.openURL(`tel:${normalizePhone(phone)}`).catch(() => {});
const text = (phone: string) => Linking.openURL(`sms:${normalizePhone(phone)}`).catch(() => {});

export default function ReachOutScreen() {
  const router = useRouter();
  const { contacts, addContact, removeContact } = useContacts();
  const { showActionSheetWithOptions } = useActionSheet();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onAdd = async () => {
    const picked = await pickContact();
    if (!picked) return; // cancelled / unavailable
    if (!picked.phone) {
      Alert.alert('No phone number', `${picked.name} doesn't have a phone number to call or text.`);
      return;
    }
    const id = addContact(picked);
    if (!id) {
      Alert.alert('Already saved', `${picked.name} is already in your list.`);
      return;
    }
    setJustAdded(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(null), 1400);
  };

  // Tap a contact → bottom action sheet: Call / Text / Delete.
  const onPressContact = (ct: Contact) => {
    const options = ['Call', 'Text', 'Delete', 'Cancel'];
    showActionSheetWithOptions(
      {
        title: ct.name,
        message: ct.phone || undefined,
        options,
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (i) => {
        if (i === 0) call(ct.phone);
        else if (i === 1) text(ct.phone);
        else if (i === 2) removeContact(ct.id);
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Talk with another alcoholic</Text>
        <Text style={styles.sub}>Reach out — a call or a text both count.</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {contacts.length > 0 ? (
          <>
            {contacts.map((ct) => (
              <ContactRow key={ct.id} ct={ct} highlight={justAdded === ct.id} onPress={() => onPressContact(ct)} />
            ))}
            <Pressable style={styles.addBtn} onPress={onAdd}>
              <Plus size={16} color={CO_DARK} strokeWidth={2.2} />
              <Text style={styles.addBtnText}>Add from contacts</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.emptyCard} onPress={onAdd}>
            <View style={styles.emptyMedallion}><Plus size={19} color={CO_DARK} strokeWidth={2.2} /></View>
            <View style={styles.flex}>
              <Text style={styles.emptyTitle}>Add a contact</Text>
              <Text style={styles.emptySub}>Save someone you can call or text when you need to reach out.</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactRow({ ct, highlight, onPress }: { ct: Contact; highlight: boolean; onPress: () => void }) {
  const initial = ct.name.trim()[0]?.toUpperCase() || '?';
  return (
    <Pressable
      style={[styles.row, highlight && styles.rowHighlight]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ct.name}. Call, text, or delete`}
    >
      <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>{ct.name}</Text>
        {!!ct.phone && <Text style={styles.rowPhone} numberOfLines={1}>{ct.phone}</Text>}
      </View>
      <ChevronRight size={18} color={c.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm },
  rowHighlight: { backgroundColor: CO_SOFT, borderColor: CO },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.display, fontSize: 18, color: CO_DARK, letterSpacing: -0.3 },
  rowName: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2 },
  rowPhone: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: CO_DARK },

  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  emptyMedallion: { width: 38, height: 38, borderRadius: 19, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
});
