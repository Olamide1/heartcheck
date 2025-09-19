import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { auth, supabase } from '../../services/supabase';

const { height } = Dimensions.get('window');

const AccountSetupScreen = ({ navigation, route }: any) => {
  const inviteCode = route?.params?.inviteCode;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await auth.signUp(email, password);
      
      if (authError) {
        Alert.alert('Signup Error', authError.message);
        return;
      }

      if (authData?.user) {
        // If there's an invite code, create the couple relationship

        
        // Navigate to email confirmation screen
        navigation.navigate('EmailConfirmation', {
          email,
          userData: {
            id: authData.user.id,
            email,
            name,
            relationshipStartDate: relationshipStartDate.toISOString().split('T')[0],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Auto-detect timezone
            password,
          },
          inviteCode,
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRelationshipStartDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Let's get started with your relationship journey
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
              </View>
              <Text style={styles.helperText}>Must be at least 6 characters</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relationship Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonText}>{formatDate(relationshipStartDate)}</Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
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
                  <Text style={styles.continueButtonText}>Creating Account...</Text>
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // If we can go back, do that. Otherwise, this is the first screen in onboarding
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If this is the first screen in onboarding, sign out to go back to Welcome
                  auth.signOut();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← Back to Welcome</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={relationshipStartDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.paddingHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: 0,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },




  formSection: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Layout.shadow.sm,
  },
  textInput: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.body,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    marginLeft: Spacing.sm,
    fontStyle: 'italic',
  },
  dateButton: {
    backgroundColor: Colors.surface,
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    ...Layout.shadow.sm,
  },
  dateButtonText: {
    fontSize: Typography.fontSize.body,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  dateButtonIcon: {
    fontSize: 20,
  },
  ctaSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  continueButton: {
    width: '100%',
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Layout.shadow.md,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
});

export default AccountSetupScreen;
