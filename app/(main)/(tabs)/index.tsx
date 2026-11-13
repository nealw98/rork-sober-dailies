import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { Check, Minus, GripVertical, Pencil } from 'lucide-react-native';
import { useSobriety } from '@/hooks/useSobrietyStore';
import { calculateMilestone, replaySobrietyMilestone } from '@/hooks/useSobrietyBirthday';
import * as Haptics from 'expo-haptics';

import { fontFamily, fontSize, spacing, radii, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { getRowTones, resolveGlyph, resolveTone } from '@/components/dailyTokens';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import ListDetailLayout from '@/components/layout/ListDetailLayout';
import { PaneProvider } from '@/components/layout/PaneContext';
import PaneExpandButton from '@/components/layout/PaneExpandButton';
import ReflectionPane from '@/components/today/ReflectionPane';
import EditDailiesTip, { type TipRect } from '@/components/today/EditDailiesTip';
// Tool screens, embedded in the detail pane on expanded widths. They are the
// same components the routes render — PaneContext redirects their back/save
// navigation to the pane.
import PrayersScreen from '@/app/(main)/prayers';
import GratitudeScreen from '@/app/(main)/gratitude';
import JournalScreen from '@/app/(main)/journal';
import InventoryScreen from '@/app/(main)/inventory';
import NightlyReviewScreen from '@/app/(main)/evening-review';
import MeditationScreen from '@/app/(main)/meditation';
import ReachOutScreen from '@/app/(main)/reach-out';
import SpeakersScreen from '@/app/(main)/speakers';
import MeetingsScreen from '@/app/(main)/meetings';
import DailiesEditor from '@/components/today/DailiesEditor';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';
import { useReflectionHeroImage } from '@/hooks/useReflectionHeroImage';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import SobrietyCounter from '@/components/SobrietyCounter';
import MilestoneBand from '@/components/today/MilestoneBand';
import { recordUseDay } from '@/lib/growthPrompts';
import GiftThankYouSheet from '@/components/GiftThankYouSheet';
import { consumePendingAnnouncement, consumePendingArrival, type AnnouncePlan } from '@/lib/creditsService';
import { pickContact } from '@/lib/pickContact';
import { getSponsorContact, setSponsorContact, type SponsorContact } from '@/lib/sponsorContact';
import { normalizePhone } from '@/hooks/use-contacts-store';
import { logEvent } from '@/lib/analytics';
import SettingsGear from '@/components/navigation/SettingsGear';
import PassItOnGift from '@/components/navigation/PassItOnGift';
import { getTodaysReflection } from '@/constants/reflections';
import { titleCase } from '@/lib/titleCase';
import { Reflection } from '@/types';

// Today is a to-do ledger. Completion is fully manual: every daily — including
// the Daily Reflection hero — is checked off with its "Done" button, never on
// open. Tapping a row opens its tool. Customisation happens in-place via the
// header Edit toggle (no separate page).

// action → route. undefined = no-tool action (just checks off). null = deferred.
const ACTION_ROUTE: Record<string, Href | null> = {
  prayerMorning: '/(main)/prayers',
  prayerEvening: '/(main)/prayers',
  gratitude: '/(main)/gratitude',
  journal: '/(main)/journal' as Href,
  spotcheck: '/(main)/inventory',
  nightly: '/(main)/evening-review',
  speaker: '/(main)/speakers',
  meditation: '/(main)/meditation',
  callAnother: '/(main)/reach-out' as Href,
  lit: '/(main)/(tabs)/literature',
  meeting: '/(main)/meetings',
};

// Prayer dailies land on the full prayer library rather than deep-linking to
// the one prayer — the whole list is the point, and morning/evening are the
// first things on it anyway.

// On expanded widths these actions open INSIDE the detail pane instead of
// pushing full-screen (everything opened from Today lives in the right pane;
// its Expand control reopens it as the pushed route). `lit` switches tabs and
// `callSponsor` is an action sheet, so they stay as they are.
const PANE_SCREENS: Record<string, React.ComponentType> = {
  prayerMorning: PrayersScreen,
  prayerEvening: PrayersScreen,
  gratitude: GratitudeScreen,
  journal: JournalScreen,
  spotcheck: InventoryScreen,
  nightly: NightlyReviewScreen,
  speaker: SpeakersScreen,
  meditation: MeditationScreen,
  callAnother: ReachOutScreen,
  meeting: MeetingsScreen,
};

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// Flattened rows for the edit-mode drag list: a section header, its dailies, and
// a "+ Add" row, per bucket. Dropping a daily under a different header re-buckets it.
type EditRow =
  | { type: 'header'; key: string; when: WhenBucket }
  | { type: 'daily'; key: string; item: DailyItem; isLast: boolean }
  | { type: 'add'; key: string; when: WhenBucket };

// ─── Done button — the completion control, in the row's accent (tool) color:
// outline when undone, filled + check when done. `onDark` is a treatment for use
// over a photo (the reflection hero): transparent with a white outline + white
// text when undone; when done it fills with the accent (teal) + white check/text,
// matching the ledger rows.
function DoneButton({ done, tone, onPress, onDark }: { done: boolean; tone: { ink: string }; onPress: () => void; onDark?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={[
        styles.doneBtn,
        onDark
          ? done
            ? { backgroundColor: tone.ink, borderColor: tone.ink }
            : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.85)' }
          : done
            ? { backgroundColor: tone.ink, borderColor: tone.ink }
            : { backgroundColor: 'transparent', borderColor: tone.ink + '99' },
      ]}
    >
      {done && <Check size={12} color="#fff" strokeWidth={3} />}
      <Text style={[styles.doneText, { color: onDark || done ? '#fff' : tone.ink }]}>Done</Text>
    </Pressable>
  );
}

