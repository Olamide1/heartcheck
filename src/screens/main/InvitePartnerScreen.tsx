import React, { useState, useEffect } from 'react';
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
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { supabase } from '../../services/supabase';

  const InvitePartnerScreen = ({ navigation }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Load existing invite code when component mounts
  useEffect(() => {
    loadExistingInviteCode();
  }, []);

  // Generate a unique invite code
  const generateInviteCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).toUpperCase().substring(0, 8);
  };

  // Clean up expired invite codes
  const cleanupExpiredCodes = async () => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.log('Error cleaning up expired codes:', error);
      } else {
        console.log('Expired invite codes cleaned up');
      }
    } catch (error) {
      console.log('Error in cleanup:', error);
    }
  };

  // Load existing active invite code when component mounts
  const loadExistingInviteCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's active, non-expired invite code
      const { data: existingCode, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && existingCode) {
        console.log('Found existing active invite code:', existingCode.code);
        setGeneratedCode(existingCode.code);
      }
    } catch (error) {
      console.log('Error loading existing invite code:', error);
    }
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
      console.log('Attempting to store invite code in database...');
      console.log('User ID:', user.id);
      console.log('Code:', inviteCode);
      console.log('Expires at:', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: insertData, error: inviteError } = await supabase
        .from('invite_codes')
        .insert([{
          user_id: user.id,
          code: inviteCode,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select();
      
      console.log('Insert response - data:', insertData);
      console.log('Insert response - error:', inviteError);
      
      if (inviteError) {
        console.error('Failed to store invite code:', inviteError);
        Alert.alert('Error', 'Failed to generate invite. Please try again.');
        return;
      }
      
      console.log('Invite code stored successfully in database');
      console.log('Invite code generated successfully:', inviteCode);
      
      // Clean up expired codes
      await cleanupExpiredCodes();
      
      // Set the generated code to display on screen
      setGeneratedCode(inviteCode);
      
      // Show success and copy to clipboard
      Alert.alert(
        'Invite Code Generated!',
        `Your invite code: ${inviteCode}\n\nThis code will expire in 7 days.`,
        [
          { text: 'Copy Code', onPress: () => copyToClipboard(inviteCode) },
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

  const handleBackToDashboard = () => {
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
          <Text style={styles.title}>Invite Your Partner</Text>
          <Text style={{ color: 'black', fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 }}>
            Generate an invite code to share with your partner
          </Text>
        </View>

        {/* Generate Invite Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔗</Text>
            <Text style={styles.sectionTitle}>Generate Invite Code</Text>
          </View>
          <Text style={{ color: 'black', fontSize: 16, marginBottom: 24 }}>
            Create a unique code that your partner can use to join your HeartCheck space
          </Text>
          
          {generatedCode && (
            <View style={{ backgroundColor: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#0ea5e9' }}>
              <Text style={{ color: '#0c4a6e', fontSize: 14, marginBottom: 8, fontWeight: '600' }}>Generated Invite Code:</Text>
              <Text style={{ color: '#0c4a6e', fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center' }}>{generatedCode}</Text>
              <Text style={{ color: '#0c4a6e', fontSize: 12, marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>
                Expires in 7 days • Share this code with your partner
              </Text>
              <Text style={{ color: '#0c4a6e', fontSize: 11, marginTop: 4, textAlign: 'center', opacity: 0.7 }}>
                Generated just now
              </Text>
            </View>
          )}
          
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
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Generating...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Generate Invite Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Instructions Section */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How it works:</Text>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={{ color: 'white', fontSize: Typography.fontSize.small, fontWeight: Typography.fontWeight.bold }}>1</Text>
            </View>
            <Text style={styles.instructionText}>Generate your unique invite code</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={{ color: 'white', fontSize: Typography.fontSize.small, fontWeight: Typography.fontWeight.bold }}>2</Text>
            </View>
            <Text style={styles.instructionText}>Share the code with your partner</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={{ color: 'white', fontSize: Typography.fontSize.small, fontWeight: Typography.fontWeight.bold }}>3</Text>
            </View>
            <Text style={styles.instructionText}>They'll use it to join your space</Text>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToDashboard}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    color: 'black',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.tight,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
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
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  instructionsSection: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionText: {
    fontSize: 16,
    color: 'black',
    flex: 1,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default InvitePartnerScreen;
