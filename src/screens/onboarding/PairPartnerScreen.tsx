import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Share from 'expo-sharing';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { supabase } from '../../services/supabase';

const PairPartnerScreen = ({ navigation }: any) => {
  const [isLoading, setIsLoading] = useState(false);

  // Generate a unique invite code (in real app, this would come from backend)
  const generateInviteCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).toUpperCase().substring(0, 8);
  };

  const handleGenerateInvite = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('Generating invite code...');
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User error:', userError);
        Alert.alert('Error', 'User not found. Please try again.');
        return;
      }
      
      console.log('Current user:', user.email, 'ID:', user.id);
      
      // Generate invite code
      const inviteCode = generateInviteCode();
      
      // Store invite code in database
      const { error: inviteError } = await supabase
        .from('invite_codes')
        .insert([{
          user_id: user.id,
          code: inviteCode,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }]);
      
      if (inviteError) {
        console.error('Failed to store invite code:', inviteError);
        Alert.alert('Error', 'Failed to generate invite. Please try again.');
        return;
      }
      
      console.log('Invite code generated successfully:', inviteCode);
      
      // Show success and copy to clipboard
      Alert.alert(
        'Invite Code Generated!',
        `Share this code with your partner: ${inviteCode}`,
        [
          { text: 'Copy Code', onPress: () => copyToClipboard(inviteCode) },
          { text: 'Share', onPress: () => shareInviteCode(inviteCode) },
          { text: 'OK' }
        ]
      );
      
    } catch (error) {
      console.error('Generate invite error:', error);
      Alert.alert('Error', 'Failed to generate invite. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', 'Invite code copied to clipboard.');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy invite code.');
    }
  };
  
  const shareInviteCode = async (text: string) => {
    try {
      // For now, just copy to clipboard instead of sharing
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', 'Invite code copied to clipboard. You can now share it manually.');
    } catch (error) {
      console.error('Error copying invite code:', error);
      Alert.alert('Error', 'Failed to copy invite code.');
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip Partner Pairing?',
      'You can always pair with your partner later from the settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            // Navigate to main app using the correct route name
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Invite Your Partner</Text>
          <Text style={styles.subtitle}>
            Generate an invite code to share with your partner
          </Text>
        </View>

        {/* Generate Invite Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔗</Text>
            <Text style={styles.sectionTitle}>Invite Your Partner</Text>
          </View>
          <Text style={{ color: 'black', fontSize: 16, marginBottom: 16 }}>
            Generate an invite code to share with your partner
          </Text>
          
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleGenerateInvite}
            disabled={isLoading}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                  <Text style={styles.loadingText}>Generating...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Generate Invite Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>



        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipForNow}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressIndicator}>
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        
        {/* Bottom Spacing */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.paddingHorizontal,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  simpleSubtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed,
  },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  primaryButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    ...Layout.shadow.md,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: Spacing.sm,
    color: Colors.textInverse,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Layout.shadow.sm,
  },
  codeInput: {
    height: 52,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.body,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    height: 64,
    borderRadius: Layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primarySage,
    ...Layout.shadow.sm,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: Colors.primarySage,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.divider,
  },
  progressDotActive: {
    backgroundColor: Colors.primarySage,
  },
});

export default PairPartnerScreen;
