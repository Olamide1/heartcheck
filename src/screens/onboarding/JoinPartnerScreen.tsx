import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { supabase } from '../../services/supabase';

const JoinPartnerScreen = ({ navigation }: any) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinPartner = async () => {
    if (!inviteCode.trim() || isJoining) return;
    
    setIsJoining(true);
    
    try {
      console.log('Verifying invite code:', inviteCode);
      
      // Verify the invite code exists and is valid
      console.log('Looking for invite code:', inviteCode.trim());
      console.log('Current time:', new Date().toISOString());
      
      const { data: inviteData, error: inviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', inviteCode.trim())
        .gt('expires_at', new Date().toISOString())
        .single();
      
      console.log('Supabase response - data:', inviteData);
      console.log('Supabase response - error:', inviteError);
      
      if (inviteError || !inviteData) {
        console.log('Validation failed - inviteError:', inviteError);
        console.log('Validation failed - inviteData:', inviteData);
        Alert.alert('Invalid Code', 'The invite code is invalid or has expired.');
        return;
      }
      
      console.log('Invite code verified successfully');
      
      // Navigate to account creation with the invite code
      navigation.navigate('AccountSetup', { inviteCode: inviteCode.trim() });
      
    } catch (error) {
      console.error('Verify invite code error:', error);
      Alert.alert('Error', 'Failed to verify invite code. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleBackToWelcome = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Join Your Partner</Text>
          <Text style={{ color: 'black', fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 }}>
            Enter the invite code from your partner to join their HeartCheck space
          </Text>
        </View>

        {/* Join Partner Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🤝</Text>
            <Text style={styles.sectionTitle}>Enter Invite Code</Text>
          </View>
          <Text style={{ color: 'black', fontSize: 16, marginBottom: 16 }}>
            Ask your partner for the invite code they generated
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Enter invite code"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.primaryButton, isJoining && styles.primaryButtonDisabled]}
            onPress={handleJoinPartner}
            disabled={isJoining}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isJoining ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                  <Text style={styles.loadingText}>Joining...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Join Partner</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToWelcome}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>← Back to Welcome</Text>
        </TouchableOpacity>
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
    paddingVertical: Layout.paddingVertical,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
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
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
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
  primaryButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
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
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
});

export default JoinPartnerScreen;
