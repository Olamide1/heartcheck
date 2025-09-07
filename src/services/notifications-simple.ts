import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  reminderTime: string; // Format: "HH:MM"
  timezone: string;
}

export class SimpleNotificationService {
  private static instance: SimpleNotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SimpleNotificationService {
    if (!SimpleNotificationService.instance) {
      SimpleNotificationService.instance = new SimpleNotificationService();
    }
    return SimpleNotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      this.isInitialized = true;
      console.log('Simple notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Configure Android notification channels
   */
  private async configureAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Check-in Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  }

  /**
   * Schedule a daily reminder for a user (simplified approach)
   */
  async scheduleDailyReminder(preferences: NotificationPreferences): Promise<void> {
    if (!preferences.enabled) {
      await this.cancelDailyReminder(preferences.userId);
      return;
    }

    try {
      // Cancel existing reminder first
      await this.cancelDailyReminder(preferences.userId);

      // Parse the reminder time
      const [hours, minutes] = preferences.reminderTime.split(':').map(Number);
      
      // Create notification content
      const notificationContent = {
        title: "Daily Check-in Reminder 💕",
        body: "Time to check in with your partner and share how you're feeling today!",
        data: { 
          type: 'daily-reminder',
          userId: preferences.userId 
        },
      };

      // Schedule the notification for the next occurrence
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If the time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any,
      });

      console.log(`Scheduled daily reminder for user ${preferences.userId} at ${preferences.reminderTime}`);
      
      // Store the notification ID in database for tracking
      await this.storeNotificationSchedule(preferences.userId, identifier, preferences);
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel daily reminder for a user
   */
  async cancelDailyReminder(userId: string): Promise<void> {
    try {
      // Get stored notification IDs for this user
      const { data: schedules } = await supabase
        .from('notification_schedules')
        .select('notification_id')
        .eq('user_id', userId)
        .eq('type', 'daily-reminder');

      if (schedules) {
        // Cancel each scheduled notification
        for (const schedule of schedules) {
          await Notifications.cancelScheduledNotificationAsync(schedule.notification_id);
        }

        // Remove from database
        await supabase
          .from('notification_schedules')
          .delete()
          .eq('user_id', userId)
          .eq('type', 'daily-reminder');
      }

      console.log(`Cancelled daily reminder for user ${userId}`);
    } catch (error) {
      console.error('Failed to cancel daily reminder:', error);
    }
  }

  /**
   * Store notification schedule in database
   */
  private async storeNotificationSchedule(
    userId: string, 
    notificationId: string, 
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await supabase
        .from('notification_schedules')
        .upsert({
          user_id: userId,
          notification_id: notificationId,
          type: 'daily-reminder',
          reminder_time: preferences.reminderTime,
          timezone: preferences.timezone,
          enabled: preferences.enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to store notification schedule:', error);
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      // Update user preferences in database
      await supabase
        .from('users')
        .update({
          notifications_enabled: preferences.enabled,
          daily_reminder_time: preferences.reminderTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', preferences.userId);

      // Schedule or cancel reminder based on preferences
      await this.scheduleDailyReminder(preferences);
      
      console.log(`Updated notification preferences for user ${preferences.userId}`);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }


  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }
}

// Export singleton instance
export const simpleNotificationService = SimpleNotificationService.getInstance();
