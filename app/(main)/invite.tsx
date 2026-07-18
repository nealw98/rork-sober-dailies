// Invite Friends — word-of-mouth flow (Steel Navy tone: people & connection).
// Check off contacts from the device address book, then send each one an
// individually addressed text (in-app composer via expo-sms) with the
// soberdailies.com/get link. Individual sends — never a group text — so the
// sender's recovery is only ever disclosed one person at a time. Falls back to
// the OS share sheet when contacts permission is denied or SMS is unavailable
// (iPad / no SIM).
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput, Share, Linking, Alert, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { Check, Search } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { getUrl } from '@/lib/storeLinks';

const INVITE_MESSAGE = 'Sober Dailies keeps me sober one day at a time. Thought of you:\n\n' + getUrl();

// expo-sms is a native module that installed clients built before it was added
// don't contain — a static import crashes the route at load in those clients
// (and this screen can reach them over OTA). Resolve it lazily; when it's
// missing, sends fall back to the share sheet.
let smsModule: typeof import('expo-sms') | null | undefined;
function getSMS() {
  if (smsModule === undefined) {
    try {
      smsModule = require('expo-sms');
    } catch {
      smsModule = null;
    }
  }
  return smsModule;
}

type InviteContact = { id: string; name: string; phone: string };

// Prefer a mobile-labeled number (that's where texts land); fall back to the first.
function bestPhone(ct: Contacts.Contact): string {
  const nums = ct.phoneNumbers ?? [];
  const mobile = nums.find((n) => /mobile|iphone|cell/i.test(n.label ?? ''));
  return (mobile ?? nums[0])?.number ?? '';
}

function displayName(ct: Contacts.Contact): string {
  return (ct.name || [ct.firstName, ct.lastName].filter(Boolean).join(' ')).trim();
}

const shareFallback = async () => {
  logEvent('invite_friends', { action: 'share_sheet' });
  try {
    await Share.share({ message: INVITE_MESSAGE });
  } catch {}
};

export default function InviteScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const insets = useSafeAreaInsets();

  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [contacts, setContacts] = useState<InviteContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      logEvent('invite_friends', { action: 'opened' });
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        logEvent('invite_friends', { action: 'permission_denied' });
        setPermission('denied');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const list: InviteContact[] = [];
      const seen = new Set<string>();
      for (const ct of data) {
        const name = displayName(ct);
        const phone = bestPhone(ct);
        if (!ct.id || !name || !phone) continue;
        const key = phone.replace(/\D/g, '');
        if (seen.has(key)) continue; // linked/duplicate cards for the same number
        seen.add(key);
        list.push({ id: ct.id, name, phone });
      }
      setContacts(list);
      setPermission('granted');
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((ct) => ct.name.toLowerCase().includes(q));
  }, [contacts, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // One composer per person, in sequence. Cancelling a composer skips that
  // person and moves on. The short pause lets each iOS modal finish dismissing
  // before the next presents.
  const sendInvites = async () => {
    const picked = contacts.filter((ct) => selected.has(ct.id));
    if (picked.length === 0 || sending) return;
    const SMS = getSMS();
    if (!SMS || !(await SMS.isAvailableAsync().catch(() => false))) {
      shareFallback();
      return;
    }
    setSending(true);
    let sent = 0;
    try {
      for (let i = 0; i < picked.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 400));
        const { result } = await SMS.sendSMSAsync([picked[i].phone], INVITE_MESSAGE);
        logEvent('invite_friends', { action: 'composer_closed', result });
        if (result === 'sent' || result === 'unknown') sent++; // Android can't confirm — count as attempted
      }
    } catch (e) {
      console.warn('[invite] send failed', e);
    }
    setSending(false);
    logEvent('invite_friends', { action: 'batch_done', selected: picked.length, sent });
    setSelected(new Set());
    if (sent > 0) {
      Alert.alert(
        'Thank you',
        sent === 1 ? 'Your invite is on its way.' : `Your ${sent} invites are on their way.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    }
  };

  const count = selected.size;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Invite friends</Text>
        <Text style={styles.sub}>A personal text means more than a link. Choose who to invite.</Text>
      </View>

      {permission === 'denied' ? (
        <View style={styles.deniedWrap}>
          <View style={styles.deniedCard}>
            <Text style={styles.deniedTitle}>Contacts access is off</Text>
            <Text style={styles.deniedSub}>
              Allow contacts access to pick friends from your list, or use the share sheet instead.
            </Text>
            <Pressable style={styles.deniedBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.deniedBtnText}>Open Settings</Text>
            </Pressable>
            <Pressable style={styles.deniedGhostBtn} onPress={shareFallback}>
              <Text style={styles.deniedGhostText}>Use the share sheet</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Search size={16} color={c.textMuted} strokeWidth={2.2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search contacts"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(ct) => ct.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              permission === 'granted' ? (
                <Text style={styles.emptyText}>
                  {query ? 'No contacts match your search.' : 'No contacts with phone numbers found.'}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <ContactRow ct={item} checked={selected.has(item.id)} onPress={() => toggle(item.id)} />
            )}
          />

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <Pressable
              style={[styles.sendBtn, (count === 0 || sending) && styles.sendBtnDisabled]}
              disabled={count === 0 || sending}
              onPress={sendInvites}
              accessibilityRole="button"
              accessibilityLabel={count === 0 ? 'Send invites' : `Send ${count} invites`}
            >
              <Text style={styles.sendBtnText}>
                {sending ? 'Sending…' : count <= 1 ? 'Send invite' : `Send ${count} invites`}
              </Text>
            </Pressable>
            <Pressable onPress={shareFallback} hitSlop={8} style={styles.altShare}>
              <Text style={styles.altShareText}>Prefer another app? Open the share sheet</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function ContactRow({ ct, checked, onPress }: { ct: InviteContact; checked: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const initial = ct.name[0]?.toUpperCase() || '?';
  return (
    <Pressable
      style={[styles.row, checked && styles.rowChecked]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={ct.name}
    >
      <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{ct.name}</Text>
        <Text style={styles.rowPhone} numberOfLines={1}>{ct.phone}</Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={14} color="#fff" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const CO = colors.steel;           // Steel Navy — people & connection
  const CO_SOFT = colors.steelSoft;
  const CO_DARK = colors.steelDark;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 18 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    sub: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, marginTop: 3 },

    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : c.surface },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: fontFamily.regular, color: c.text },

    listContent: { paddingHorizontal: 16, paddingTop: 4 },
    emptyText: { fontFamily: fontFamily.regular, fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 32 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
    rowChecked: { backgroundColor: CO_SOFT, borderColor: CO },
    rowBody: { flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fontFamily.display, fontSize: 17, color: CO_DARK, letterSpacing: -0.3 },
    rowName: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: c.text, letterSpacing: -0.2 },
    rowPhone: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff' },
    checkboxChecked: { backgroundColor: CO_DARK, borderColor: CO_DARK },

    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    sendBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', backgroundColor: CO_DARK, ...shadows.sm },
    sendBtnDisabled: { opacity: 0.35 },
    sendBtnText: { fontFamily: fontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: -0.2 },
    altShare: { alignItems: 'center', marginTop: 10 },
    altShareText: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted },

    deniedWrap: { flex: 1, paddingHorizontal: 16 },
    deniedCard: { padding: 18, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
    deniedTitle: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
    deniedSub: { fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textMuted, marginTop: 4, lineHeight: 19 },
    deniedBtn: { marginTop: 14, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: CO_DARK },
    deniedBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: '#fff' },
    deniedGhostBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: CO + '77' },
    deniedGhostText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: CO_DARK },
  });
};