// ─── Daily row — flat ledger line: accent bar · glyph · title · Done ──────────
// In edit mode the Done button is swapped for the remove control and the
// grip-handle medallion long-presses to reorder. Outside edit mode: tap to
// open the tool.
function DailyRow({
  item, done, isLast, editing, selected, onOpen, onToggle, onRemove, onDragStart, dragging,
}: {
  item: DailyItem; done: boolean; isLast: boolean; editing: boolean;
  // Expanded widths: this daily's tool is open in the pane beside the list —
  // the row gets the same 1.5pt accent outline as the selected hero.
  selected?: boolean;
  onOpen: () => void; onToggle: () => void; onRemove: () => void;
  onDragStart?: () => void; dragging?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { mode } = useTokens();
  const tone = resolveTone(item.color, mode);
  const Glyph = resolveGlyph(item.icon);
  // Canned action subtitles are gone for good (decided 2026-08-02); only a
  // user-entered subtitle (sponsor name, custom note) renders.
  const sub = item.subtitle;

  if (editing) {
    return (
      <View style={[styles.row, dragging && styles.rowDragging]}>
        {/* Grip handle → long-press to drag/reorder. */}
        <Pressable style={[styles.med, { backgroundColor: tone.soft }]} onLongPress={onDragStart} delayLongPress={150} accessibilityLabel={`Drag ${item.label} to reorder`}>
          <GripVertical size={20} color={tone.ink} strokeWidth={2} />
        </Pressable>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        <View style={styles.editControls}>
          <Pressable hitSlop={6} style={styles.removeBtn} onPress={onRemove} accessibilityLabel={`Remove ${item.label}`}>
            <Minus size={14} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, selected && { borderWidth: 1.5, borderColor: tone.ink }]}>
      <Pressable style={styles.rowMain} onPress={onOpen}>
        <View style={[styles.med, { backgroundColor: tone.soft }]}>
          <Glyph size={20} color={tone.ink} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
          {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </Pressable>
      <DoneButton done={done} tone={tone} onPress={onToggle} />
    </View>
  );
}

// Bundled offline/loading placeholder for the hero.
const HERO_FALLBACK = require('@/assets/reflections_images/reflection_bg7.webp');

// The Today hero rotates daily through the real images in the Supabase
// `daily-reflection-images/daily-reflections` bucket (see useReflectionHeroImage).
// Set ROTATE_HERO=false to pin it back to the bundled seedling photo if needed.
const ROTATE_HERO = true;
const STATIC_HERO = require('@/assets/images/reflection_bg2.webp');

function ReflectionHero({ title, imageUri, alt, staticSource, done, selected, onRead, onToggle }: { title: string; imageUri?: string; alt?: string; staticSource?: number; done: boolean; selected?: boolean; onRead: () => void; onToggle: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { mode, colors } = useTokens();
  const teal = getRowTones(mode).teal;
  const fallback = staticSource ?? HERO_FALLBACK;
  return (
    // On expanded widths the hero doubles as the "selected row" for the
    // reading pane beside it — it gets the handoff's 1.5pt accent outline.
    <View style={[styles.hero, selected && { borderWidth: 1.5, borderColor: colors.primary }]}>
      {/* The card IS the image now — no meta band. Eyebrow + title bottom-left. */}
      <Pressable style={styles.heroCover} onPress={onRead}>
        <Image
          source={imageUri ? { uri: imageUri } : fallback}
          placeholder={fallback}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          accessibilityLabel={alt}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroEyebrow}>Daily Reflections</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
        </View>
      </Pressable>
      {/* Done ON the image, bottom-right — aligned with the ledger rows' buttons.
          White "on-dark" treatment so it reads on the photo's gradient. */}
      <View style={styles.heroDone}>
        <DoneButton done={done} tone={teal} onPress={onToggle} onDark />
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const dailies = useDailies();
  const { sobrietyDate } = useSobriety();
  // Expanded widths (unfolded Duo landscape, iPad) render Today as two panes:
  // the list column keeps today's UI, and the Daily Reflection — the one
  // content daily — reads in a pane beside it instead of pushing the full
  // reader. Tool dailies (prayers, journal, …) still push their screens.
  const expanded = useLayoutMode() === 'expanded';

  // Milestone day — a full-bleed band above the counter that celebrates all day
  // and replays the takeover on tap (the auto-show only fires once). See
  // components/today/MilestoneBand for why it's a band and not a header chip.
  // Which tool daily is open in the detail pane (expanded only); null = the
  // Daily Reflection, the pane's resting state. Keyed by action so switching
  // dailies remounts the tool fresh.
  const [paneTool, setPaneTool] = useState<{ action: string; route: Href } | null>(null);

  const milestone = sobrietyDate ? calculateMilestone(sobrietyDate) : null;
  const milestoneLabel = (() => {
    if (!milestone) return null;
    const n = milestone.split('-')[0];
    const unit = milestone.endsWith('-year') ? (n === '1' ? 'year' : 'years') : (n === '1' ? 'month' : 'months');
    return `${n} ${unit}`;
  })();
  const heroImage = useReflectionHeroImage();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [editing, setEditing] = useState(false);
  useScreenTimeTracking('Today');
  const { showActionSheetWithOptions } = useActionSheet();

  // "Call my sponsor" daily — the saved sponsor rides under the row as its
  // subtitle; pressing the row offers Call / Text (completion stays manual,
  // like every daily).
  const [sponsor, setSponsor] = useState<SponsorContact | null>(null);
  useEffect(() => {
    getSponsorContact().then(setSponsor).catch(() => {});
  }, []);

  // Post-subscribe thank-you sheet: the paywall can't present it (its tree
  // dissolves when isPremium flips), so buy() leaves a pending flag and Today
  // announces the gifts on first mount (design handoff "gift surfaces" §1).
  const [announcePlan, setAnnouncePlan] = useState<AnnouncePlan | null>(null);
  // The same sheet, later: passes are only earned on the first real charge, so
  // for a trial member they land days after the welcome. fetchCreditStatus
  // queues this when the grant total rises.
  const [arrivedCount, setArrivedCount] = useState<number | null>(null);
  useEffect(() => {
    consumePendingAnnouncement().then((plan) => { if (plan) setAnnouncePlan(plan); });
    consumePendingArrival().then((n) => { if (n) setArrivedCount(n); });
    // Growth nudges are retired (Neal, 2026-07-20: the only pass reminders
    // are the post-subscribe thank-you and the badged gift icon) — but the
    // use-day stamp survives them: the app-review prompt's 15-day wait
    // measures from firstUseAt, which recordUseDay writes.
    recordUseDay();
  }, []);

  const chooseSponsor = async (thenSheet: boolean) => {
    const picked = await pickContact();
    if (!picked) return;
    if (!picked.phone) {
      Alert.alert('No phone number', `${picked.name} doesn’t have a phone number to call or text.`);
      return;
    }
    await setSponsorContact(picked);
    setSponsor(picked);
    logEvent('sponsor_contact_set');
    if (thenSheet) sponsorSheet(picked);
  };

  const sponsorSheet = (s: SponsorContact) => {
    showActionSheetWithOptions(
      { title: s.name, message: s.phone || undefined, options: ['Call', 'Text', 'Change sponsor', 'Cancel'], cancelButtonIndex: 3 },
      (i) => {
        if (i === 0) {
          logEvent('sponsor_reached', { action: 'call' });
          Linking.openURL(`tel:${normalizePhone(s.phone)}`).catch(() => {});
        } else if (i === 1) {
          logEvent('sponsor_reached', { action: 'text' });
          Linking.openURL(`sms:${normalizePhone(s.phone)}`).catch(() => {});
        } else if (i === 2) {
          chooseSponsor(false);
        }
      },
    );
  };

  const handleSponsorPress = () => {
    if (sponsor) sponsorSheet(sponsor);
    else {
      // First press: pick who your sponsor is, then go straight to Call/Text.
      chooseSponsor(true);
    }
  };

  const toggleEditing = useCallback(() => {
    setEditing((v) => !v);
  }, []);

  // One-time "Edit your dailies" tip, right after onboarding (which sets the
  // pending flag — so anyone who finished onboarding before it existed never
  // sees it). Waits for the thank-you sheet a purchase leaves behind, then
  // measures the first dailies section and its pencil and spotlights them.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollYRef = useRef(0);
  const firstSectionRef = useRef<React.ComponentRef<typeof View>>(null);
  const pencilRef = useRef<React.ComponentRef<typeof View>>(null);
  const [tip, setTip] = useState<{ section: TipRect; edit: TipRect } | null>(null);
  const tipCheckedRef = useRef(false);
  const blockedByOtherSheet = !!announcePlan || arrivedCount != null;
  useEffect(() => {
    if (tipCheckedRef.current || blockedByOtherSheet || editing) return;
    let cancelled = false;
    const measure = (ref: React.RefObject<React.ComponentRef<typeof View> | null>) =>
      new Promise<TipRect | null>((resolve) => {
        if (!ref.current) return resolve(null);
        ref.current.measureInWindow((x, y, width, height) => resolve(width > 0 ? { x, y, width, height } : null));
      });
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // The screen is still settling when it first mounts (the gate's swap-in,
    // the counter and hero filling in), so a single early measure can land
    // tens of points off. Re-measure until two reads agree.
    const measureStable = async (ref: React.RefObject<React.ComponentRef<typeof View> | null>) => {
      let prev = await measure(ref);
      for (let i = 0; i < 8; i++) {
        await wait(150);
        const next = await measure(ref);
        if (prev && next && Math.abs(prev.y - next.y) < 1 && Math.abs(prev.height - next.height) < 1) return next;
        prev = next;
      }
      return prev;
    };
    (async () => {
      const [[, pending], [, seen]] = await AsyncStorage.multiGet(['today_edit_tip_pending', 'today_edit_tip_seen']);
      if (cancelled || pending !== '1' || seen === '1') return;
      tipCheckedRef.current = true;
      await wait(600); // first layout + the gate's swap-in
      let section = await measureStable(firstSectionRef);
      // A tall counter + hero (or a short screen) can push the dailies below
      // the fold: bring the section's header up before spotlighting it.
      const winH = Dimensions.get('window').height;
      if (section && section.y > winH * 0.62) {
        scrollRef.current?.scrollTo({ y: scrollYRef.current + section.y - winH * 0.42, animated: true });
        section = await measureStable(firstSectionRef);
      }
      const edit = await measureStable(pencilRef);
      if (cancelled || !section || !edit) return;
      await AsyncStorage.multiSet([['today_edit_tip_seen', '1'], ['today_edit_tip_pending', '0']]).catch(() => {});
      logEvent('today_tip_shown', { flow_version: 'v2_tools' });
      setTip({ section, edit });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [blockedByOtherSheet, editing]);
  const dismissTip = () => {
    logEvent('today_tip_dismissed', { flow_version: 'v2_tools' });
    setTip(null);
  };

  useEffect(() => {
    getTodaysReflection().then(setReflection).catch((e) => console.error('[today] reflection', e));
  }, [dailies.dayKey]);

  // Review trigger: the "I finished my program today" moment. Fire once when the
  // last daily is checked off (resets if they uncheck, or on a new day). Gated
  // inside maybeAskForReview, so it silently no-ops unless the user is eligible.
  const allDoneFiredRef = useRef(false);
  useEffect(() => { allDoneFiredRef.current = false; }, [dailies.dayKey]);
  useEffect(() => {
    const allDone = dailies.totalCount > 0 && dailies.doneCount >= dailies.totalCount;
    if (allDone && !allDoneFiredRef.current) {
      allDoneFiredRef.current = true;
      maybeAskForReview('allDailies').catch(() => {});
    } else if (!allDone) {
      allDoneFiredRef.current = false;
    }
  }, [dailies.doneCount, dailies.totalCount]);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const openDaily = (item: DailyItem) => {
    if (item.action === 'callSponsor') {
      handleSponsorPress();
      return;
    }
    const route = ACTION_ROUTE[item.action];
    if (route === undefined) {
      // No-tool action: tapping the row just checks it.
      dailies.toggleDone(item.id);
      return;
    }
    if (route === null) {
      Alert.alert('Coming soon', `${item.label} is on the way in the redesign.`);
      return;
    }
    // Expanded: the tool reads/writes in the pane beside the list. Compact
    // (and the few non-pane actions, like the Literature tab switch) pushes.
    if (expanded && PANE_SCREENS[item.action]) {
      setPaneTool({ action: item.action, route });
      return;
    }
    router.push(route);
  };

  const toggleDaily = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dailies.toggleDone(id);
  };

  // Compact pushes the full reader; expanded shows the reading in the pane —
  // a hero tap there brings the pane back to the reflection if a tool has it.
  const openReflection = () => {
    if (expanded) setPaneTool(null);
    else router.push('/daily-reflections');
  };

  // Counter + Daily Reflection hero — shown above the list in both modes.
  const topContent = (
    <>
      {milestoneLabel && (
        <MilestoneBand
          label={milestoneLabel}
          onPress={() => {
            logEvent('milestone_replayed', { milestone });
            replaySobrietyMilestone();
          }}
        />
      )}
      <SobrietyCounter />
      {announcePlan && (
        <GiftThankYouSheet
          plan={announcePlan}
          onSeeGifts={() => { setAnnouncePlan(null); router.push('/(main)/pass-it-on' as Href); }}
          onClose={() => setAnnouncePlan(null)}
        />
      )}
      {!announcePlan && arrivedCount != null && (
        <GiftThankYouSheet
          plan={arrivedCount > 1 ? 'annual' : 'monthly'}
          mode="arrival"
          count={arrivedCount}
          onSeeGifts={() => { setArrivedCount(null); router.push('/(main)/pass-it-on' as Href); }}
          onClose={() => setArrivedCount(null)}
        />
      )}
      <View style={styles.heroTop}>
        <ReflectionHero
          title={reflection?.title ? titleCase(reflection.title) : 'Daily Reflection'}
          imageUri={ROTATE_HERO ? heroImage?.uri : undefined}
          alt={ROTATE_HERO ? heroImage?.alt : 'A seedling reaching toward the light'}
          staticSource={ROTATE_HERO ? undefined : STATIC_HERO}
          done={dailies.reflectionDone}
          selected={expanded && !paneTool}
          onRead={openReflection}
          onToggle={dailies.toggleReflection}
        />
      </View>
    </>
  );

  // Editing swaps the pencil for "Save" in place — same line as "Morning", same
  // right edge. The editor pins that first section header, so Save rides in as
  // its accessory. ("Done" is reserved for the per-daily completion buttons.)
  const saveButton = (
    <Pressable
      hitSlop={12}
      onPress={toggleEditing}
      accessibilityRole="button"
      accessibilityLabel="Save dailies"
      style={styles.editBtn}
    >
      <Text style={styles.editToggle}>Save</Text>
    </Pressable>
  );

  // The whole of today's Today screen — header + ledger (or editor). On
  // compact it IS the screen; on expanded it becomes the list column, with
  // the reading pane beside it (editing stays single-column in this pane,
  // per the handoff).
  const listColumn = (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Milestone day: tuck the band up close under the date — it's part of
          "what today is", so it hangs off the header, not off the counter. */}
      <View style={[styles.header, milestoneLabel ? styles.headerMilestone : null]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Today</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{dateLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <PassItOnGift />
          <SettingsGear />
        </View>
      </View>
      {editing ? (
        <DailiesEditor header={topContent} headerAccessory={saveButton} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={64}
        >
          {topContent}
          {SECTIONS.map((when) => {
            const items = dailies.section(when);
            if (items.length === 0) return null;
            // The edit pencil sits across from the FIRST visible section title.
            const showPencil = when === SECTIONS.find((w) => dailies.section(w).length > 0);
            return (
              <View key={when} style={styles.section} ref={showPencil ? firstSectionRef : undefined} collapsable={false}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>{when}</Text>
                  {showPencil && (
                    <Pressable
                      ref={pencilRef}
                      hitSlop={12}
                      onPress={toggleEditing}
                      accessibilityRole="button"
                      accessibilityLabel="Edit dailies"
                      style={styles.editBtn}
                    >
                      <Pencil size={20} color={colors.primaryDark} strokeWidth={2} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.ledger}>
                  {items.map((item, idx) => (
                    <DailyRow
                      key={item.id}
                      item={item.action === 'callSponsor' && sponsor ? { ...item, subtitle: sponsor.name } : item}
                      done={dailies.isDone(item.id)}
                      isLast={idx === items.length - 1}
                      editing={false}
                      selected={expanded && paneTool?.action === item.action}
                      onOpen={() => openDaily(item)}
                      onToggle={() => toggleDaily(item.id)}
                      onRemove={() => {}}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      {tip && <EditDailiesTip section={tip.section} edit={tip.edit} onDismiss={dismissTip} />}
    </SafeAreaView>
  );

  if (expanded) {
    const PaneTool = paneTool ? PANE_SCREENS[paneTool.action] : null;
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <ListDetailLayout
          listWidth={TODAY_LIST_WIDTH}
          list={listColumn}
          detail={
            paneTool && PaneTool ? (
              // A tool daily, embedded. The provider points its back/save at
              // the pane; Expand reopens it as the full-screen route. Keyed so
              // switching dailies starts the next tool fresh.
              <PaneProvider
                key={paneTool.action}
                // expanded=1: the pushed screen's back control renders as the
                // collapse glyph (it returns here), not a chevron — BackButton.
                value={{ close: () => setPaneTool(null), expand: () => router.push({ pathname: paneTool.route as never, params: { expanded: '1' } }) }}
              >
                <PaneTool />
              </PaneProvider>
            ) : (
              <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.paneBar}>
                  <PaneExpandButton onPress={() => router.push({ pathname: '/daily-reflections', params: { expanded: '1' } })} />
                </View>
                <ReflectionPane
                  reflection={reflection}
                  dateLabel={dateLabel}
                  done={dailies.reflectionDone}
                  onToggleDone={dailies.toggleReflection}
                />
              </SafeAreaView>
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {listColumn}
    </View>
  );
}

// A touch wider than the shared 330 default: Today's rows carry a trailing
// Done button and the hero card, which need the extra room at 22pt gutters.
const TODAY_LIST_WIDTH = 360;

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Dark card chrome — the "cheap" variant of the handoff's card treatment for
  // the many small ledger rows: lit top hairline + soft drop into the black.
  // (The big surfaces use the full ThemedCard treatment.)
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  // Tab header: title row starts at paddingTop 54 — the y where back-button
  // screens' titles land (8 padding + 38 button + 8 margin) — with the actions
  // inline beside it, and a real paddingBottom so the header reads as a header.
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 54, paddingBottom: 28 },
  headerMilestone: { paddingBottom: 19 },
  title: { fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -0.5, lineHeight: 29 },
  // milestone-day chip — solid rose, centered on the title line, tappable to
  // replay the takeover. Overlay spans the header; box-none keeps the gear live.
  date: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 2 },
  // Edit + the settings gear share the top-right; the gear is the outermost
  // (far-corner) control (handoff-tab-nav).
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 6 },
  editToggle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.primaryDark },
  // Section title row: title left, edit pencil directly across on the same line.
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  // Roomy hit area so the pencil / "Save" is easy to tap (was a bare glyph
  // before). Shared by both, so they occupy the same spot on the Morning line.
  // translateY: center-alignment tracks the text's BOUNDING BOX, but
  // "Morning"'s descender pulls its ink lower — measured 1.5pt of optical
  // drift on both the pencil and Save (sim, 2026-08-03).
  editBtn: { paddingVertical: 6, paddingHorizontal: 12, marginRight: -4, transform: [{ translateY: 1.5 }] },
  scroll: { paddingHorizontal: 22, paddingBottom: 96 },

  heroTop: { marginTop: spacing.xl },
  // Reflection pane chrome (expanded): the expand control, top-right.
  paneBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl },
  // Drag-list cells use padding (not margin) so onLayout heights stay correct.
  dragHeader: { paddingTop: spacing.xl, paddingBottom: 12 },
  dragHeaderText: { marginBottom: 0 },
  dragAdd: { paddingTop: 12 },
  addPillFlush: { marginTop: 0 },

  // Ledger: a card-less stack of flat rows
  ledger: {},
  // White tile per daily — the accent (tool) color lives in the icon medallion
  // and the Done button.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    ...shadows.sm,
    ...darkCard,
  },
  rowDragging: { ...shadows.md },
  med: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20, color: c.text },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },

  // Done button
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1.25,
  },
  doneText: { fontFamily: fontFamily.semiBold, fontSize: 11.5 },

  // Edit-mode controls
  editControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D8584E', alignItems: 'center', justifyContent: 'center' },

  // "+ Add to {section}" dashed button
  addPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
  },
  addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },

  // Reflection hero
  // Photo jewel — no card-treatment hairline on dark (it reads as a white
  // outline around the image); the photo edge + meta band define the card.
  hero: { borderRadius: 16, borderWidth: isDark ? 0 : 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden', marginBottom: 4, ...shadows.sm },
  heroCover: { height: 168, justifyContent: 'flex-end', overflow: 'hidden' },
  // Eyebrow + title block, bottom-left, kept in the left ~2/3 clear of the Done button.
  heroTextBlock: { maxWidth: '72%', paddingHorizontal: 14, paddingBottom: 14 },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 22,
    color: '#fff',
    lineHeight: 27,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  // Done button overlaid on the image, aligned to the ledger rows' right inset
  // (13). The button uses the white on-dark treatment (see DoneButton onDark).
  heroDone: { position: 'absolute', right: 13, bottom: 13 },
  });
};
