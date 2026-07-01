// Meetings — the four-function page (redesign 3.0). Per the Meetings handoff
// (Claude Code Update): My meetings (Next-up card + saved list + manual add),
// Find a meeting (Meeting Guide hand-off), Online meetings (in-app browser),
// Meeting readings. My meetings is net-new + manual-add only; Next-up is derived
// from the saved list + the device clock (no extra storage).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Linking, Platform, ActivityIndicator, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { KeyboardModalScope } from '@/components/KeyboardModalScope';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Plus, X, Globe, MapPin, BookOpen, ChevronRight, ExternalLink, ClipboardList, Sparkles, ImagePlus, Camera } from 'lucide-react-native';
import { Image } from 'expo-image';
import BackButton from '@/components/BackButton';
import { useMeetings, nextUpMeeting, whenLabel, formatTime, WEEKDAY_ABBR, type Meeting } from '@/hooks/use-meetings-store';
import { scanMeetingScreenshot } from '@/lib/meetingOcr';
import { parseMeetingGuide, type MeetingDraft } from '@/lib/parseMeetingGuide';
import { colors, fontFamily, getSemanticColors } from '@/constants/designTokens';

const c = getSemanticColors('light');
const MT = colors.steel;          // Steel Navy — Meetings tone
const MT_SOFT = colors.steelSoft;
const MT_DARK = colors.steelDark;
// Meeting Guide (AAWS) is an iOS-only app; Android users get the official site.
const MEETING_GUIDE_URL = Platform.OS === 'android'
  ? 'https://meetingguide.org'
  : 'https://apps.apple.com/app/meeting-guide/id1042822181';
const ONLINE_AA_URL = 'https://aa-intergroup.org';

const openDirections = (m: Meeting) => {
  const q = encodeURIComponent(`${m.where} ${m.name}`.trim());
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
  Linking.openURL(url).catch(() => {});
};

const openOnline = (m: Meeting) => {
  const raw = m.where.trim();
  if (!raw) return;
  const url = /^https?:\/\//i.test(raw) ? raw : /\.[a-z]{2,}/i.test(raw) ? `https://${raw}` : null;
  if (url) Linking.openURL(url).catch(() => {});
};

