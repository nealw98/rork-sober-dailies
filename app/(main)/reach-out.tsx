// Reach Out — "Talk with another alcoholic" (redesign 3.0, blue/secondary tone).
// A flat list of saved program contacts; tap Call or Text to hand off to the OS
// dialer / Messages (tel: / sms:). "Add from contacts" opens the native picker.
// Prototype: frames/hifi-connect-tools.jsx (ScreenCallAnother). Local-first
// store: hooks/use-contacts-store.ts.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert, TextInput, Modal, Platform } from 'react-native';
import { KeyboardProvider, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Stack, useRouter } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { useContacts, normalizePhone, type Contact } from '@/hooks/use-contacts-store';
import { pickContact } from '@/lib/pickContact';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';


const call = (phone: string) => {
  logEvent('reach_out', { action: 'call' });
  Linking.openURL(`tel:${normalizePhone(phone)}`).catch(() => {});
};
const text = (phone: string) => {
  logEvent('reach_out', { action: 'text' });
  Linking.openURL(`sms:${normalizePhone(phone)}`).catch(() => {});
};

export default function ReachOutScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors, isDark } = useTokens();
  const CO_DARK = colors.steelDark;
  const { contacts, addContact, removeContact } = useContacts();
  const { showActionSheetWithOptions } = useActionSheet();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const canSaveManual = manualName.trim().length > 0 && manualPhone.trim().length > 0;

  const flashAdded = (id: string) => {
    setJustAdded(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(null), 1400);
  };

  const pickFromContacts = async () => {
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
    logEvent('contact_added', { method: 'picker' });
    flashAdded(id);
  };

  const saveManual = () => {
    const name = manualName.trim();
    const phone = manualPhone.trim();
    if (!name || !phone) return;
    const id = addContact({ name, phone });
    setShowManual(false);
    setManualName('');
    setManualPhone('');
    if (id) {
      logEvent('contact_added', { method: 'manual' });
      flashAdded(id);
    } else {
      Alert.alert('Already saved', `${name} is already in your list.`);
    }
  };

  // Add → choose the native picker or manual entry.
  const onAdd = () => {
    showActionSheetWithOptions(
      { title: 'Add a contact', options: ['Choose from Contacts', 'Enter manually', 'Cancel'], cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) pickFromContacts();
        else if (i === 1) setShowManual(true);
      },
    );
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
        <Text style={styles.sub}>Keep connected with the program.</Text>
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

      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <KeyboardProvider>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manualWrap}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowManual(false)} accessibilityLabel="Close" />
            <View style={styles.manualSheet}>
              <View style={styles.manualHead}>
                <Pressable onPress={() => setShowManual(false)} hitSlop={8}><Text style={styles.manualCancel}>Cancel</Text></Pressable>
                <Text style={styles.manualTitle}>New contact</Text>
                <Pressable onPress={saveManual} hitSlop={8} disabled={!canSaveManual}>
                  <Text style={[styles.manualSave, { opacity: canSaveManual ? 1 : 0.4 }]}>Save</Text>
                </Pressable>
              </View>
              <View style={styles.manualBody}>
                <Text style={styles.manualLabel}>NAME</Text>
                <TextInput
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="e.g. Sarah M."
                  placeholderTextColor={c.textMuted}
                  style={styles.manualInput}
                  autoFocus
                  returnKeyType="next"
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                />
                <Text style={[styles.manualLabel, { marginTop: 16 }]}>PHONE</Text>
                <TextInput
                  value={manualPhone}
                  onChangeText={setManualPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={c.textMuted}
                  style={styles.manualInput}
                  keyboardType="phone-pad"
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </KeyboardProvider>
      </Modal>
    </SafeAreaView>
  );
}

function ContactRow({ ct, highlight, onPress }: { ct: Contact; highlight: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
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

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const CO = colors.steel;           // Steel Navy — Reach Out tone (people & connection)
  const CO_SOFT = colors.steelSoft;
  const CO_DARK = colors.steelDark;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
  sub: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 3 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
  rowHighlight: { backgroundColor: CO_SOFT, borderColor: CO },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.display, fontSize: 18, color: CO_DARK, letterSpacing: -0.3 },
  rowName: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text, letterSpacing: -0.2 },
  rowPhone: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: CO_DARK },

  manualWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: isDark ? c.overlay : 'rgba(0,0,0,0.35)' },
  manualSheet: { backgroundColor: isDark ? c.surface : c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 28 },
  manualHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  manualCancel: { fontFamily: fontFamily.regular, fontSize: 16, color: c.textMuted },
  manualTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
  manualSave: { fontFamily: fontFamily.bold, fontSize: 16, color: CO_DARK },
  manualBody: { paddingHorizontal: 20, paddingTop: 8 },
  manualLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1, color: c.textMuted, marginBottom: 8 },
  manualInput: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: fontFamily.regular, color: c.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : c.surface },

  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
  emptyMedallion: { width: 38, height: 38, borderRadius: 19, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
  });
};
