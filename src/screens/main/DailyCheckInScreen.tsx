import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Layout } from '../../constants';

const DailyCheckInScreen = () => {
  const [moodRating, setMoodRating] = useState(0);
  const [connectionRating, setConnectionRating] = useState(0);
  const [reflection, setReflection] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingPress = (rating: number, type: 'mood' | 'connection') => {
    if (type === 'mood') {
      setMoodRating(rating);
    } else {
      setConnectionRating(rating);
    }
  };

  const handleSubmit = async () => {
    if (moodRating === 0 || connectionRating === 0 || !reflection.trim()) {
      Alert.alert('Missing Information', 'Please complete all fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement actual submission to Supabase
    setTimeout(() => {
      Alert.alert('Success!', 'Your daily check-in has been recorded.');
      setMoodRating(0);
      setConnectionRating(0);
      setReflection('');
      setIsShared(false);
      setIsSubmitting(false);
    }, 1000);
  };

  const renderRatingDots = (rating: number, onPress: (rating: number) => void) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.ratingDot,
              value <= rating && styles.ratingDotActive,
            ]}
            onPress={() => onPress(value)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.ratingNumber,
              value <= rating && styles.ratingNumberActive
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Daily Check-In</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        {/* Mood Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Rating</Text>
          <Text style={styles.sectionDescription}>
            Rate your overall mood from 1 (terrible) to 10 (amazing)
          </Text>
          {renderRatingDots(moodRating, (rating) => handleRatingPress(rating, 'mood'))}
          
          {moodRating > 0 && (
            <View style={styles.ratingValueContainer}>
              <Text style={styles.ratingValue}>{moodRating}/10</Text>
              <Text style={styles.ratingDescription}>
                {moodRating <= 3 ? 'Rough day' : 
                 moodRating <= 6 ? 'Okay' : 
                 moodRating <= 8 ? 'Good' : 'Excellent!'}
              </Text>
            </View>
          )}
        </View>

        {/* Connection Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Rating</Text>
          <Text style={styles.sectionDescription}>
            How connected do you feel with your partner today?
          </Text>
          {renderRatingDots(connectionRating, (rating) => handleRatingPress(rating, 'connection'))}
          
          {connectionRating > 0 && (
            <View style={styles.ratingValueContainer}>
              <Text style={styles.ratingValue}>{connectionRating}/10</Text>
              <Text style={styles.ratingDescription}>
                {connectionRating <= 3 ? 'Feeling distant' : 
                 connectionRating <= 6 ? 'Somewhat connected' : 
                 connectionRating <= 8 ? 'Very connected' : 'Deeply connected!'}
              </Text>
            </View>
          )}
        </View>

        {/* Reflection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reflection</Text>
          <Text style={styles.sectionDescription}>
            Share your thoughts, feelings, or anything you'd like to remember about today
          </Text>
          
          <View style={styles.reflectionInputContainer}>
            <TextInput
              style={styles.reflectionInput}
              value={reflection}
              onChangeText={setReflection}
              placeholder="Write your reflection here..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.characterCountContainer}>
            <Text style={styles.characterCount}>
              {reflection.length}/500 characters
            </Text>
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <View style={styles.privacyContainer}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyLabel}>Share with Partner</Text>
              <Text style={styles.privacyDescription}>
                Allow your partner to see this check-in
              </Text>
            </View>
            <Switch
              value={isShared}
              onValueChange={setIsShared}
              trackColor={{ false: Colors.divider, true: Colors.primarySage }}
              thumbColor={isShared ? Colors.textInverse : Colors.textSecondary}
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!moodRating || !connectionRating || !reflection.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!moodRating || !connectionRating || !reflection.trim() || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primarySage, Colors.primarySageDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit Check-In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.padding,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ratingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingDotActive: {
    borderColor: Colors.primarySage,
    backgroundColor: Colors.primarySage,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  ratingNumberActive: {
    color: Colors.textInverse,
  },
  ratingValueContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  ratingValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  ratingDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  reflectionInputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  reflectionInput: {
    height: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.body,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.body,
  },
  characterCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  privacyInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  privacyLabel: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  privacyDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed,
  },
  submitSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  submitButton: {
    height: 56,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
});

export default DailyCheckInScreen;