export default function MeetingsScreen() {
  const router = useRouter();
  const { meetings, addMeeting, updateMeeting, removeMeeting } = useMeetings();
  // null = closed · {mode:'add'} = new · {mode:'edit', meeting} = editing a saved one
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; meeting: Meeting } | null>(null);

  const nx = nextUpMeeting(meetings);
  const rest = meetings.filter((m) => !nx || m.id !== nx.meeting.id);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Meetings</Text>
        <Text style={styles.sub}>Save your regular meetings and find ways to discover more.</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── My meetings ── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>MY MEETINGS</Text>
          {meetings.length > 0 && <Text style={styles.savedCount}>{meetings.length} saved</Text>}
        </View>

        {meetings.length > 0 ? (
          <>
            {nx && (
              <View style={styles.nextCard}>
                <View style={styles.nextTop}>
                  <Text style={styles.nextEyebrow}>NEXT UP</Text>
                  <Pressable hitSlop={8} onPress={() => removeMeeting(nx.meeting.id)} accessibilityLabel="Remove">
                    <X size={16} color={MT_DARK} strokeWidth={2} />
                  </Pressable>
                </View>
                <Pressable style={styles.nextRow} onPress={() => setSheet({ mode: 'edit', meeting: nx.meeting })} accessibilityLabel={`Edit ${nx.meeting.name}`}>
                  <View style={styles.nextMedallion}>
                    {nx.meeting.online ? <Globe size={20} color="#fff" strokeWidth={2} /> : <MapPin size={20} color="#fff" strokeWidth={2} />}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.nextName}>{nx.meeting.name}</Text>
                    <Text style={styles.nextLabel}>{nx.label}</Text>
                    {!!nx.meeting.where && <Text style={styles.nextWhere}>{nx.meeting.where}</Text>}
                  </View>
                </Pressable>
                <Pressable style={styles.nextAction} onPress={() => (nx.meeting.online ? openOnline(nx.meeting) : openDirections(nx.meeting))}>
                  {nx.meeting.online ? <Globe size={16} color="#fff" strokeWidth={2} /> : <MapPin size={16} color="#fff" strokeWidth={2} />}
                  <Text style={styles.nextActionText}>{nx.meeting.online ? 'Join online' : 'Get directions'}</Text>
                </Pressable>
              </View>
            )}

            {rest.map((m) => (
              <MeetingRow key={m.id} m={m} onEdit={() => setSheet({ mode: 'edit', meeting: m })} onRemove={() => removeMeeting(m.id)} />
            ))}

            <Pressable style={styles.addBtn} onPress={() => setSheet({ mode: 'add' })}>
              <Plus size={16} color={MT_DARK} strokeWidth={2.2} />
              <Text style={styles.addBtnText}>Add a meeting</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.emptyCard} onPress={() => setSheet({ mode: 'add' })}>
            <View style={styles.emptyMedallion}><Plus size={19} color={MT_DARK} strokeWidth={2.2} /></View>
            <View style={styles.flex}>
              <Text style={styles.emptyTitle}>Add a meeting</Text>
              <Text style={styles.emptySub}>Save your home group and regulars so the day, time, and place are always one tap away.</Text>
            </View>
          </Pressable>
        )}

        {/* ── Find a meeting near you ── */}
        <Text style={styles.label}>LOCAL MEETINGS</Text>
        <View style={styles.guideCard}>
          <View style={styles.guideTopRow}>
            <Image source={require('../../assets/aa-app-logo-registered.png')} style={styles.guideIcon} contentFit="cover" />
            <View style={styles.flex}>
              <Text style={styles.guideName}>Meeting Guide</Text>
              <Text style={styles.guideSub}>Free AA meeting finder · A.A.W.S.</Text>
            </View>
          </View>
          <Text style={styles.guideBody}>
            Find the closest in-person and online meetings by location, day, and time — and get directions to the next one near you. Free on the App Store.
          </Text>
          <Pressable style={styles.guideBtn} onPress={() => Linking.openURL(MEETING_GUIDE_URL).catch(() => {})}>
            <Text style={styles.guideBtnText}>Download the app</Text>
            <ExternalLink size={15} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Online meetings ── */}
        <Text style={styles.label}>ONLINE MEETINGS</Text>
        <View style={styles.guideCard}>
          <View style={styles.guideTopRow}>
            <Image source={require('../../assets/enhanced-online-intergroup.webp')} style={styles.guideIcon} contentFit="cover" allowDownscaling={false} />
            <View style={styles.flex}>
              <Text style={styles.guideName}>AA Online Intergroup</Text>
              <Text style={styles.guideSub}>Online meeting directory · OIAA</Text>
            </View>
          </View>
          <Text style={styles.guideBody}>
            Browse listings of current online AA meetings worldwide — by day, time, and format.
          </Text>
          <Pressable style={[styles.guideBtn, styles.onlineBtn]} onPress={() => router.push('/(main)/online-meetings')}>
            <Text style={styles.guideBtnText}>Browse meetings</Text>
            <ChevronRight size={16} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Right here, right now ── */}
        <Text style={styles.label}>ANY MEETING</Text>
        <Fn tone={colors.amber} icon={<BookOpen size={21} color="#fff" strokeWidth={2} />} title="Meeting Readings"
          sub="Passages read aloud at meetings, plus a format guide to chair." onPress={() => router.push('/(main)/meeting-readings')} />
      </ScrollView>

      <AddMeetingSheet
        visible={!!sheet}
        meeting={sheet?.mode === 'edit' ? sheet.meeting : null}
        onClose={() => setSheet(null)}
        onSave={(m) => {
          if (sheet?.mode === 'edit') updateMeeting(sheet.meeting.id, m);
          else addMeeting(m);
          setSheet(null);
        }}
      />
    </SafeAreaView>
  );
}

