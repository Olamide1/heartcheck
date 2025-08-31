import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Task name for background fetch
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

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

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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

      // Register background task
      await this.registerBackgroundTask();

      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Register background task for checking notifications
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      // Check if task is already defined
      if (TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
        console.log('Background notification task already defined, skipping definition');
      } else {
        // Define what the task does FIRST (before registration)
        TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
          try {
            await this.checkAndSendNotifications();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (error) {
            console.error('Background notification task failed:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
        console.log('Background notification task defined');
      }

      // Check if task is already registered
      const isRegistered = await BackgroundFetch.getStatusAsync();
      if (isRegistered === BackgroundFetch.BackgroundFetchStatus.Available) {
        console.log('Background notification task already registered, skipping registration');
      } else {
        // Then register the task
        await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: 60 * 15, // 15 minutes minimum
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background notification task registered');
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
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
   * Schedule a daily reminder for a user
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

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any, // Type assertion for now to handle Expo types
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
   * Check and send notifications for all users
   * This runs in the background task
   */
  async checkAndSendNotifications(): Promise<void> {
    try {
      console.log('Checking for notifications to send...');

      // Get all users who want notifications
      const { data: users, error } = await supabase
        .from('users')
        .select('id, notifications_enabled, daily_reminder_time, timezone')
        .eq('notifications_enabled', true);

      if (error || !users) {
        console.error('Failed to fetch users for notifications:', error);
        return;
      }

      const now = new Date();
      
      for (const user of users) {
        try {
          // Check if it's time to send notification for this user
          if (await this.shouldSendNotification(user, now)) {
            await this.sendNotification(user);
          }
        } catch (error) {
          console.error(`Failed to process notification for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Background notification check failed:', error);
    }
  }

  /**
   * Check if we should send a notification to a user
   */
  private async shouldSendNotification(user: any, now: Date): Promise<boolean> {
    try {
      // Parse user's reminder time
      const [hours, minutes] = user.daily_reminder_time.split(':').map(Number);
      
      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: user.timezone }));
      
      // Check if it's within the reminder window (5 minutes)
      const reminderTime = new Date(userTime);
      reminderTime.setHours(hours, minutes, 0, 0);
      
      const timeDiff = Math.abs(userTime.getTime() - reminderTime.getTime());
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      return timeDiff <= fiveMinutes;
    } catch (error) {
      console.error('Error checking notification timing:', error);
      return false;
    }
  }

  /**
   * Send a notification to a user
   */
  private async sendNotification(user: any): Promise<void> {
    try {
      // Check if we've already sent a notification today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingNotifications } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'daily-reminder')
        .gte('created_at', today)
        .limit(1);

      if (existingNotifications && existingNotifications.length > 0) {
        console.log(`Notification already sent today for user ${user.id}`);
        return;
      }

      // Send the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Daily Check-in Reminder 💕",
          body: "Time to check in with your partner and share how you're feeling today!",
          data: { 
            type: 'daily-reminder',
            userId: user.id 
          },
        },
        trigger: null, // Send immediately
      });

      // Log the notification
      await this.logNotification(user.id, 'daily-reminder');
      
      console.log(`Sent daily reminder to user ${user.id}`);
    } catch (error) {
      console.error(`Failed to send notification to user ${user.id}:`, error);
    }
  }

  /**
   * Log notification in database
   */
  private async logNotification(userId: string, type: string): Promise<void> {
    try {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          type: type,
          sent_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Get all scheduled notifications for a user
   */
  async getScheduledNotifications(userId: string): Promise<string[]> {
    try {
      const { data: schedules } = await supabase
        .from('notification_schedules')
        .select('notification_id')
        .eq('user_id', userId);

      return schedules?.map(s => s.notification_id) || [];
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
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
   * Unregister background task (useful for cleanup)
   */
  async unregisterBackgroundTask(): Promise<void> {
    try {
      if (TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        console.log('Background notification task unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister background task:', error);
    }
  }

  /**
   * Check if background task is properly set up
   */
  async isBackgroundTaskReady(): Promise<boolean> {
    try {
      const isDefined = TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK);
      const status = await BackgroundFetch.getStatusAsync();
      return isDefined && status === BackgroundFetch.BackgroundFetchStatus.Available;
    } catch (error) {
      console.error('Error checking background task status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
