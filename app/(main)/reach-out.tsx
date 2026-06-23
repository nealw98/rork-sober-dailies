// Reach Out — "Call another alcoholic" (redesign 3.0, blue/secondary tone).
// A flat list of saved program contacts; tap Call or Text to hand off to the OS
// dialer / Messages (tel: / sms:). "Add from contacts" opens the native picker.
// Prototype: frames/hifi-connect-tools.jsx (ScreenCallAnother). Local-first
// store: hooks/use-contacts-store.ts.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { Plus, Phone, MessageSquareText, Trash2 } from 'lucide-react-native';
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

  const onRemove = (ct: Contact) => removeContact(ct.id);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Call another alcoholic</Text>
        <Text style={styles.sub}>Reach out — a call or a text both count.</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {contacts.length > 0 ? (
          <>
            {contacts.map((ct) => (
              <ContactRow key={ct.id} ct={ct} highlight={justAdded === ct.id} onRemove={() => onRemove(ct)} />
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

function ContactRow({ ct, highlight, onRemove }: { ct: Contact; highlight: boolean; onRemove: () => void }) {
  const initial = ct.name.trim()[0]?.toUpperCase() || '?';
  const renderRightActions = () => (
    <Pressable style={styles.deleteAction} onPress={onRemove} accessibilityLabel={`Delete ${ct.name}`}>
      <Trash2 size={20} color="#fff" strokeWidth={2} />
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );
  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false} containerStyle={styles.swipeWrap}>
      <View style={[styles.row, highlight && styles.rowHighlight]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={styles.flex}>
          <Text style={styles.rowName} numberOfLines={1}>{ct.name}</Text>
          {!!ct.phone && <Text style={styles.rowPhone} numberOfLines={1}>{ct.phone}</Text>}
        </View>
        <Pressable style={styles.textBtn} hitSlop={6} onPress={() => text(ct.phone)} accessibilityLabel={`Text ${ct.name}`}>
          <MessageSquareText size={18} color={CO_DARK} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.callBtn} hitSlop={6} onPress={() => call(ct.phone)} accessibilityLabel={`Call ${ct.name}`}>
          <Phone size={18} color="#fff" strokeWidth={2} />
        </Pressable>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  swipeWrap: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm },
  rowHighlight: { backgroundColor: CO_SOFT, borderColor: CO },
  deleteAction: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#E5544B', borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  deleteText: { color: '#fff', fontFamily: fontFamily.semiBold, fontSize: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.display, fontSize: 18, color: CO_DARK, letterSpacing: -0.3 },
  rowName: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2 },
  rowPhone: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
  textBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: CO, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CO, alignItems: 'center', justifyContent: 'center' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: CO_DARK },

  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  emptyMedallion: { width: 38, height: 38, borderRadius: 19, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
});