function MeetingRow({ m, onEdit, onRemove }: { m: Meeting; onEdit: () => void; onRemove: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onEdit} accessibilityLabel={`Edit ${m.name}`}>
      <View style={styles.rowMedallion}>
        {m.online ? <Globe size={18} color={MT_DARK} strokeWidth={2} /> : <MapPin size={18} color={MT_DARK} strokeWidth={2} />}
      </View>
      <View style={styles.flex}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName}>{m.name}</Text>
          {m.online && <Text style={styles.onlineBadge}>ONLINE</Text>}
        </View>
        <Text style={styles.rowWhen}>{whenLabel(m)}</Text>
        {!!m.where && <Text style={styles.rowWhere}>{m.where}</Text>}
        {!!m.notes && <Text style={styles.rowNotes}>{m.notes}</Text>}
      </View>
      <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel="Remove" style={styles.rowRemove}>
        <X size={17} color={c.textMuted} strokeWidth={2} />
      </Pressable>
    </Pressable>
  );
}

function Fn({ tone, icon, title, sub, badge, onPress }: { tone: string; icon: React.ReactNode; title: string; sub: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.fn} onPress={onPress}>
      <View style={[styles.fnIcon, { backgroundColor: tone }]}>{icon}</View>
      <View style={styles.flex}>
        <View style={styles.fnTitleRow}>
          <Text style={styles.fnTitle}>{title}</Text>
          {badge && <Text style={styles.fnBadge}>{badge}</Text>}
        </View>
        <Text style={styles.fnSub}>{sub}</Text>
      </View>
      <ChevronRight size={17} color={c.textMuted} />
    </Pressable>
  );
}

