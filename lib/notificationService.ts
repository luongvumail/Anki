// Daily Study Reminder Notification Service for Anki
// Uses lazy/safe initialization to prevent top-level crashes when ExpoPushTokenManager is absent.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const STORAGE_KEY = '@anki_daily_reminder_settings';
const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};

let notificationHandlerConfigured = false;

/**
 * Safely imports and retrieves the expo-notifications module at runtime
 */
function getNotificationsModule() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    if (Notifications && !notificationHandlerConfigured) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        notificationHandlerConfigured = true;
      } catch (err) {
        console.warn('[notificationService] Failed to set notification handler:', err);
      }
    }
    return Notifications;
  } catch (e) {
    console.warn('[notificationService] expo-notifications native module not available in current environment:', e);
    return null;
  }
}

/**
 * Requests notification permissions from iOS/Android safely
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[notificationService] Permission request failed:', e);
    return false;
  }
}

/**
 * Schedules a daily repeating study reminder notification at specified hour and minute
 */
export async function scheduleDailyStudyReminder(hour: number, minute: number): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  try {
    // Cancel previous notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily notification using Expo DAILY trigger
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Anki - Đến giờ ôn tập từ vựng!',
        body: 'Hôm nay bạn có từ vựng cần ôn tập. Hãy dành 5 phút luyện tập ngay để duy trì trí nhớ nhé!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await saveReminderSettings({ enabled: true, hour, minute });
    return true;
  } catch (e) {
    console.warn('[notificationService] Schedule notification failed:', e);
    return false;
  }
}

/**
 * Cancels all scheduled study reminders safely
 */
export async function cancelDailyStudyReminder(): Promise<void> {
  const Notifications = getNotificationsModule();
  try {
    if (Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    const current = await getReminderSettings();
    await saveReminderSettings({ ...current, enabled: false });
  } catch (e) {
    console.warn('[notificationService] Cancel notification failed:', e);
  }
}

/**
 * Retrieves saved reminder settings from AsyncStorage
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      return JSON.parse(json) as ReminderSettings;
    }
  } catch (e) {
    console.warn('[notificationService] Read settings failed:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves reminder settings to AsyncStorage
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[notificationService] Save settings failed:', e);
  }
}
