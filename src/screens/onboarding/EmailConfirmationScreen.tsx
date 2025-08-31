import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Linking,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { auth, db } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { subscriptionService } from '../../services/subscriptions';
import { LinearGradient } from 'expo-linear-gradient';

interface EmailConfirmationScreenProps {
  route: {
    params: {
      email: string;
      userData: any;
      inviteCode?: string;
    };
  };
  navigation: any;
}

const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({
  route,
  navigation,
}) => {
  const { email, userData, inviteCode } = route.params;
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // Countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle deep links when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Only check for deep link if we're not already processing one
        if (!isProcessingDeepLink) {
          checkForDeepLink();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      setIsProcessingDeepLink(false);
    };
  }, [isProcessingDeepLink]);

  // Listen for deep links when app is already running
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      console.log('Deep link received while app running:', url);
      // Only process if we're not already processing one
      if (!isProcessingDeepLink) {
        handleDeepLink(url);
      }
    };
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => {
      subscription?.remove();
      setIsProcessingDeepLink(false);
    };
  }, [isProcessingDeepLink]);

  // Clean up any existing deep link processing when component unmounts
  useEffect(() => {
    return () => {
      setIsProcessingDeepLink(false);
    };
  }, []);

  // Check for deep links
  const checkForDeepLink = async () => {
    try {
      // Get the initial URL if the app was opened via deep link
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('Initial deep link detected:', url);
        handleDeepLink(url);
      }
    } catch (error) {
      console.log('Error checking initial URL:', error);
    }
  };

  // Handle deep link URLs
  const handleDeepLink = async (url: string) => {
    console.log('Processing deep link:', url);
    
    // Prevent multiple processing of the same deep link
    if (isProcessingDeepLink) {
      console.log('Already processing deep link, skipping...');
      return;
    }
    
    if (url.includes('confirmation_token') || url.includes('email_confirmed') || url.includes('type=signup')) {
      console.log('Email confirmation deep link detected!');
      setIsProcessingDeepLink(true);
      
      try {
        // Instead of trying to manually set sessions, let's use the manual confirmation flow
        console.log('Deep link detected, proceeding with manual confirmation...');
        
        // Check if we're already on the email confirmation screen
        if (navigation.isFocused()) {
          await completeProfileCreation();
        } else {
          console.log('Screen not focused, skipping deep link processing');
        }
      } catch (error) {
        console.error('Error processing deep link:', error);
        Alert.alert('Error', 'Failed to process email confirmation. Please try again.');
      } finally {
        setIsProcessingDeepLink(false);
      }
    }
  };

  // Complete profile creation
  const completeProfileCreation = async () => {
    console.log('Completing profile creation...');
    
    try {
      // First, check if user already has a profile
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.id)
        .single();
      
      if (existingProfile) {
        console.log('User profile already exists, skipping creation');
      } else {
        console.log('Creating user profile with data:', userData);
        
        // Create the user profile
        const { error: profileError } = await db.createUser(userData);
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          Alert.alert('Profile Creation Error', profileError.message || 'Failed to create profile');
          return;
        }
        
        console.log('Profile created successfully');
        
        // Start free trial for new user
        try {
          await subscriptionService.startFreeTrial(userData.id);
          console.log('Free trial started successfully');
        } catch (error) {
          console.error('Failed to start free trial:', error);
          // Don't block the flow if free trial fails
        }
      }
      
      // Now sign in the user to establish a proper session
      console.log('Signing in user to establish session...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });
      
      if (signInError) {
        console.error('Sign in failed:', signInError);
        Alert.alert('Error', 'Failed to sign in. Please try again.');
        return;
      }
      
      console.log('User signed in successfully:', signInData.user?.email);
      
      // Update user metadata to mark onboarding as complete
      const { error: updateError } = await supabase.auth.updateUser({
        data: { hasProfile: true }
      });
      
      if (updateError) {
        console.log('Error updating user metadata:', updateError);
      } else {
        console.log('User metadata updated successfully');
      }
      
      // Handle invite code and create couple relationship if provided
      if (inviteCode) {
        try {
          console.log('Processing invite code for couple creation:', inviteCode);
          
          // Get the invite code details
          const { data: inviteData, error: inviteError } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', inviteCode)
            .single();
          
          if (inviteError || !inviteData) {
            console.error('Failed to get invite code:', inviteError);
          } else {
            console.log('Invite code found, creating couple relationship...');
            
            // Create the couple relationship
            const { error: coupleError } = await supabase
              .from('couples')
              .insert([{
                partner1_id: inviteData.user_id,
                partner2_id: userData.id,
                created_at: new Date().toISOString()
              }]);
            
            if (coupleError) {
              console.error('Failed to create couple:', coupleError);
            } else {
              console.log('Successfully paired with partner!');
              
              // Mark the invite code as used
              const { error: updateError } = await supabase
                .from('invite_codes')
                .update({ is_used: true })
                .eq('code', inviteCode);
              
              if (updateError) {
                console.log('Failed to mark invite code as used:', updateError);
              } else {
                console.log('Invite code marked as used');
              }
            }
          }
        } catch (error) {
          console.error('Error handling invite code:', error);
        }
      }
      
      // Wait a moment for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Don't manually navigate - let the AppNavigator handle it automatically
      // The auth state change will trigger the navigation to the appropriate screen
      console.log('Profile creation complete. AppNavigator will handle navigation automatically.');
      
    } catch (error) {
      console.error('Error in completeProfileCreation:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:');
  };

  const handleResendEmail = async () => {
    try {
      const { error } = await auth.resendConfirmation(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Confirmation email sent!');
        setCountdown(60);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend confirmation email');
    }
  };

  const handleManualConfirmation = async () => {
    setIsConfirming(true);
    try {
      console.log('Manually confirming email...');
      
      if (!userData?.id) {
        Alert.alert('Error', 'User data is missing. Please go back to signup and try again.');
        return;
      }
      
      // First, try to sign in with the user's credentials to establish a session
      try {
        console.log('Attempting to sign in to establish session...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password || 'temp_password', // We need to store password during signup
        });
        
        if (signInError) {
          console.log('Sign in failed:', signInError);
          // Continue anyway, maybe the session is already established
        } else {
          console.log('Sign in successful:', signInData.user?.email);
        }
      } catch (signInError) {
        console.log('Sign in error:', signInError);
      }
      
      // Wait a moment for any session operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now try to complete profile creation
      await completeProfileCreation();
      
    } catch (error) {
      console.error('Manual confirmation error:', error);
      Alert.alert('Error', 'Failed to confirm email. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };



  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.description}>
          We've sent a confirmation link to:
        </Text>
        
        <Text style={styles.email}>{email}</Text>
        
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Follow these steps:</Text>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Open your email app</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Click the confirmation link</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>The app will automatically complete your setup</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {/* Primary Confirmation Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isConfirming && styles.primaryButtonDisabled]}
            onPress={handleManualConfirmation}
            disabled={isConfirming}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isConfirming ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>I've Confirmed My Email</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleOpenEmail}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Open Email App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, countdown > 0 && styles.secondaryButtonDisabled]}
            onPress={handleResendEmail}
            disabled={countdown > 0}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {countdown > 0 
                ? `Resend in ${countdown}s` 
                : 'Resend Confirmation Email'
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← Go Back to Signup</Text>
          </TouchableOpacity>


        </View>

        <View style={styles.help}>
          <Text style={styles.helpText}>
            After clicking the confirmation link, the app will automatically complete your setup.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Layout.padding,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    fontSize: Typography.fontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primarySage,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepsContainer: {
    marginBottom: Spacing.xl,
  },
  stepsTitle: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySage,
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: Spacing.md,
  },
  stepText: {
    fontSize: Typography.fontSize.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: 'white',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  help: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed,
  },
});

export default EmailConfirmationScreen;
