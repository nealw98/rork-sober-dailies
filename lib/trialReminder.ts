// Day-5 trial reminder — makes the paywall timeline's "Day 5: We'll notify you
// that your trial is ending soon" promise real. Local notification only (no
// push infrastructure): scheduled on-device right after purchase, to fire 48h
// before the trial converts (= day 5 of a 7-day trial), anchored to the
// entitlement's real expirationDate rather than "now + 5 days".
//
// Lifecycle:
//  - PaywallScreen.buy() awaits scheduleTrialEndingReminder(info) after a
//    successful trial purchase, BEFORE the gate drops — so the OS notification
//    permission prompt appears while the timeline that promises the reminder
//    is still on screen.
//  - SubscriptionProvider calls syncTrialReminder(info) on every CustomerInfo
//    update: if the user cancels mid-trial (willRenew=false) or the
//    entitlement disappears (refund), the pending reminder is cancelled — no
//    "trial ending" ping for a charge that isn't coming.
//
// ⚠️ expo-notifications is a NATIVE module: this feature only works in
// binaries built after it was added. The lazy require below keeps an OTA of
// this JS from crashing older binaries — there it just silently no-ops.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';
import { logEvent } from '@/lib/analytics';

const ENTITLEMENT_ID = 'premium';
const STORE_KEY = 'trial_reminder_notification_id';
const WARN_BEFORE_MS = 48 * 60 * 60 * 1000;

type NotificationsModule = typeof import('expo-notifications');

let notifications: NotificationsModule | null | undefined;
function getNotifications(): NotificationsModule | null {
  if (notifications !== undefined) return notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notifications = require('expo-notifications') as NotificationsModule;
    // If the reminder fires while the app is open, still show the banner.
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    notifications = null; // binary predates expo-notifications
  }
  return notifications;
}

export async function scheduleTrialEndingReminder(info: CustomerInfo): Promise<void> {
  if (Platform.OS === 'web') return;
  const N = getNotifications();
  if (!N) return;
  try {
    const ent = info.entitlements.active?.[ENTITLEMENT_ID];
    if (!ent || ent.periodType !== 'TRIAL' || !ent.expirationDate) return;

    const endsAt = new Date(ent.expirationDate).getTime();
    const fireAt = new Date(endsAt - WARN_BEFORE_MS);
    // Too little runway (short sandbox/QA trials): skip rather than ping instantly.
    if (fireAt.getTime() - Date.now() < 60_000) return;
    // Nudge awkward-hour fires into waking hours (a 2am purchase shouldn't
    // earn a 2am reminder on day 5).
    if (fireAt.getHours() < 9) fireAt.setHours(9, 0, 0, 0);
    else if (fireAt.getHours() >= 21) fireAt.setHours(21, 0, 0, 0);

    const perm = await N.requestPermissionsAsync();
    if (!perm.granted) {
      logEvent('trial_reminder_permission_denied');
      return;
    }
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    await cancelTrialEndingReminder(); // replace any earlier one (re-trial, plan switch)
    const endsOn = new Date(endsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const id = await N.scheduleNotificationAsync({
      content: {
        title: 'Your free week is almost up',
        body: `Your trial ends ${endsOn}. Keep going — or cancel before then and you won't be charged a thing.`,
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: 'reminders' },
    });
    await AsyncStorage.setItem(STORE_KEY, id);
    logEvent('trial_reminder_scheduled');
  } catch (e) {
    console.warn('[trialReminder] schedule failed', e);
  }
}

export async function cancelTrialEndingReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  const N = getNotifications();
  if (!N) return;
  try {
    const id = await AsyncStorage.getItem(STORE_KEY);
    if (!id) return;
    await AsyncStorage.removeItem(STORE_KEY);
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // Losing a cancel is harmless: the reminder either already fired or the
    // stored id no longer maps to a pending notification.
  }
}

// Drop the pending reminder the moment it stops being helpful: the trial was
// cancelled (no charge coming), the entitlement lapsed, or it converted (the
// fire date is in the past anyway — this is just cleanup of the stored id).
export async function syncTrialReminder(info: CustomerInfo): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const id = await AsyncStorage.getItem(STORE_KEY);
    if (!id) return;
    const ent = info.entitlements.active?.[ENTITLEMENT_ID];
    const stillWanted = !!ent && ent.periodType === 'TRIAL' && ent.willRenew;
    if (!stillWanted) {
      await cancelTrialEndingReminder();
      logEvent('trial_reminder_cancelled');
    }
  } catch {
    // Next CustomerInfo update retries.
  }
}