// ── Add a meeting (Paste + Details; Scan/OCR is the next sprint) ──────
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function AddMeetingSheet({ visible, meeting, onClose, onSave }: { visible: boolean; meeting?: Meeting | null; onClose: () => void; onSave: (m: Omit<Meeting, 'id'>) => void }) {
  const editing = !!meeting;
  const [tab, setTab] = useState<'scan' | 'paste' | 'details'>('details');
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState<number | null>(null);
  const [where, setWhere] = useState('');
  const [notes, setNotes] = useState('');
  const [online, setOnline] = useState(false);
  const [pasted, setPasted] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'reading'>('idle');
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [filledFrom, setFilledFrom] = useState<'scan-exact' | 'scan-guess' | 'paste' | null>(null);
  // Snapshot of the values when the sheet opened — for "unsaved changes" detection.
  const initialRef = useRef('');

  const reset = () => {
    setTab('details'); setName(''); setDays([]); setTime(null); setWhere(''); setNotes('');
    setOnline(false); setPasted(''); setScanState('idle'); setScanMsg(null); setFilledFrom(null);
  };
  const close = () => { reset(); onClose(); };

  const snap = (v: { name: string; days: number[]; time: number | null; where: string; notes: string; online: boolean }) =>
    JSON.stringify({ name: v.name.trim(), days: [...v.days].sort((a, b) => a - b), time: v.time, where: v.where.trim(), notes: v.notes.trim(), online: v.online });

  // Initialise the form each time the sheet opens — from the meeting being
  // edited, or blank for a new one — and record the baseline for dirty checks.
  useEffect(() => {
    if (!visible) return;
    if (meeting) {
      setTab('details'); setName(meeting.name); setDays(meeting.days); setTime(meeting.time);
      setWhere(meeting.where); setNotes(meeting.notes); setOnline(meeting.online);
      setPasted(''); setScanState('idle'); setScanMsg(null); setFilledFrom(null);
      initialRef.current = snap(meeting);
    } else {
      reset();
      initialRef.current = snap({ name: '', days: [], time: null, where: '', notes: '', online: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, meeting?.id]);

  const dirty = snap({ name, days, time, where, notes, online }) !== initialRef.current;

  const toggleDay = (i: number) => setDays((p) => (p.includes(i) ? p.filter((d) => d !== i) : [...p, i]));

  const fillDraft = (d: MeetingDraft, source: 'scan-exact' | 'scan-guess' | 'paste') => {
    setName(d.name);
    if (d.day != null) setDays(d.day === 'daily' ? ALL_DAYS : [d.day]);
    if (d.time != null) setTime(d.time);
    setWhere(d.where);
    setOnline(d.online);
    setFilledFrom(source);
    setTab('details');
  };

  const runScan = async (src: 'library' | 'camera') => {
    setScanMsg(null);
    setScanState('reading');
    const r = await scanMeetingScreenshot(src);
    setScanState('idle');
    if (r.status === 'ok') fillDraft(r.draft, r.mode === 'exact' ? 'scan-exact' : 'scan-guess');
    else if (r.status === 'no-permission') setScanMsg(src === 'camera' ? 'Allow camera access to take a photo.' : 'Allow photo access to scan a screenshot.');
    else if (r.status === 'no-engine') setScanMsg('Scanning needs the latest app build. For now, use Paste or Details.');
    else if (r.status === 'no-match') setScanMsg("Couldn't find meeting details in that image. Try Paste or Details.");
    else if (r.status === 'error') setScanMsg('Something went wrong. Please try again.');
  };

  const applyPaste = () => {
    if (!pasted.trim()) return;
    fillDraft(parseMeetingGuide(pasted.split('\n')), 'paste');
  };

  const canSave = name.trim().length > 0 && days.length > 0;
  // Editing only enables Save once something actually changed.
  const saveEnabled = canSave && (!editing || dirty);
  const commit = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), days, time, where: where.trim(), notes: notes.trim(), online });
    reset();
  };

  // Closing with unsaved changes prompts to save first.
  const requestClose = () => {
    if (!dirty) { close(); return; }
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Keep editing', style: 'cancel' },
    ];
    if (canSave) buttons.push({ text: 'Save', onPress: commit });
    buttons.push({ text: 'Discard', style: 'destructive', onPress: close });
    Alert.alert('Save changes?', 'You have unsaved changes to this meeting.', buttons);
  };

  const timeAsDate = (() => { const d = new Date(); d.setHours(time == null ? 19 : Math.floor(time / 60), time == null ? 0 : time % 60, 0, 0); return d; })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={requestClose}>
      <KeyboardModalScope>
      <Pressable style={styles.sheetBackdrop} onPress={requestClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{editing ? 'Edit meeting' : 'Add a meeting'}</Text>
          <Pressable onPress={requestClose}><Text style={styles.sheetCancel}>Cancel</Text></Pressable>
        </View>

        {!editing && (
          <View style={styles.tabs}>
            {(['details', 'paste', 'scan'] as const).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
                <Text style={[styles.tabText, { color: tab === k ? c.text : c.textMuted }]}>{k === 'scan' ? 'Scan' : k === 'paste' ? 'Paste' : 'Details'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={24}>
          {tab === 'scan' ? (
            <View>
              <View style={styles.pasteHint}>
                <Sparkles size={15} color={MT_DARK} strokeWidth={2} />
                <Text style={styles.pasteHintText}>Screenshot a meeting in Meeting Guide for best results — or use the camera to snap a flyer.</Text>
              </View>
              <Pressable style={styles.scanBox} onPress={() => runScan('library')} disabled={scanState === 'reading'}>
                {scanState === 'reading' ? (
                  <>
                    <ActivityIndicator color={MT} />
                    <Text style={styles.scanReading}>Reading image…</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.scanIcon}><ImagePlus size={24} color={MT_DARK} strokeWidth={1.9} /></View>
                    <Text style={styles.scanTitle}>Choose a screenshot</Text>
                    <Text style={styles.scanSub}>From your photo library</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.scanPhotoBtn} onPress={() => runScan('camera')} disabled={scanState === 'reading'}>
                <Camera size={16} color={MT_DARK} strokeWidth={2} />
                <Text style={styles.scanPhotoText}>Take a photo of a flyer</Text>
              </Pressable>
              {!!scanMsg && <Text style={styles.scanMsg}>{scanMsg}</Text>}
            </View>
          ) : tab === 'paste' ? (
            <View>
              <View style={styles.pasteHint}>
                <ClipboardList size={15} color={c.textMuted} strokeWidth={2} />
                <Text style={styles.pasteHintText}>Paste details from a website, email, or message.</Text>
              </View>
              <TextInput value={pasted} onChangeText={setPasted} placeholder={'Sunrise Sobriety\nDaily · 7:00 AM\nAlano Club, 142 Oak St'} placeholderTextColor={c.textMuted} style={styles.pasteBox} multiline />
              <Pressable style={[styles.pasteBtn, !pasted.trim() && styles.btnDisabled]} disabled={!pasted.trim()} onPress={applyPaste}>
                <Text style={[styles.pasteBtnText, { color: pasted.trim() ? MT_DARK : c.textMuted }]}>Use these details</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {filledFrom && (
                <View style={styles.filledBanner}>
                  <Sparkles size={15} color={MT_DARK} strokeWidth={2} />
                  <Text style={styles.filledBannerText}>
                    {filledFrom === 'scan-exact'
                      ? 'Filled from your screenshot — check the details below.'
                      : filledFrom === 'scan-guess'
                        ? 'Best guess from your image — please double-check everything.'
                        : 'Filled from what you pasted — check the details below.'}
                  </Text>
                </View>
              )}
              <Field label="Meeting name">
                <TextInput value={name} onChangeText={setName} placeholder="Meeting name" placeholderTextColor={c.textMuted} style={styles.input} />
              </Field>
              <Field label="Days">
                <View style={styles.dayWrap}>
                  <Pressable
                    onPress={() => setDays((p) => (p.length === 7 ? [] : [...ALL_DAYS]))}
                    style={[styles.dayChip, days.length === 7 ? styles.dayChipOn : styles.dayChipOff]}
                  >
                    <Text style={[styles.dayChipText, { color: days.length === 7 ? '#fff' : c.textSecondary }]}>Daily</Text>
                  </Pressable>
                  {WEEKDAY_ABBR.map((label, i) => {
                    const on = days.includes(i);
                    return (
                      <Pressable key={i} onPress={() => toggleDay(i)} style={[styles.dayChip, on ? styles.dayChipOn : styles.dayChipOff]}>
                        <Text style={[styles.dayChipText, { color: on ? '#fff' : c.textSecondary }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
              <Field label="Time">
                <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: 15, color: time == null ? c.textMuted : c.text }}>{time == null ? 'Set a time' : formatTime(time)}</Text>
                </Pressable>
                {showPicker && (
                  <DateTimePicker
                    value={timeAsDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, d) => {
                      if (Platform.OS === 'android') setShowPicker(false);
                      if (e.type === 'set' && d) setTime(d.getHours() * 60 + d.getMinutes());
                    }}
                  />
                )}
              </Field>
              <Field label={online ? 'Link or platform' : 'Location'}>
                <TextInput value={where} onChangeText={setWhere} placeholder={online ? 'Link or platform' : 'Location'} placeholderTextColor={c.textMuted} style={styles.input} autoCapitalize={online ? 'none' : 'sentences'} />
              </Field>
              <Field label="Notes">
                <TextInput value={notes} onChangeText={setNotes} placeholder="Open meeting, home group, who to ask for…" placeholderTextColor={c.textMuted} style={[styles.input, styles.inputMultiline]} multiline />
              </Field>
              <Pressable style={styles.onlineToggle} onPress={() => setOnline((o) => !o)}>
                <View style={[styles.switchTrack, { backgroundColor: online ? MT : '#D8D3C8' }]}>
                  <View style={[styles.switchThumb, { left: online ? 21 : 3 }]} />
                </View>
                <Text style={styles.onlineToggleText}>Online meeting</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, !saveEnabled && styles.btnDisabled]} disabled={!saveEnabled} onPress={commit}>
                <Text style={styles.saveBtnText}>{editing ? 'Save changes' : 'Save meeting'}</Text>
              </Pressable>
            </View>
          )}
        </KeyboardAwareScrollView>
      </View>
      </KeyboardModalScope>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 24 },
  title: { fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text, lineHeight: 34 },
  sub: { fontFamily: fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: 3 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 0, marginBottom: 10, paddingHorizontal: 4 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted },
  savedCount: { fontFamily: fontFamily.medium, fontSize: 12.5, color: c.textMuted },

  // next-up
  nextCard: { marginBottom: 8, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 15, borderRadius: 18, backgroundColor: MT_SOFT, borderWidth: 1, borderColor: MT + '44' },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nextEyebrow: { fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.4, color: MT_DARK },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextMedallion: { width: 42, height: 42, borderRadius: 12, backgroundColor: MT, alignItems: 'center', justifyContent: 'center' },
  nextName: { fontFamily: fontFamily.semiBold, fontSize: 16.5, color: c.text },
  nextLabel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: MT_DARK, marginTop: 3 },
  nextWhere: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 1 },
  nextAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, paddingVertical: 12, borderRadius: 13, backgroundColor: MT },
  nextActionText: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: '#fff' },

  // saved row
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginBottom: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  rowMedallion: { width: 38, height: 38, borderRadius: 11, backgroundColor: MT_SOFT, alignItems: 'center', justifyContent: 'center' },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  onlineBadge: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.4, color: MT_DARK, backgroundColor: MT_SOFT, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  rowWhen: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },
  rowWhere: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },
  rowNotes: { fontFamily: fontFamily.serifItalic, fontSize: 12, color: c.textSecondary, marginTop: 5, lineHeight: 17 },
  rowRemove: { padding: 4 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderColor: MT + '77', borderStyle: 'dashed' },
  addBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: MT_DARK },

  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: MT + '77', borderStyle: 'dashed' },
  emptyMedallion: { width: 38, height: 38, borderRadius: 12, backgroundColor: MT_SOFT, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  emptySub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },

  label: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.textMuted, marginTop: 26, marginBottom: 10, paddingHorizontal: 4 },

  // meeting guide
  guideCard: { padding: 16, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  guideTopRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  guideIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  guideName: { fontFamily: fontFamily.semiBold, fontSize: 16, color: c.text },
  guideSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
  guideBody: { fontFamily: fontFamily.regular, fontSize: 13.5, color: c.textSecondary, lineHeight: 21, marginTop: 13 },
  guideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15, paddingVertical: 13, borderRadius: 13, backgroundColor: '#1E4E86' },
  onlineBtn: { backgroundColor: '#16205A' },
  guideBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14.5, color: '#fff' },

  // function row
  fn: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, marginBottom: 10, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  fnIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fnTitle: { fontFamily: fontFamily.semiBold, fontSize: 15.5, color: c.text },
  fnBadge: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.5, color: colors.secondaryDark, backgroundColor: colors.secondarySoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  fnSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 3 },

  // add sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,18,14,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', backgroundColor: c.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8D3C8', alignSelf: 'center', marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontFamily: fontFamily.display, fontSize: 19, color: c.text },
  sheetCancel: { fontFamily: fontFamily.semiBold, fontSize: 14, color: c.textMuted },
  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 12, backgroundColor: '#EDEAE2', marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontFamily: fontFamily.semiBold, fontSize: 14 },

  pasteHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  pasteHintText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted, flex: 1 },
  pasteBox: { minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 15, color: c.text, textAlignVertical: 'top', lineHeight: 22 },
  pasteBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: MT_SOFT },
  pasteBtnText: { fontFamily: fontFamily.semiBold, fontSize: 14 },

  scanBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 34, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1.5, borderColor: MT + '77', borderStyle: 'dashed', backgroundColor: MT_SOFT },
  scanIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontFamily: fontFamily.semiBold, fontSize: 15, color: c.text },
  scanSub: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textMuted },
  scanReading: { fontFamily: fontFamily.semiBold, fontSize: 14, color: MT_DARK },
  scanPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff' },
  scanPhotoText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: MT_DARK },
  scanMsg: { fontFamily: fontFamily.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 18 },
  filledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: MT_SOFT },
  filledBannerText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12.5, color: MT_DARK, lineHeight: 17 },

  fieldLabel: { fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 0.8, color: c.textMuted, marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 15, color: c.text, justifyContent: 'center' },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  dayWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  dayChipOn: { backgroundColor: MT },
  dayChipOff: { backgroundColor: '#fff', borderWidth: 1, borderColor: c.border },
  dayChipText: { fontFamily: fontFamily.semiBold, fontSize: 13 },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  switchThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  onlineToggleText: { fontFamily: fontFamily.medium, fontSize: 14, color: c.textSecondary },
  saveBtn: { marginTop: 6, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: MT },
  saveBtnText: { fontFamily: fontFamily.semiBold, fontSize: 15, color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
