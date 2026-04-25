/**
 * notificationUtils.ts
 * Wraps expo-notifications for DiabEasy insulin reminders.
 * Each reminder is identified by `reminder-${reminder.id}` so it can be
 * individually cancelled/rescheduled when the user edits or deletes it.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminder, AppSettings } from '../store/glucoseStore';
import { getAnalogByType, getLongActingByType } from './insulinUtils';

const CHANNEL_ID = 'diabeasy-reminders';

// ─── Permissions & channel setup ─────────────────────────────────────────────

export async function registerForNotifications(): Promise<boolean> {
  // Android 8+ requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Insulin Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule / cancel ───────────────────────────────────────────────────────

export async function scheduleReminder(
  reminder: Reminder,
  settings: AppSettings,
): Promise<void> {
  const [hour, minute] = reminder.time.split(':').map(Number);
  const days = reminder.days ?? 'everyday';

  const brandName = reminder.type === 'Rapid-acting'
    ? getAnalogByType(settings.insulinAnalogType).sublabel
    : getLongActingByType(settings.longActingInsulinType).sublabel;

  let trigger: any;
  if (days === 'everyday') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
  } else {
    const [yr, mo, dy] = days.split('-').map(Number);
    const fireDate = new Date(yr, mo - 1, dy, hour, minute, 0, 0);
    if (fireDate <= new Date()) return; // past date — skip scheduling
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    };
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-${reminder.id}`,
    content: {
      title: `💉 ${reminder.label}`,
      body: `Take ${reminder.units}u · ${brandName}`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger,
  });
}

export async function cancelReminder(reminderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`reminder-${reminderId}`);
}

// ─── Bulk helpers ─────────────────────────────────────────────────────────────

/** Cancel every DiabEasy reminder notification (ignores non-reminder ones). */
export async function cancelAllReminderNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith('reminder-'))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Clear all scheduled reminder notifications then re-create them for every
 * active reminder. Called on app start and when notificationsEnabled changes.
 */
export async function rescheduleAllReminders(
  reminders: Reminder[],
  settings: AppSettings,
): Promise<void> {
  await cancelAllReminderNotifications();
  await Promise.all(
    reminders
      .filter(r => r.active)
      .map(r => scheduleReminder(r, settings)),
  );
}
