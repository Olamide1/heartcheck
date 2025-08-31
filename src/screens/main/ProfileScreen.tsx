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
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { auth, db } from '../../services/supabase';
import { User } from '../../types';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminderTime, setDailyReminderTime] = useState('9:00 PM');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { user: currentUser } = await auth.getCurrentUser();
      if (!currentUser) return;

      // TODO: Load actual user profile from database
      // For now, using mock data
      const mockUser: User = {
        id: currentUser.id,
        email: currentUser.email || '',
        name: currentUser.user_metadata?.name || 'User',
        nickname: currentUser.user_metadata?.nickname || '',
        relationshipStartDate: '2023-01-15',
        timezone: 'America/New_York',
        createdAt: currentUser.created_at || new Date().toISOString(),
        updatedAt: currentUser.updated_at || new Date().toISOString(),
      };

      setUser(mockUser);

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
              await auth.signOut();
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
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
              'Confirm Deletion',
              'Are you absolutely sure? This will permanently delete your account and all data.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    console.log('Delete account');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSubscription = () => {
    navigation.navigate('Subscription');
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
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
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
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.warmGray20, true: Colors.primarySage }}
              thumbColor={Colors.white}
            />
          </View>
          
          {notificationsEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reminder Time</Text>
                <Text style={styles.settingDescription}>
                  When to send your daily reminder
                </Text>
              </View>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeButtonText}>{dailyReminderTime}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          
          <TouchableOpacity style={styles.subscriptionButton} onPress={handleSubscription}>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Current Plan</Text>
              <Text style={styles.subscriptionValue}>Free Trial</Text>
            </View>
            <Text style={styles.subscriptionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Partner Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner</Text>
          
          <TouchableOpacity style={styles.partnerButton}>
            <Text style={styles.partnerButtonText}>Manage Partner Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <TouchableOpacity style={styles.privacyButton}>
            <Text style={styles.privacyButtonText}>Export My Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.privacyButton}>
            <Text style={styles.privacyButtonText}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.privacyButton}>
            <Text style={styles.privacyButtonText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.accountButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.accountButton, styles.deleteButton]} 
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>HeartCheck v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 HeartCheck. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softCream,
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
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
  },
  errorText: {
    fontSize: Typography.fontSize.body,
    color: Colors.alertCoral,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  userName: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  section: {
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warmGray10,
  },
  infoLabel: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
  },
  infoValue: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warmGray10,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    lineHeight: Typography.lineHeight.small,
  },
  timeButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.small,
    borderWidth: 1,
    borderColor: Colors.primarySage,
  },
  timeButtonText: {
    color: Colors.primarySage,
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
  },
  subscriptionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    shadowColor: Colors.black,
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
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
    marginBottom: Spacing.xs,
  },
  subscriptionValue: {
    fontSize: Typography.fontSize.body,
    color: Colors.primarySage,
    fontWeight: Typography.fontWeight.medium,
  },
  subscriptionArrow: {
    fontSize: Typography.fontSize.h2,
    color: Colors.coolGrayText,
  },
  partnerButton: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primarySage,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  partnerButtonText: {
    color: Colors.primarySage,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  privacyButton: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  privacyButtonText: {
    color: Colors.warmGrayText,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  accountButton: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  signOutButtonText: {
    color: Colors.warmGrayText,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  deleteButton: {
    backgroundColor: Colors.alertCoral,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingVertical: Spacing.xl,
  },
  appVersion: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    marginBottom: Spacing.xs,
  },
  appCopyright: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    textAlign: 'center',
  },
});

export default ProfileScreen;
