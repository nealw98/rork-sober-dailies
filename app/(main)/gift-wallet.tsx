// Gifts to give — the Pass It On wallet (Pass It On Handoff 2, decided design:
// LEDGER, not chip grid). One row per code with a mini 3-month medallion.
// Cumulative counter: available-of-all-ever-purchased — buying more appends to
// one pool, no batches. Two states (available / redeemed + date). Sharing is the
// single action (the native share sheet includes Copy). Each available code also
// carries an optional PRIVATE note — a local-only reminder of who it went to
// (Neal's addition; never synced/shared). Running out is the success state.
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Share, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Share as ShareIcon, CircleCheck, HelpCircle } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import GiftGlyph from '@/components/GiftGlyph';
import GiftInfoSheet from '@/components/GiftInfoSheet';
import { fontFamily, shadows, colors as lightColors, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { useGiftWallet, type GiftCode } from '@/hooks/use-gift-wallet';
import { GIFT_MONTHS } from '@/lib/giftProducts';
import { getUrl } from '@/lib/storeLinks';
import { logEvent } from '@/lib/analytics';

const ROSE_FILL = lightColors.rose; // CTA keeps full chroma in both modes

const redeemedLabel = (iso?: string) => {
  if (!iso) return 'Redeemed';
  const d = new Date(iso);
  return `Redeemed ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// 32px mini 3-month medallion — keeps "what you're giving" visible at 10-pack scale.
function MiniMedallion({ dim }: { dim?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  return (
    <View style={[styles.medallion, dim && { backgroundColor: c.divider, borderColor: c.border }]}>
      <Text style={[styles.medallionNum, dim && { color: c.textMuted }]}>3</Text>
      <Text style={[styles.medallionUnit, dim && { color: c.textMuted }]}>MO</Text>
    </View>
  );
}

function LedgerRow({ item, last, onShare, onEditNote }: {
  item: GiftCode; last: boolean; onShare?: () => void; onEditNote?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const done = item.status === 'redeemed';
  return (
    <View style={[styles.row, !last && styles.rowDivider, done && { opacity: 0.68 }]}>
      <MiniMedallion dim={done} />
      <View style={styles.rowBody}>
        <Text style={[styles.code, done && { color: c.textMuted }]} numberOfLines={1}>
          {item.code}
        </Text>
        {done ? (
          item.note ? <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text> : null
        ) : (
          <TouchableOpacity onPress={onEditNote} activeOpacity={0.6} hitSlop={{ top: 4, bottom: 6 }} accessibilityRole="button" accessibilityLabel={item.note ? 'Edit note' : 'Add a note'}>
            <Text style={item.note ? styles.noteText : styles.notePlaceholder} numberOfLines={1}>
              {item.note ? item.note : '+ Add a note'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.rowActions}>
        {done ? (
          <View style={styles.redeemedTag}>
            <CircleCheck size={15} color={colors.primary} />
            <Text style={styles.redeemedText}>{redeemedLabel(item.redeemedAt)}</Text>
          </View>
        ) : item.sharedAt ? (
          // Already handed out: grayed pill, still tappable — the parent asks
          // before letting the same code go to a second person.
          <TouchableOpacity style={[styles.sharePill, styles.sharedPill]} onPress={onShare} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Code already shared. Share again">
            <CircleCheck size={15} color={c.textMuted} strokeWidth={1.9} />
            <Text style={[styles.sharePillText, { color: c.textMuted }]}>Shared</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.sharePill} onPress={onShare} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share code">
            <ShareIcon size={15} color={colors.roseDark} strokeWidth={1.9} />
            <Text style={styles.sharePillText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Private note editor — a bottom sheet with a single text field. The note is a
// personal memory aid (who a code is for); it lives only in local storage.
function NoteSheet({ initial, onSave, onCancel }: {
  initial: string; onSave: (text: string) => void; onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();
  const [text, setText] = useState(initial);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <Pressable style={styles.sheetScrim} onPress={onCancel} />
        <View style={styles.noteSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.noteSheetTitle}>Who’s this code for?</Text>
          <Text style={styles.noteSheetSub}>A private note, just for you — it stays on this device.</Text>
          <TextInput
            style={styles.noteInput}
            value={text}
            onChangeText={setText}
            placeholder="e.g. John — Tuesday men’s group"
            placeholderTextColor={c.textMuted}
            autoFocus
            returnKeyType="done"
            maxLength={80}
            onSubmitEditing={() => onSave(text)}
          />
          <TouchableOpacity style={styles.cta} onPress={() => onSave(text)} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.ctaText}>Save note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quietBtn} onPress={onCancel} activeOpacity={0.6} accessibilityRole="button">
            <Text style={styles.quietBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function GiftWalletScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const { codes, unshared, sharedPending, redeemed, setNote, markShared, syncWallet } = useGiftWallet();

  // Redeemed states flip on the recipient's device — refresh whenever this
  // screen comes into focus so the giver sees "Redeemed" without restarting.
  useFocusEffect(useCallback(() => { syncWallet(); }, [syncWallet]));

  const [editing, setEditing] = useState<GiftCode | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const saveNote = (text: string) => {
    if (!editing) return;
    const had = !!editing.note;
    setNote(editing.code, text);
    setEditing(null);
    const has = !!text.trim();
    logEvent('gift_code_note_set', { cleared: had && !has });
    showToast(has ? 'Note saved' : had ? 'Note removed' : 'Note saved');
  };

  // Sharing opens the native sheet (Copy lives there). When the sheet reports
  // the share actually went out, the code is marked "Shared" locally so the
  // same code isn't handed to two people by accident. The link lands on
  // soberdailies.com/get?code=<code>, which shows the code + the right store
  // button for the recipient's device.
  const shareCode = async (code: string) => {
    logEvent('gift_code_share_opened');
    try {
      const result = await Share.share({
        message:
          `Three months of Sober Dailies, on me — everything in the app, nothing to pay. ` +
          `Get the app and enter this code: ${code}\n\n${getUrl(code)}`,
      });
      // Android can't distinguish send from dismiss (always sharedAction) —
      // over-marking errs on the safe side for the double-share concern.
      if (result.action === Share.sharedAction) markShared(code);
    } catch {}
  };

  // A code that's already been shared asks before going out again.
  const shareCodeGuarded = (item: GiftCode) => {
    if (!item.sharedAt) {
      shareCode(item.code);
      return;
    }
    const when = new Date(item.sharedAt);
    const label = Number.isNaN(when.getTime())
      ? 'already been shared'
      : `already been shared (${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    Alert.alert(
      'Share this code again?',
      `This code has ${label}. If someone already has it, only the first person to redeem it gets the months.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share again', onPress: () => shareCode(item.code) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton onPress={() => router.back()} />
          <TouchableOpacity
            style={styles.howBtn}
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="How Pass It On works"
          >
            <HelpCircle size={15} color={colors.roseDark} strokeWidth={2} />
            <Text style={styles.howBtnText}>Learn more</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.eyebrow}>PASS IT ON</Text>
        <Text style={styles.title}>Gifts to give</Text>
        <Text style={styles.headerSub}>Carry the message — one code at a time.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {codes.length === 0 ? (
          /* never-bought state — the Give row / tile is the entry */
          <View style={styles.empty}>
            <View style={styles.emptyCoin}>
              <GiftGlyph size={30} color={colors.roseDark} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>No gifts yet</Text>
            <Text style={styles.emptyBody}>
              When you buy gift codes, they’ll show up here — each one ready to share, with a note
              for who it’s for and a check when it’s redeemed.
            </Text>
            <TouchableOpacity style={[styles.cta, { alignSelf: 'stretch' }]} onPress={() => router.replace('/(main)/pass-it-on')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.ctaText}>Give Sober Dailies</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Counter = months still UNSHARED ("to give" — a shared code is in
                flight, not givable again). Running out is the success state. */}
            <View style={styles.counterCard}>
              <View style={styles.counterCoin}>
                <GiftGlyph size={24} color={colors.roseDark} strokeWidth={1.7} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.counterNumRow}>
                  <Text style={styles.counterNum}>{unshared.length * GIFT_MONTHS}</Text>
                  <Text style={styles.counterOf}>months to give</Text>
                </View>
                <Text style={styles.counterSub}>
                  {unshared.length > 0
                    ? 'Each code unlocks 3 months'
                    : sharedPending.length > 0
                      ? 'All your codes are out — watch for redemptions.'
                      : 'Every gift found a home.'}
                </Text>
              </View>
            </View>

            {unshared.length > 0 && (
              <>
                <Text style={styles.groupLabel}>READY TO GIVE</Text>
                <View style={styles.card}>
                  {unshared.map((item, i) => (
                    <LedgerRow
                      key={item.code}
                      item={item}
                      last={i === unshared.length - 1}
                      onShare={() => shareCodeGuarded(item)}
                      onEditNote={() => setEditing(item)}
                    />
                  ))}
                </View>
              </>
            )}

            {sharedPending.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { marginTop: 18 }]}>SHARED · WAITING TO BE REDEEMED</Text>
                <View style={styles.card}>
                  {sharedPending.map((item, i) => (
                    <LedgerRow
                      key={item.code}
                      item={item}
                      last={i === sharedPending.length - 1}
                      onShare={() => shareCodeGuarded(item)}
                      onEditNote={() => setEditing(item)}
                    />
                  ))}
                </View>
              </>
            )}

            {redeemed.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { marginTop: 18 }]}>RECEIVED</Text>
                <View style={styles.card}>
                  {redeemed.map((item, i) => (
                    <LedgerRow key={item.code} item={item} last={i === redeemed.length - 1} />
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.cta, { marginTop: 20 }]} onPress={() => router.push('/(main)/pass-it-on')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.ctaText}>Give more</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>
              Notes are private to you and stay on this device. A code is live until someone
              redeems it.
            </Text>
          </>
        )}
      </ScrollView>

      {editing && (
        <NoteSheet
          initial={editing.note ?? ''}
          onSave={saveNote}
          onCancel={() => setEditing(null)}
        />
      )}

      <GiftInfoSheet visible={infoVisible} onClose={() => setInfoVisible(false)} />

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    howBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12,
      borderRadius: 999, backgroundColor: colors.roseSoft, borderWidth: 1,
      borderColor: isDark ? 'rgba(217,131,143,0.4)' : '#E3BCC3',
    },
    howBtnText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.roseDark },
    eyebrow: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: colors.roseDark, marginBottom: 4 },
    title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, color: c.text, lineHeight: 29 },
    headerSub: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textMuted, marginTop: 6 },
    scroll: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 48 },

    counterCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18,
      borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      ...shadows.sm, marginBottom: 16,
    },
    counterCoin: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    counterNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    counterNum: { fontFamily: fontFamily.displayBold, fontSize: 32, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
    counterOf: { fontFamily: fontFamily.medium, fontSize: 14, color: c.textMuted },
    counterSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 4 },

    groupLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.2, color: c.textMuted, marginHorizontal: 6, marginBottom: 8 },
    card: { borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...shadows.sm },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
    rowBody: { flex: 1, minWidth: 0 },
    medallion: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.roseSoft,
      borderWidth: 1.5, borderColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    },
    medallionNum: { fontFamily: fontFamily.displayBold, fontSize: 11.5, lineHeight: 12, color: colors.roseDark },
    medallionUnit: { fontFamily: fontFamily.bold, fontSize: 5.5, letterSpacing: 0.6, lineHeight: 7, color: colors.roseDark },
    code: { fontFamily: fontFamily.semiBold, fontSize: 15, letterSpacing: 1.5, color: c.text, fontVariant: ['tabular-nums'] },
    noteText: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 3 },
    notePlaceholder: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.roseDark, marginTop: 3 },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sharePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: colors.roseSoft, borderWidth: 1,
      borderColor: isDark ? 'rgba(217,131,143,0.4)' : '#E3BCC3',
    },
    sharePillText: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.roseDark },
    sharedPill: { backgroundColor: 'transparent', borderColor: c.border },
    // Same pill geometry as Share/Shared — the control reads as ONE thing in
    // three states: Share (rose) → Shared (gray outline) → Redeemed (teal).
    redeemedTag: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: colors.primarySoft, borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : colors.primary + '55',
    },
    redeemedText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.primaryDark },

    cta: {
      width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: ROSE_FILL,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: ROSE_FILL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    ctaText: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
    footnote: { fontFamily: fontFamily.regular, fontSize: 11.5, lineHeight: 18, color: c.textMuted, textAlign: 'center', marginTop: 12, marginHorizontal: 6 },

    empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
    emptyCoin: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontFamily: fontFamily.displayBold, fontSize: 20, color: c.text, marginTop: 16 },
    emptyBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 21, color: c.textSecondary, textAlign: 'center', maxWidth: 270, marginTop: 8, marginBottom: 22 },

    toast: {
      position: 'absolute', bottom: 64, alignSelf: 'center',
      backgroundColor: isDark ? c.surfaceRaised : c.text, paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 999, ...shadows.lg,
    },
    toastText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: isDark ? c.text : '#FFFFFF' },

    // Note editor bottom sheet
    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    sheetScrim: { flex: 1, backgroundColor: c.overlay },
    noteSheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 10, paddingHorizontal: 24, paddingBottom: 32, ...shadows.lg,
    },
    sheetHandle: { width: 40, height: 4.5, borderRadius: 3, backgroundColor: c.divider, alignSelf: 'center', marginBottom: 18 },
    noteSheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 20, color: c.text, textAlign: 'center' },
    noteSheetSub: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: c.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 18 },
    noteInput: {
      fontFamily: fontFamily.regular, fontSize: 15, color: c.text,
      backgroundColor: isDark ? c.surfaceRaised : c.background, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    },
    quietBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    quietBtnText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.textMuted },
  });
};
