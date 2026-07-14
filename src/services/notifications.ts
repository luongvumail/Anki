import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

const NOTIFICATION_SETTINGS_KEY = '@anki_notification_settings';

interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  hour: 20,
  minute: 0,
};

export const notificationService = {
  /**
   * Request permissions from the user. Returns true if granted.
   */
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return false;
      }
      
      // On Android, set notification channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Nhắc nhở học tập',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF2D55',
        });
      }
      
      return true;
    } catch (e) {
      console.error('Failed to request notification permission:', e);
      return false;
    }
  },

  /**
   * Load notification settings from AsyncStorage.
   */
  getSettings: async (): Promise<NotificationSettings> => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved) as NotificationSettings;
      }
    } catch (e) {
      console.error('Failed to read notification settings:', e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Save notification settings and schedule/cancel notifications accordingly.
   */
  saveSettings: async (settings: Partial<NotificationSettings>): Promise<void> => {
    try {
      const current = await notificationService.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      
      if (updated.enabled) {
        await notificationService.scheduleDailyNotification(updated.hour, updated.minute);
      } else {
        await notificationService.cancelAllNotifications();
      }
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  },

  /**
   * Schedules a daily recurring notification at the specified hour & minute.
   */
  scheduleDailyNotification: async (hour: number, minute: number): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      // First, clear existing scheduled notifications to avoid duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      const permissionGranted = await notificationService.requestPermissions();
      if (!permissionGranted) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Đã đến giờ học tiếng Trung!',
          body: 'Hãy dành ra 5 phút ôn tập hôm nay để duy trì chuỗi Streak của bạn nhé.',
          sound: true,
          color: '#FF2D55',
          data: { url: '/flashcard' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      console.log(`Notification scheduled daily at ${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (e) {
      console.error('Failed to schedule daily notification:', e);
    }
  },

  /**
   * Cancel all pending/scheduled notifications.
   */
  cancelAllNotifications: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled.');
    } catch (e) {
      console.error('Failed to cancel notifications:', e);
    }
  },
};
