// Invite Friends — word-of-mouth flow (rose tone: part of the Pass It On family).
// Build the invite list through PERMISSIONLESS system pickers: on iOS the
// multi-select CNContactPickerViewController (local module
// modules/contact-multi-picker — check off several friends in one session);
// elsewhere the single-contact picker (the Reach Out pattern). No contacts
// permission is ever requested, so iOS 18's confusing "Select Contacts /
// Share All" sheet never appears and there's no double-selection. Each added
// friend gets an individually addressed text (in-app composer via expo-sms) —
// never a group text, so the sender's recovery is only ever disclosed one
// person at a time. Falls back to the OS share sheet when SMS is unavailable
// (iPad / no SIM) or the expo-sms native module isn't in the installed binary.
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { Plus, X } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import { fontFamily, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { logEvent } from '@/lib/analytics';
import { reportInviteSends } from '@/lib/inviteService';
import { getUrl } from '@/lib/storeLinks';
import { presentContactMultiPickerAsync, type PickedPhone } from '@/modules/contact-multi-picker';

const INVITE_MESSAGE = "I've been using Sober Dailies. Give it a try:\n\n" + getUrl();

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

type Invitee = { key: string; name: string; phone: string };

// Prefer a mobile-labeled number (that's where texts land); fall back to the first.
function pickNumber(nums: { number?: string | null; label?: string | null }[]): string {
  const mobile = nums.find((n) => /mobile|iphone|cell/i.test(n.label ?? ''));
  return (mobile ?? nums[0])?.number ?? '';
}
function bestPhone(ct: Contacts.Contact): string {
  return pickNumber(ct.phoneNumbers ?? []);
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
  const { c, colors } = useTokens();
  const insets = useSafeAreaInsets();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [sending, setSending] = useState(false);

  const mergeInvitees = (picked: { name: string; phones: PickedPhone[] }[]) => {
    setInvitees((prev) => {
      const next = [...prev];
      for (const p of picked) {
        const phone = pickNumber(p.phones);
        if (!phone) continue;
        const key = phone.replace(/\D/g, '') || p.name;
        if (!next.some((i) => i.key === key)) next.push({ key, name: p.name || 'Contact', phone });
      }
      return next;
    });
  };

  const addFriend = async () => {
    // iOS: the system MULTI-select picker (local native module) — check off
    // several friends in one session, still zero contacts permission. null
    // means the module isn't available (Android, or an installed binary that
    // predates it) — fall back to the single-contact picker.
    const multi = await presentContactMultiPickerAsync();
    if (multi) {
      if (multi.length === 0) return; // cancelled
      mergeInvitees(multi.map((m) => ({ name: m.name.trim(), phones: m.phoneNumbers })));
      logEvent('invite_friends', { action: 'contacts_added', count: multi.length });
      return;
    }
    try {
      const ct = await Contacts.presentContactPickerAsync();
      if (!ct) return; // cancelled
      const name = (ct.name || [ct.firstName, ct.lastName].filter(Boolean).join(' ') || 'Contact').trim();
      if (!bestPhone(ct)) {
        Alert.alert('No phone number', `${name} doesn’t have a phone number to text.`);
        return;
      }
      mergeInvitees([{ name, phones: (ct.phoneNumbers ?? []).map((n) => ({ number: n.number ?? '', label: n.label ?? '' })) }]);
      logEvent('invite_friends', { action: 'contact_added' });
    } catch (e) {
      console.warn('[invite] contact pick failed', e);
    }
  };

  const remove = (key: string) => setInvitees((prev) => prev.filter((p) => p.key !== key));

  // One composer per person, in sequence. Cancelling a composer skips that
  // person and moves on. The short pause lets each iOS modal finish dismissing
  // before the next presents.
  const sendInvites = async () => {
    if (invitees.length === 0 || sending) return;
    const SMS = getSMS();
    if (!SMS || !(await SMS.isAvailableAsync().catch(() => false))) {
      shareFallback();
      return;
    }
    setSending(true);
    let sent = 0;
    const sentPhones: string[] = [];
    try {
      for (let i = 0; i < invitees.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 400));
        const { result } = await SMS.sendSMSAsync([invitees[i].phone], INVITE_MESSAGE);
        logEvent('invite_friends', { action: 'composer_closed', result });
        if (result === 'sent' || result === 'unknown') {
          sent++; // Android can't confirm — count as attempted
          sentPhones.push(invitees[i].phone);
        }
      }
    } catch (e) {
      console.warn('[invite] send failed', e);
    }
    setSending(false);
    logEvent('invite_friends', { action: 'batch_done', selected: invitees.length, sent });
    // Best-effort unique-send tally (numbers are hashed on-device; see
    // lib/inviteService.ts). Fire-and-forget — never delays the thank-you.
    if (sentPhones.length > 0) reportInviteSends(sentPhones);
    setInvitees([]);
    if (sent > 0) {
      Alert.alert(
        'Thank you',
        sent === 1 ? 'Your invite is on its way.' : `Your ${sent} invites are on their way.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    }
  };

  const count = invitees.length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Share the app</Text>
        <Text style={styles.sub}>
          A personal text means more than a link. Add the people you want to invite — nothing is
          sent without you tapping Send.
        </Text>
      </View>

      <FlatList
        data={invitees}
        keyExtractor={(p) => p.key}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]?.toUpperCase() || '?'}</Text></View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rowPhone} numberOfLines={1}>{item.phone}</Text>
            </View>
            <Pressable
              onPress={() => remove(item.key)}
              hitSlop={10}
              style={styles.removeBtn}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
            >
              <X size={15} color={c.textMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <>
            <Pressable style={styles.addBtn} onPress={addFriend} accessibilityRole="button" accessibilityLabel="Add from contacts">
              <Plus size={16} color={colors.roseDark} strokeWidth={2.2} />
              <Text style={styles.addBtnText}>Add from contacts</Text>
            </Pressable>
            {/* The other path: gifts (3 free months, earned with membership). */}
            <Pressable
              style={styles.giftLink}
              onPress={() => router.push('/(main)/pass-it-on')}
              accessibilityRole="button"
            >
              <Text style={styles.giftLinkText}>Want to give someone 3 free months? Pass It On</Text>
            </Pressable>
          </>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          style={[styles.sendBtn, (count === 0 || sending) && styles.sendBtnDisabled]}
          disabled={count === 0 || sending}
          onPress={sendInvites}
          accessibilityRole="button"
          accessibilityLabel={count <= 1 ? 'Send invite' : `Send ${count} invites`}
        >
          <Text style={styles.sendBtnText}>
            {sending ? 'Sending…' : count <= 1 ? 'Send invite' : `Send ${count} invites`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const CO = colors.rose;            // Rose — the Pass It On family
  const CO_SOFT = colors.roseSoft;
  const CO_DARK = colors.roseDark;
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 18 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    sub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textMuted, marginTop: 3 },

    listContent: { paddingHorizontal: 16, paddingTop: 4 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, ...shadows.sm, ...darkCard },
    rowBody: { flex: 1, minWidth: 0 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: CO_SOFT, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fontFamily.display, fontSize: 17, color: CO_DARK, letterSpacing: -0.3 },
    rowName: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: c.text, letterSpacing: -0.2 },
    rowPhone: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
    removeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: CO + '77', borderStyle: 'dashed' },
    addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: CO_DARK },
    giftLink: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
    giftLinkText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: CO_DARK },

    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    sendBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', backgroundColor: CO_DARK, ...shadows.sm },
    sendBtnDisabled: { opacity: 0.35 },
    sendBtnText: { fontFamily: fontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: -0.2 },
  });
};
