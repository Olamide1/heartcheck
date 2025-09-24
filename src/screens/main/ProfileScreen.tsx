import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../services/supabase';
import { simpleNotificationService } from '../../services/notifications-simple';
import { deleteAccountService } from '../../services/deleteAccount';
import { subscriptionService } from '../../services/subscriptions';
import { User } from '../../types';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminderTime, setDailyReminderTime] = useState('21:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState('21:00'); // Temporary time for picker
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Free Plan');

  useEffect(() => {
    loadUserProfile();
    initializeNotifications();
    loadSubscriptionStatus();
  }, []);

  const initializeNotifications = async () => {
    try {
      await simpleNotificationService.initialize();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const summary = await subscriptionService.getSubscriptionSummary(currentUser.id);
      
      if (summary.hasSubscription) {
        if (summary.isTrial) {
          setSubscriptionStatus(`Trial (${summary.trialDaysRemaining} days left)`);
        } else {
          setSubscriptionStatus(`${summary.plan?.charAt(0).toUpperCase()}${summary.plan?.slice(1)} Plan`);
        }
      } else {
        setSubscriptionStatus('Free Plan');
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
      setSubscriptionStatus('Free Plan');
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Get current authenticated user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        console.error('Error getting current user:', userError);
        return;
      }

      // Load user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error loading user profile:', profileError);
        
        // Check if it's a "no rows" error (user profile doesn't exist yet)
        if (profileError.message === 'No rows returned') {
          console.log('User profile not found, creating fallback user data');
          // User exists in auth but not in users table - this can happen during onboarding
          const fallbackUser: User = {
            id: currentUser.id,
            email: currentUser.email || '',
            name: currentUser.user_metadata?.name || 'User',
            nickname: '',
            relationshipStartDate: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notificationsEnabled: true,
            dailyReminderTime: '21:00',
            createdAt: currentUser.created_at || new Date().toISOString(),
            updatedAt: currentUser.updated_at || new Date().toISOString(),
          };
          setUser(fallbackUser);
          // Update local state with fallback preferences
          setNotificationsEnabled(fallbackUser.notificationsEnabled);
          setDailyReminderTime(fallbackUser.dailyReminderTime);
        } else {
          // Other database error
          console.error('Database error loading profile:', profileError);
          Alert.alert('Error', 'Unable to load profile. Please try again.');
        }
      } else {
        // Successfully loaded user profile
        console.log('User profile loaded successfully:', userProfile);
        
        // Map database fields to TypeScript interface
        const mappedUser: User = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          nickname: userProfile.nickname || '',
          relationshipStartDate: userProfile.relationship_start_date,
          timezone: userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          notificationsEnabled: userProfile.notifications_enabled ?? true,
          dailyReminderTime: userProfile.daily_reminder_time || '21:00',
          createdAt: userProfile.created_at,
          updatedAt: userProfile.updated_at,
        };
        setUser(mappedUser);
        // Update local state with user preferences
        setNotificationsEnabled(mappedUser.notificationsEnabled);
        setDailyReminderTime(mappedUser.dailyReminderTime);
      }

    } catch (error) {
      console.error('Load user profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              // Navigation will be handled by the auth state change listener
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to delete your account');
      return;
    }

    // First check if account can be deleted
    try {
      const { canDelete, reason } = await deleteAccountService.canDeleteAccount(user.id);
      
      if (!canDelete) {
        Alert.alert(
          'Cannot Delete Account',
          reason || 'Unable to delete account at this time.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking account deletion status:', error);
      Alert.alert('Error', 'Unable to verify account status. Please try again.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted, including:\n\n• Your profile and settings\n• All check-ins and reports\n• Subscription will be cancelled\n• You will be signed out',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete Forever',
                  style: 'destructive',
                  onPress: () => performAccountDeletion(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const result = await deleteAccountService.deleteAccount(user.id);
      
      if (result.success) {
        Alert.alert(
          'Account Deleted',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Deletion Completed with Issues',
          result.message + (result.errors ? '\n\nErrors:\n' + result.errors.join('\n') : ''),
          [
            {
              text: 'OK',
              onPress: () => {
                // Still sign out even if there were errors
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error during account deletion:', error);
      Alert.alert(
        'Deletion Failed',
        'An unexpected error occurred. Please contact support if the issue persists.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscription = () => {
    navigation.navigate('Subscription');
  };


  // Refresh subscription status when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSubscriptionStatus();
    });

    return unsubscribe;
  }, [navigation]);



  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user) return;
    
    try {
      setNotificationsEnabled(enabled);
      
      // Update notification service
      await simpleNotificationService.updatePreferences({
        userId: user.id,
        enabled: enabled,
        reminderTime: dailyReminderTime,
        timezone: user.timezone,
      });
      
      console.log(`Notifications ${enabled ? 'enabled' : 'disabled'} for user ${user.id}`);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      // Revert the toggle if it failed
      setNotificationsEnabled(!enabled);
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.');
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5); // Format as HH:MM
      setTempTime(timeString); // Only update temp time, don't save yet
    }
  };

  const formatTimeForDisplay = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? hour : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return '9:00 PM'; // Fallback
    }
  };

  const handleTimePickerDone = async () => {
    if (!user) return;
    
    setShowTimePicker(false);
    if (tempTime !== dailyReminderTime) {
      try {
        setDailyReminderTime(tempTime);
        
        // Update notification service with new time
        await simpleNotificationService.updatePreferences({
          userId: user.id,
          enabled: notificationsEnabled,
          reminderTime: tempTime,
          timezone: user.timezone,
        });
        
        console.log(`Updated reminder time to ${tempTime} for user ${user.id}`);
      } catch (error) {
        console.error('Failed to update reminder time:', error);
        // Revert the time if it failed
        setDailyReminderTime(dailyReminderTime);
        Alert.alert('Error', 'Failed to update reminder time. Please try again.');
      }
    }
  };

  const handleTimePickerCancel = () => {
    setShowTimePicker(false);
    setTempTime(dailyReminderTime); // Reset temp time to current saved time
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nickname</Text>
            <Text style={styles.infoValue}>{user.nickname || 'Not set'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Relationship Start</Text>
            <Text style={styles.infoValue}>
              {user.relationshipStartDate ? 
                new Date(user.relationshipStartDate).toLocaleDateString() : 
                'Not set'
              }
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Zone</Text>
            <Text style={styles.infoValue}>{user.timezone}</Text>
          </View>
          
          {/* Member Since - Hidden for now as requested */}
          {/* <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View> */}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Check-in Reminder</Text>
              <Text style={styles.settingDescription}>
                Get reminded to complete your daily check-in
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <Text style={styles.settingDescription}>
                When to send daily check-in reminders
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => {
                setTempTime(dailyReminderTime); // Set temp time to current time
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.timeButtonText}>{formatTimeForDisplay(dailyReminderTime)}</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.subscriptionButton} onPress={handleSubscription}>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Subscription</Text>
              <Text style={styles.subscriptionValue}>{subscriptionStatus}</Text>
            </View>
            <Text style={styles.subscriptionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Legal')}
          >
            <Text style={styles.actionButtonText}>Legal & Sources</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dangerButton, isLoading && styles.disabledButton]} 
            onPress={handleDeleteAccount}
            disabled={isLoading}
          >
            <Text style={styles.dangerButtonText}>
              {isLoading ? 'Deleting Account...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity onPress={handleTimePickerCancel}>
                  <Text style={styles.timePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>Set Reminder Time</Text>
                <TouchableOpacity onPress={handleTimePickerDone}>
                  <Text style={styles.timePickerButton}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={(() => {
                  try {
                    const [hours, minutes] = tempTime.split(':');
                    const date = new Date();
                    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    return date;
                  } catch (error) {
                    return new Date();
                  }
                })()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimeChange}
              />
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={(() => {
              try {
                const [hours, minutes] = tempTime.split(':');
                const date = new Date();
                date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                return date;
              } catch (error) {
                return new Date();
              }
            })()}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, selectedTime) => {
              if (event.type === 'set' && selectedTime) {
                handleTimePickerDone();
              } else if (event.type === 'dismissed') {
                handleTimePickerCancel();
              }
            }}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  timeButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  timeButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  subscriptionValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  subscriptionArrow: {
    fontSize: 24,
    color: '#6B7280',
  },
  actionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  timePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  timePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timePickerButton: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default ProfileScreen;
